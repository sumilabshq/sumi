import fs from "node:fs";
import path from "node:path";
import type { Expression } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { importLinesOf, importsIn, withoutRepeats } from "./contract-imports.js";
import type { Imported } from "./contract-imports.js";
import { REQUEST_ROOTS, needsOfRequest, relativeOf } from "./contract-needs.js";
import type { ListedRequest, SourceFile } from "./contract-needs.js";
import { copiedSchemasOf } from "./contract-schemas.js";
import type { SchemasElsewhere } from "./contract-schemas.js";
import { refuseKeyFunction } from "./contract-key.js";
import { usesOf } from "./free-names.js";
import type { NameUse } from "./free-names.js";
import { chainOf, exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import type { ChainStep } from "@widgetarium/eslint-plugin/babel-chain";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";

export const CONTRACT_ENTRY = "generated/contract.ts";
export const SERVER_CONTRACT_FILE = "generated/server.ts";

export interface ModuleContracts {
	readonly contract: string;
	readonly server: string | null;
}

interface ListingModule {
	readonly file: SourceFile;
	readonly tag: string;
}

interface Listing {
	readonly public: readonly string[];
	readonly serverOnly: readonly string[];
}

interface CutAsk {
	readonly folder: string;
	readonly listed: readonly ListedRequest[];
	readonly listedNames: ReadonlySet<string>;
	readonly extraImports: readonly Imported[];
	readonly schemasElsewhere?: SchemasElsewhere;
}

interface Cut {
	readonly text: string;
	readonly exportedSchemaNames: ReadonlySet<string>;
}

interface PublicContract {
	readonly requestNames: ReadonlySet<string>;
	readonly schemaNames: ReadonlySet<string>;
}

const PUBLIC_METHOD = "public";
const SERVER_ONLY_METHOD = "serverOnly";
const PLACEMENT_METHOD = "on";
const PLACEMENTS: ReadonlySet<string> = new Set(["Server", "Device", "Anywhere"]);
const CORE_REQUESTS = "@widgetarium/core/requests";
const PUBLIC_CONTRACT_SPECIFIER = "./contract.js";
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
const NOT_LISTED_BY_NAME = "{module}: .public() and .serverOnly() take request constants by name, never an expression";
const LISTED_TWICE = "{module}: {name} is listed twice; a request stands in exactly one of .public() and .serverOnly()";
const NO_PLACEMENT = "{module}: module(...).on() takes Server, Device or Anywhere by name";
const PUBLIC_NAMES_SERVER_ONLY =
	"{module}: the public contract of {name} names {other}, which is server-only; a public contract never names a server-only request";
const NOT_IMPORTED = "{module}: {name} is listed but not imported by name from a file of this module";
const UNREADABLE = "{file} cannot be read: {reason}";
const NOT_EXPORTED = "{file} exports no const {name}, which {module} lists";
const NOT_A_REQUEST = "{file}: {name} starts with {root}(...); a listed request starts with query(...) or command(...)";
const NO_POSITION = "{file}: the chain of {name} carries no source position, so its contract cannot be cut from it";
const NO_MODULE_NAME = "{module}: module(...) takes its name as a string literal";
const CYCLE = "the contracts of {names} name each other in a cycle";

export function moduleContractsOf(folder: string, moduleName: string): ModuleContracts {
	const moduleFile = sourceOf(folder, MODULE_FILE);
	const init = exportedConstsOf(moduleFile.body).find(({ name }) => name === moduleName)?.init;
	const listing = { file: moduleFile, tag: moduleTagOf(init, moduleName) };
	const names = listingOf(init, moduleName);
	const publicListed = names.public.map((name) => listedRequestOf(folder, listing, name));
	const serverListed = names.serverOnly.map((name) => listedRequestOf(folder, listing, name));
	const listedNames = refuseListedTwice([...publicListed, ...serverListed], moduleName);
	refusePublicNamingServerOnly(publicListed, new Set(names.serverOnly), moduleName);
	const descriptor = descriptorOf(moduleName, listing.tag, placementOf(init, moduleName), publicListed);
	const contract = cutOf({ folder, listed: publicListed, listedNames, extraImports: descriptor.imports });
	const publicContract = {
		requestNames: new Set(names.public),
		schemaNames: contract.exportedSchemaNames,
	};
	return {
		contract: `${contract.text}${descriptor.text}`,
		server:
			serverListed.length === 0
				? null
				: serverContractOf({ folder, listed: serverListed, listedNames, extraImports: [] }, publicContract),
	};
}

function cutOf({ folder, listed, listedNames, extraImports, schemasElsewhere }: CutAsk): Cut {
	const needs = listed.flatMap((request) =>
		needsOfRequest({
			folder,
			request,
			imports: importsIn(request.file.body),
			listed: listedNames,
		}),
	);
	const copied = copiedSchemasOf(
		folder,
		needs.flatMap((need) => (need.kind === "schema" ? [need.root] : [])),
		schemasElsewhere,
	);
	const imports = [
		...needs.flatMap((need) => (need.kind === "import" ? [need.imported] : [])),
		...copied.imports,
		...extraImports,
	];
	const text = [
		importLinesOf(withoutRepeats(imports)),
		"\n",
		copied.text === "" ? "" : `${copied.text}\n`,
		...orderByUse(listed).map(({ name, chain }) => `export const ${name} = ${chain};\n`),
	].join("");
	return {
		text,
		exportedSchemaNames: copied.exportedNames,
	};
}

function serverContractOf(ask: CutAsk, publicContract: PublicContract): string {
	const fromPublic = [...new Set(ask.listed.flatMap(({ uses }) => uses.map(({ name }) => name)))]
		.filter((name) => publicContract.requestNames.has(name))
		.sort()
		.map((name) => namedImportOf(PUBLIC_CONTRACT_SPECIFIER, name));
	const schemasElsewhere = {
		specifier: PUBLIC_CONTRACT_SPECIFIER,
		names: publicContract.schemaNames,
	};
	return cutOf({ ...ask, extraImports: [...ask.extraImports, ...fromPublic], schemasElsewhere }).text;
}

function descriptorOf(moduleName: string, tag: string, placement: string, listed: readonly ListedRequest[]) {
	const requests = orderByUse(listed).map(({ name }) => name);
	const text = `\nexport const ${moduleName} = moduleContract(${JSON.stringify(tag)}, ${placement}, [${requests.join(", ")}]);\n`;
	return {
		text,
		imports: [namedImportOf(CORE_REQUESTS, "moduleContract"), namedImportOf(CORE_REQUESTS, placement)],
	};
}

function namedImportOf(specifier: string, name: string): Imported {
	return {
		specifier,
		imported: name,
		local: name,
		form: "named",
		isType: false,
	};
}

function refusePublicNamingServerOnly(
	publicListed: readonly ListedRequest[],
	serverOnly: ReadonlySet<string>,
	moduleName: string,
): void {
	for (const { name, uses } of publicListed) {
		const other = uses.find((used) => serverOnly.has(used.name));

		if (other !== undefined) {
			throw new CliRefusal(fillTemplate(PUBLIC_NAMES_SERVER_ONLY, { module: moduleName, name, other: other.name }));
		}
	}
}

function placementOf(init: Expression | undefined, moduleName: string): string {
	const placed = init === undefined ? undefined : chainOf(init).find(({ method }) => method === PLACEMENT_METHOD);
	const [argument] = placed?.call.arguments ?? [];

	if (argument?.type !== "Identifier" || !PLACEMENTS.has(argument.name)) {
		throw new CliRefusal(fillTemplate(NO_PLACEMENT, { module: moduleName }));
	}

	return argument.name;
}

function moduleTagOf(init: Expression | undefined, moduleName: string): string {
	const named = init === undefined ? undefined : rootCallOf(init)?.call.arguments[0];

	if (named?.type !== "StringLiteral") {
		throw new CliRefusal(fillTemplate(NO_MODULE_NAME, { module: moduleName }));
	}

	return named.value;
}

function listingOf(init: Expression | undefined, moduleName: string): Listing {
	const steps = init === undefined ? [] : chainOf(init);
	return {
		public: steps.filter(({ method }) => method === PUBLIC_METHOD).flatMap((step) => namesListedBy(step, moduleName)),
		serverOnly: steps
			.filter(({ method }) => method === SERVER_ONLY_METHOD)
			.flatMap((step) => namesListedBy(step, moduleName)),
	};
}

function namesListedBy({ call }: ChainStep, moduleName: string): string[] {
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
