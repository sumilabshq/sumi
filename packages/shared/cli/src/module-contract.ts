import fs from "node:fs";
import path from "node:path";
import type { Expression } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { importLinesOf, importsIn, withoutRepeats } from "./contract-imports.js";
import { REQUEST_ROOTS, needsOfRequest, relativeOf } from "./contract-needs.js";
import type { ListedRequest, SourceFile } from "./contract-needs.js";
import { copiedSchemasOf } from "./contract-schemas.js";
import { refuseKeyFunction } from "./contract-key.js";
import { usesOf } from "./free-names.js";
import type { NameUse } from "./free-names.js";
import { chainOf, exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import type { ChainStep } from "@widgetarium/eslint-plugin/babel-chain";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";

export const CONTRACT_ENTRY = "generated/contract.ts";

interface ListingModule {
	readonly file: SourceFile;
	readonly tag: string;
}

const LISTING_METHODS: ReadonlySet<string> = new Set(["queries", "commands"]);
const CONTRACT_STEPS: ReadonlySet<string> = new Set([
	"input",
	"output",
	"idempotencyKey",
	"cache",
	"settlesNow",
	"invalidates",
]);
const NOTHING_BOUND: ReadonlySet<string> = new Set();
const MODULE_FILE = "module.ts";
const NOT_LISTED_BY_NAME = "{module}: .queries() and .commands() take request constants by name, never an expression";
const LISTED_TWICE = "{module}: {name} is listed twice; a module lists each request once";
const NOT_IMPORTED = "{module}: {name} is listed but not imported by name from a file of this module";
const UNREADABLE = "{file} cannot be read: {reason}";
const NOT_EXPORTED = "{file} exports no const {name}, which {module} lists";
const NOT_A_REQUEST = "{file}: {name} starts with {root}(...); a listed request starts with query(...) or command(...)";
const NO_POSITION = "{file}: the chain of {name} carries no source position, so its contract cannot be cut from it";
const NO_MODULE_NAME = "{module}: module(...) takes its name as a string literal";
const CYCLE = "the contracts of {names} name each other in a cycle";

export function contractTextOf(folder: string, moduleName: string): string {
	const moduleFile = sourceOf(folder, MODULE_FILE);
	const init = exportedConstsOf(moduleFile.body).find(({ name }) => name === moduleName)?.init;
	const listing = { file: moduleFile, tag: moduleTagOf(init, moduleName) };
	const names = listedNamesOf(init, moduleName);
	const listed = names.map((name) => listedRequestOf(folder, listing, name));
	const held = refuseListedTwice(listed, moduleName);
	const needs = listed.flatMap((request) =>
		needsOfRequest({
			folder,
			request,
			imports: importsIn(request.file.body),
			listed: held,
		}),
	);
	const copied = copiedSchemasOf(
		folder,
		needs.flatMap((need) => (need.kind === "schema" ? [need.root] : [])),
	);
	const imports = [...needs.flatMap((need) => (need.kind === "import" ? [need.imported] : [])), ...copied.imports];
	return [
		importLinesOf(withoutRepeats(imports)),
		"\n",
		copied.text === "" ? "" : `${copied.text}\n`,
		...orderByUse(listed).map(({ name, chain }) => `export const ${name} = ${chain};\n`),
	].join("");
}

function moduleTagOf(init: Expression | undefined, moduleName: string): string {
	const named = init === undefined ? undefined : rootCallOf(init)?.call.arguments[0];

	if (named?.type !== "StringLiteral") {
		throw new CliRefusal(fillTemplate(NO_MODULE_NAME, { module: moduleName }));
	}

	return named.value;
}

function listedNamesOf(init: Expression | undefined, moduleName: string): string[] {
	return init === undefined ? [] : chainOf(init).flatMap((step) => namesListedBy(step, moduleName));
}

function namesListedBy({ method, call }: ChainStep, moduleName: string): string[] {
	if (!LISTING_METHODS.has(method)) {
		return [];
	}

	return call.arguments.map((argument) => {
		if (argument.type !== "Identifier") {
			throw new CliRefusal(fillTemplate(NOT_LISTED_BY_NAME, { module: moduleName }));
		}

		return argument.name;
	});
}

function refuseListedTwice(listed: readonly ListedRequest[], moduleName: string): ReadonlySet<string> {
	const names = new Set<string>();

	for (const { name } of listed) {
		if (names.has(name)) {
			throw new CliRefusal(fillTemplate(LISTED_TWICE, { module: moduleName, name }));
		}

		names.add(name);
	}

	return names;
}

function listedRequestOf(folder: string, { file: moduleFile, tag }: ListingModule, name: string): ListedRequest {
	const from = importsIn(moduleFile.body).find(({ local }) => local === name);

	if (from === undefined || from.form !== "named" || !from.specifier.startsWith(".")) {
		throw new CliRefusal(fillTemplate(NOT_IMPORTED, { module: MODULE_FILE, name }));
	}

	const file = sourceOf(folder, requestFileOf(folder, moduleFile.relative, from.specifier));
	const init = exportedConstsOf(file.body).find((declared) => declared.name === from.imported)?.init;

	if (init === undefined) {
		throw new CliRefusal(fillTemplate(NOT_EXPORTED, { file: file.relative, name: from.imported, module: MODULE_FILE }));
	}

	return contractOfChain(file, from.imported, init, tag);
}

function contractOfChain(file: SourceFile, name: string, init: Expression, tag: string): ListedRequest {
	const chain = chainOf(init);
	const root = requestRootOf(file, name, chain);
	const kept = contractStepsOf(chain);
	kept.forEach((step) => refuseKeyFunction(step, { file: file.relative, name }));
	return {
		name,
		file,
		chain: withFullName(chainTextOf(file, name, [root, kept.at(-1) ?? root]), root, tag),
		uses: kept.flatMap(usesInStep),
	};
}

function withFullName(chain: string, root: ChainStep, tag: string): string {
	const [named] = root.call.arguments;
	const { start } = root.call;

	if (named?.type !== "StringLiteral" || named.value.includes("/") || named.start == null || start == null) {
		return chain;
	}

	const from = named.start - start;
	const to = (named.end ?? named.start) - start;
	return `${chain.slice(0, from)}${JSON.stringify(`${tag}/${named.value}`)}${chain.slice(to)}`;
}

function requestRootOf(file: SourceFile, name: string, chain: readonly ChainStep[]): ChainStep {
	const [root] = chain;

	if (root === undefined || root.call.callee.type !== "Identifier" || !REQUEST_ROOTS.has(root.method)) {
		throw new CliRefusal(fillTemplate(NOT_A_REQUEST, { file: file.relative, name, root: root?.method ?? "nothing" }));
	}

	return root;
}

function contractStepsOf(chain: readonly ChainStep[]): readonly ChainStep[] {
	const firstHandling = chain.findIndex((step, at) => at > 0 && !CONTRACT_STEPS.has(step.method));
	return firstHandling === -1 ? chain : chain.slice(0, firstHandling);
}

function chainTextOf(file: SourceFile, name: string, [first, last]: readonly [ChainStep, ChainStep]): string {
	const { start } = first.call;
	const { end } = last.call;

	if (start == null || end == null) {
		throw new CliRefusal(fillTemplate(NO_POSITION, { file: file.relative, name }));
	}

	return file.text.slice(start, end);
}

function usesInStep({ call }: ChainStep): NameUse[] {
	const callee = call.callee.type === "Identifier" ? usesOf(call.callee, NOTHING_BOUND) : [];
	const typeArguments = call.typeArguments == null ? [] : usesOf(call.typeArguments, NOTHING_BOUND);
	return [...callee, ...typeArguments, ...call.arguments.flatMap((argument) => usesOf(argument, NOTHING_BOUND))];
}

function orderByUse(listed: readonly ListedRequest[]): ListedRequest[] {
	const done: ListedRequest[] = [];
	let left = [...listed];

	while (left.length > 0) {
		const ready = left.filter((request) => request.uses.every((used) => !left.some(({ name }) => name === used.name)));

		if (ready.length === 0) {
			throw new CliRefusal(fillTemplate(CYCLE, { names: left.map(({ name }) => name).join(", ") }));
		}

		done.push(...ready);
		left = left.filter((request) => !ready.includes(request));
	}

	return done;
}

function sourceOf(folder: string, relative: string): SourceFile {
	try {
		return {
			relative,
			...parsedSourceOf(path.join(folder, relative)),
		};
	} catch (failure: unknown) {
		const reason = failure instanceof Error ? failure.message : String(failure);
		throw new CliRefusal(fillTemplate(UNREADABLE, { file: relative, reason }));
	}
}

function requestFileOf(folder: string, fromRelative: string, specifier: string): string {
	const relative = relativeOf(folder, fromRelative, specifier);
	const asTsx = `${relative}x`;
	return !fs.existsSync(path.join(folder, relative)) && fs.existsSync(path.join(folder, asTsx)) ? asTsx : relative;
}
