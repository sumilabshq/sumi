import fs from "node:fs";
import path from "node:path";
import type { Expression, Statement } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { importLinesOf, importsIn, withoutRepeats } from "./contract-imports.js";
import type { Imported } from "./contract-imports.js";
import { usesOf } from "./free-names.js";
import type { NameUse } from "./free-names.js";
import { chainOf, exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import type { ChainStep } from "@widgetarium/eslint-plugin/babel-chain";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";

export const CONTRACT_ENTRY = "generated/contract.ts";

interface SourceFile {
	readonly relative: string;
	readonly text: string;
	readonly body: readonly Statement[];
}

interface ListedRequest {
	readonly name: string;
	readonly file: SourceFile;
	readonly chain: string;
	readonly uses: readonly NameUse[];
}

interface RequestImports {
	readonly folder: string;
	readonly request: ListedRequest;
	readonly imports: readonly Imported[];
	readonly listed: ReadonlySet<string>;
}

const LISTING_METHODS: ReadonlySet<string> = new Set(["queries", "commands"]);
const ROOTS: ReadonlySet<string> = new Set(["query", "command"]);
const CONTRACT_STEPS: ReadonlySet<string> = new Set([
	"input",
	"output",
	"idempotencyKey",
	"cache",
	"settlesNow",
	"invalidates",
]);
const KNOWN_GLOBALS: ReadonlySet<string> = new Set([
	"undefined",
	"NaN",
	"Infinity",
	"globalThis",
	"Object",
	"Array",
	"String",
	"Number",
	"Boolean",
	"BigInt",
	"Symbol",
	"Date",
	"Math",
	"JSON",
	"RegExp",
	"Error",
	"Promise",
	"Map",
	"Set",
	"URL",
	"Record",
	"Readonly",
	"ReadonlyArray",
	"Partial",
	"Required",
	"Pick",
	"Omit",
	"Exclude",
	"Extract",
	"NonNullable",
	"ReturnType",
	"Parameters",
	"Awaited",
]);
const NOTHING_BOUND: ReadonlySet<string> = new Set();
const SCHEMAS = "shared/schema/";
const SCRIPT = /\.[jt]s$/;
const MODULE_FILE = "module.ts";

const NOT_LISTED_BY_NAME = "{module}: .queries() and .commands() take request constants by name, never an expression";
const LISTED_TWICE = "{module}: {name} is listed twice; a module lists each request once";
const NOT_IMPORTED = "{module}: {name} is listed but not imported by name from a file of this module";
const UNREADABLE = "{file} cannot be read: {reason}";
const NOT_EXPORTED = "{file} exports no const {name}, which {module} lists";
const NOT_A_REQUEST = "{file}: {name} starts with {root}(...); a listed request starts with query(...) or command(...)";
const NO_POSITION = "{file}: the chain of {name} carries no source position, so its contract cannot be cut from it";
const DECLARED_BESIDE =
	"{file}: the contract of {name} uses {used}, declared in that file; a contract reads only imports, so move {used} to shared/schema";
const UNLISTED_BESIDE =
	"{file}: the contract of {name} uses {used}, a request of that file that module.ts does not list; list {used} in module.ts";
const NOT_DECLARED = "{file}: the contract of {name} uses {used}, which that file neither imports nor declares";
const NOT_A_SCHEMA =
	"{file}: the contract of {name} uses {used} from {specifier}; a contract imports only shared/schema and packages, so no handler code reaches a client";
const CYCLE = "the contracts of {names} name each other in a cycle";

export function contractTextOf(folder: string, moduleName: string): string {
	const moduleFile = sourceOf(folder, MODULE_FILE);
	const listed = listedNamesOf(moduleFile, moduleName).map((name) => listedRequestOf(folder, moduleFile, name));
	const names = refuseListedTwice(listed, moduleName);
	const imports = listed.flatMap((request) =>
		importsOfRequest({
			folder,
			request,
			imports: importsIn(request.file.body),
			listed: names,
		}),
	);
	return [
		importLinesOf(withoutRepeats(imports)),
		"\n",
		...orderByUse(listed).map(({ name, chain }) => `export const ${name} = ${chain};\n`),
	].join("");
}

function listedNamesOf(moduleFile: SourceFile, moduleName: string): string[] {
	const init = exportedConstsOf(moduleFile.body).find(({ name }) => name === moduleName)?.init;
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

function listedRequestOf(folder: string, moduleFile: SourceFile, name: string): ListedRequest {
	const from = importsIn(moduleFile.body).find(({ local }) => local === name);

	if (from === undefined || from.form !== "named" || !from.specifier.startsWith(".")) {
		throw new CliRefusal(fillTemplate(NOT_IMPORTED, { module: MODULE_FILE, name }));
	}

	const file = sourceOf(folder, requestFileOf(folder, moduleFile.relative, from.specifier));
	const init = exportedConstsOf(file.body).find((declared) => declared.name === from.imported)?.init;

	if (init === undefined) {
		throw new CliRefusal(fillTemplate(NOT_EXPORTED, { file: file.relative, name: from.imported, module: MODULE_FILE }));
	}

	return contractOfChain(file, from.imported, init);
}

function contractOfChain(file: SourceFile, name: string, init: Expression): ListedRequest {
	const chain = chainOf(init);
	const root = requestRootOf(file, name, chain);
	const kept = contractStepsOf(chain);
	return {
		name,
		file,
		chain: chainTextOf(file, name, [root, kept.at(-1) ?? root]),
		uses: kept.flatMap(usesInStep),
	};
}

function requestRootOf(file: SourceFile, name: string, chain: readonly ChainStep[]): ChainStep {
	const [root] = chain;

	if (root === undefined || root.call.callee.type !== "Identifier" || !ROOTS.has(root.method)) {
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

function importsOfRequest(asked: RequestImports): Imported[] {
	return usedNamesOf(asked.request.uses)
		.filter(({ name }) => !asked.listed.has(name))
		.flatMap((use) => importOfUse(asked, use));
}

function usedNamesOf(uses: readonly NameUse[]): NameUse[] {
	const isOnlyType = new Map<string, boolean>();

	for (const { name, isType } of uses) {
		isOnlyType.set(name, (isOnlyType.get(name) ?? true) && isType);
	}

	return [...isOnlyType].map(([name, isType]) => ({
		name,
		isType,
	}));
}

function importOfUse({ folder, request, imports }: RequestImports, use: NameUse): Imported[] {
	const from = imports.find(({ local }) => local === use.name);

	if (from !== undefined) {
		return [
			importForContract(folder, request, {
				...from,
				isType: from.isType || use.isType,
			}),
		];
	}

	refuseDeclaredBeside(request, use.name);

	if (KNOWN_GLOBALS.has(use.name)) {
		return [];
	}

	throw new CliRefusal(fillTemplate(NOT_DECLARED, { file: request.file.relative, name: request.name, used: use.name }));
}

function refuseDeclaredBeside(request: ListedRequest, used: string): void {
	const { body } = request.file;

	if (!isDeclaredIn(body, used)) {
		return;
	}

	const message = isRequestDeclaredIn(body, used) ? UNLISTED_BESIDE : DECLARED_BESIDE;
	throw new CliRefusal(fillTemplate(message, { file: request.file.relative, name: request.name, used }));
}

function importForContract(folder: string, request: ListedRequest, from: Imported): Imported {
	if (!from.specifier.startsWith(".")) {
		return from;
	}

	const target = relativeOf(folder, request.file.relative, from.specifier);

	if (!target.startsWith(SCHEMAS)) {
		const data = { file: request.file.relative, name: request.name, used: from.local, specifier: from.specifier };
		throw new CliRefusal(fillTemplate(NOT_A_SCHEMA, data));
	}

	return {
		...from,
		specifier: `../${target.replace(SCRIPT, ".js")}`,
	};
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

function isDeclaredIn(body: readonly Statement[], name: string): boolean {
	return body.some((statement) => {
		const declared = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;

		if (declared?.type === "VariableDeclaration") {
			return declared.declarations.some(
				(declarator) => declarator.id.type === "Identifier" && declarator.id.name === name,
			);
		}

		return (
			(declared?.type === "FunctionDeclaration" || declared?.type === "ClassDeclaration") && declared.id?.name === name
		);
	});
}

function isRequestDeclaredIn(body: readonly Statement[], name: string): boolean {
	return exportedConstsOf(body).some(
		(declared) => declared.name === name && ROOTS.has(rootCallOf(declared.init)?.method ?? ""),
	);
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

function relativeOf(folder: string, fromRelative: string, specifier: string): string {
	const resolved = path.resolve(path.dirname(path.join(folder, fromRelative)), specifier).replace(SCRIPT, ".ts");
	return path.relative(folder, resolved).split(path.sep).join("/");
}
