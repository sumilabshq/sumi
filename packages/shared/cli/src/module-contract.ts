import path from "node:path";
import type { Expression } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { importLinesOf, importsIn, withoutRepeats } from "./contract-imports.js";
import type { Imported } from "./contract-imports.js";
import { REQUEST_ROOTS, needsOfRequest } from "./contract-needs.js";
import type { ListedRequest, SourceFile } from "./contract-needs.js";
import { copiedSchemasOf } from "./contract-schemas.js";
import type { SchemasElsewhere } from "./contract-schemas.js";
import { refuseKeyFunction } from "./contract-key.js";
import { usesOf } from "./free-names.js";
import type { NameUse } from "./free-names.js";
import { FRAMEWORK } from "./scaffold-names.js";
import { camelOf, checkedCamelName, groupOf, kebabOf, pathOf, refuseSamePaths } from "./item-names.js";
import { filesUnder } from "./template-files.js";
import { chainOf, exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import type { ChainStep } from "@widgetarium/eslint-plugin/babel-chain";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";

export const CONTRACT_ENTRY = "generated/contract.ts";
export const SERVER_CONTRACT_FILE = "generated/server.ts";

export interface HandledItem {
	readonly name: string;
	readonly file: string;
	readonly group: readonly string[];
	readonly path: string | null;
}

export interface ModuleContracts {
	readonly contract: string;
	readonly server: string | null;
	readonly handledItems: readonly HandledItem[];
	readonly ownedEvents: readonly HandledItem[];
}

type ItemRoot = "query" | "command" | "event" | "subscriber";

interface DeclaredItem {
	readonly name: string;
	readonly group: readonly string[];
	readonly file: SourceFile;
	readonly chain: readonly ChainStep[];
	readonly rootStep: ChainStep;
	readonly root: ItemRoot;
	readonly isPublic: boolean;
	readonly isHandled: boolean;
}

interface ContractEntry extends ListedRequest {
	readonly group: readonly string[];
}

interface CutAsk {
	readonly folder: string;
	readonly listed: readonly ContractEntry[];
	readonly listedNames: ReadonlySet<string>;
	readonly extraImports: readonly Imported[];
	readonly schemasElsewhere?: SchemasElsewhere;
}

interface Cut {
	readonly text: string;
	readonly exportedSchemaNames: ReadonlySet<string>;
}

const PUBLIC_METHOD = "public";
const CALLABLE_BY_METHOD = "callableBy";
const VISIBILITY_STEPS: ReadonlySet<string> = new Set([PUBLIC_METHOD, CALLABLE_BY_METHOD]);
const HANDLE_METHOD = "handle";
const PLACEMENT_METHOD = "on";
const PLACEMENTS: ReadonlySet<string> = new Set(["Server", "Device", "Anywhere"]);
const DEVICE = "Device";
const PUBLIC_CONTRACT_SPECIFIER = "./contract.js";
const CONTRACT_STEPS: ReadonlySet<string> = new Set([
	"input",
	"output",
	"idempotencyKey",
	"cache",
	"settlesNow",
	...VISIBILITY_STEPS,
]);
const ITEM_ROOTS: ReadonlySet<string> = new Set([...REQUEST_ROOTS, "subscriber"]);
const ITEM_FILES: readonly RegExp[] = [
	/^features\/.+\/requests\.tsx?$/,
	/^gateways\/.+\.events\.ts$/,
	/^shared\/events\/.+\.events\.ts$/,
];
const NOTHING_BOUND: ReadonlySet<string> = new Set();
const MODULE_FILE = "module.ts";
const SCRIPT = /\.tsx?$/;
const DECLARATIONS = /\.d\.ts$/;
const GENERATED_FOLDER = "generated/";
const NO_PLACEMENT = "{module}: module(...).on() takes Server, Device or Anywhere by name";
const UNHANDLED_REQUEST =
	"{file}: {name} is a {root} with no .handle(...); a module package declares only the requests it handles";
const ITEM_ELSEWHERE =
	"{file}: {name} is a {root} outside features/<feature>/requests.ts, gateways/**/*.events.ts and shared/events/*.events.ts, the only files generate reads; move it into one of them";
const UNREADABLE = "{file} cannot be read: {reason}";
const NO_POSITION = "{file}: the chain of {name} carries no source position, so its contract cannot be cut from it";
const NAMED_BY_STRING =
	"{file}: {name} passes {root}() a name; a building block is named by its constant, so call {root}() with no argument";
const MODULE_NAMED_BY_STRING =
	"{module}: module() takes no name; the module is named by its constant, written in by generate";
const NAMES_A_REQUEST =
	"{file}: the contract of {name} names the request {used}; a contract step names no other request";
const CONTRACT_FUNCTION = "moduleContract";
const NAMESPACE_FUNCTION = "moduleNamespace";
const NAMED_FUNCTION = "named";

export function moduleContractsOf(folder: string, moduleName: string): ModuleContracts {
	const moduleFile = sourceOf(folder, MODULE_FILE);
	const init = exportedConstsOf(moduleFile.body).find(({ name }) => name === moduleName)?.init;
	const tag = moduleTagOf(init, moduleName);
	const placement = placementOf(init, moduleName);
	const items = declaredItemsOf(folder);
	const contracted = items.filter(({ root }) => root !== "subscriber");
	const listedNames = new Set(contracted.map(({ name }) => name));
	const publicListed = contracted.filter(({ isPublic }) => isPublic).map(contractOfItem);
	const serverListed =
		placement === DEVICE
			? []
			: contracted.filter(({ isPublic, root }) => !isPublic && root !== "event").map(contractOfItem);
	const descriptorHead = `moduleContract(${JSON.stringify(tag)}, ${placement}, `;
	const contract = cutOf({
		folder,
		listed: publicListed,
		listedNames,
		extraImports: [namedImportOf(FRAMEWORK, CONTRACT_FUNCTION), namedImportOf(FRAMEWORK, placement)],
	});
	return {
		contract: `${contract.text}${namespaceTextOf(moduleName, descriptorHead, publicListed)}`,
		server:
			serverListed.length === 0
				? null
				: serverContractOf(
						{ folder, listed: serverListed, listedNames, extraImports: [] },
						contract.exportedSchemaNames,
					) + namespaceTextOf(moduleName, `moduleNamespace(${JSON.stringify(tag)}, `, serverListed),
		handledItems: items.filter(({ root, isHandled }) => root === "event" || isHandled).map(handledItemOf),
		ownedEvents: items.filter(({ root }) => root === "event").map(handledItemOf),
	};
}

export function moduleTagOfName(moduleName: string): string {
	return kebabOf(checkedCamelName(moduleName, MODULE_FILE));
}

function handledItemOf(item: DeclaredItem): HandledItem {
	const { name, file, group, root } = item;
	return {
		name,
		file: file.relative,
		group,
		path: root === "subscriber" ? null : pathOf({ name, file: file.relative, group }),
	};
}

function declaredItemsOf(folder: string): DeclaredItem[] {
	const scripts = filesUnder(folder, isModuleScript);
	refuseItemsElsewhere(
		folder,
		scripts.filter((relative) => !isItemFile(relative)),
	);
	const items = scripts.filter(isItemFile).flatMap((relative) => itemsIn(sourceOf(folder, relative)));
	refuseSamePaths(items.filter(({ root }) => root !== "subscriber").map(pathedOf));
	refuseUnhandledRequests(items);
	return items;
}

function pathedOf({ name, file, group }: DeclaredItem) {
	return { name, file: file.relative, group };
}

function isModuleScript(relative: string): boolean {
	return SCRIPT.test(relative) && !DECLARATIONS.test(relative) && !relative.startsWith(GENERATED_FOLDER);
}

function isItemFile(relative: string): boolean {
	return ITEM_FILES.some((pattern) => pattern.test(relative));
}

function refuseItemsElsewhere(folder: string, scripts: readonly string[]): void {
	for (const relative of scripts) {
		const [stray] = itemsIn(sourceOf(folder, relative));

		if (stray !== undefined) {
			throw new CliRefusal(fillTemplate(ITEM_ELSEWHERE, { file: relative, name: stray.name, root: stray.root }));
		}
	}
}

function itemsIn(file: SourceFile): DeclaredItem[] {
	return exportedConstsOf(file.body).flatMap(({ name, init }) => {
		const chain = chainOf(init);
		const [rootStep] = chain;

		if (rootStep === undefined || rootStep.call.callee.type !== "Identifier" || !ITEM_ROOTS.has(rootStep.method)) {
			return [];
		}

		refuseNamedByString(file, name, rootStep);
		return [
			{
				name: checkedCamelName(name, file.relative),
				group: isItemFile(file.relative) ? groupOf(file.relative) : [],
				file,
				chain,
				rootStep,
				root: itemRootOf(rootStep.method),
				isPublic: chain.some(({ method }) => method === PUBLIC_METHOD),
				isHandled: chain.some(({ method }) => method === HANDLE_METHOD),
			},
		];
	});
}

function itemRootOf(method: string): ItemRoot {
	if (method === "query" || method === "command" || method === "event") {
		return method;
	}

	return "subscriber";
}

function refuseNamedByString(file: SourceFile, name: string, { method, call }: ChainStep): void {
	if (method !== "subscriber" && call.arguments.length > 0) {
		throw new CliRefusal(fillTemplate(NAMED_BY_STRING, { file: file.relative, name, root: method }));
	}
}

function refuseUnhandledRequests(items: readonly DeclaredItem[]): void {
	const unhandled = items.find(({ root, isHandled }) => (root === "query" || root === "command") && !isHandled);

	if (unhandled !== undefined) {
		const { name, file, root } = unhandled;
		throw new CliRefusal(fillTemplate(UNHANDLED_REQUEST, { file: file.relative, name, root }));
	}
}

function contractOfItem({ name, group, file, chain, rootStep }: DeclaredItem): ContractEntry {
	const kept = contractStepsOf(chain);
	const contractSteps = kept.filter(({ method }) => !VISIBILITY_STEPS.has(method));
	contractSteps.forEach((step) => refuseKeyFunction(step, { file: file.relative, name }));
	const path = pathOf({ name, file: file.relative, group });
	return {
		name,
		group,
		file,
		chain: `${NAMED_FUNCTION}(${JSON.stringify(path)}, ${withoutCallableBy(file, name, rootStep, kept)})`,
		root: rootStep.method,
		uses: contractSteps.flatMap(usesInStep),
	};
}

function withoutCallableBy(file: SourceFile, name: string, root: ChainStep, kept: readonly ChainStep[]): string {
	const text = chainTextOf(file, name, [root, kept.at(-1) ?? root]);
	const start = root.call.start ?? 0;
	return kept
		.filter(({ method }) => method === CALLABLE_BY_METHOD)
		.map(({ call }) => [call.callee.type === "MemberExpression" ? (call.callee.object.end ?? 0) : 0, call.end ?? 0])
		.sort(([first = 0], [second = 0]) => second - first)
		.reduce((cut, [from = 0, to = 0]) => `${cut.slice(0, from - start)}${cut.slice(to - start)}`, text);
}

function cutOf({ folder, listed, listedNames, extraImports, schemasElsewhere }: CutAsk): Cut {
	refuseNamedRequests(listed, listedNames);
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
		namedImportOf(FRAMEWORK, NAMED_FUNCTION),
	];
	const text = [importLinesOf(withoutRepeats(imports)), "\n", copied.text === "" ? "" : `${copied.text}\n`].join("");
	return {
		text,
		exportedSchemaNames: copied.exportedNames,
	};
}

function serverContractOf(ask: CutAsk, publicSchemaNames: ReadonlySet<string>): string {
	const schemasElsewhere = {
		specifier: PUBLIC_CONTRACT_SPECIFIER,
		names: publicSchemaNames,
	};
	const extraImports = [...ask.extraImports, namedImportOf(FRAMEWORK, NAMESPACE_FUNCTION)];
	return cutOf({ ...ask, extraImports, schemasElsewhere }).text;
}

function refuseNamedRequests(listed: readonly ContractEntry[], listedNames: ReadonlySet<string>): void {
	for (const { name, file, uses } of listed) {
		const used = uses.find((use) => listedNames.has(use.name));

		if (used !== undefined) {
			throw new CliRefusal(fillTemplate(NAMES_A_REQUEST, { file: file.relative, name, used: used.name }));
		}
	}
}

function namespaceTextOf(moduleName: string, head: string, listed: readonly ContractEntry[]): string {
	return `export const ${moduleName} = ${head}${treeTextOf(listed, 0)});\n`;
}

function treeTextOf(listed: readonly ContractEntry[], depth: number): string {
	const indent = "\t".repeat(depth + 1);
	const keys = [...new Set(listed.map((entry) => entry.group[depth] ?? null))];
	const lines = keys.flatMap((key) => {
		if (key === null) {
			return listed
				.filter((entry) => entry.group.length === depth)
				.map(({ name, chain }) => `${indent}${name}: ${chain.replaceAll("\n", `\n${indent}`)},\n`);
		}

		const inside = listed.filter((entry) => entry.group[depth] === key);
		return [`${indent}${camelOf(key)}: ${treeTextOf(inside, depth + 1)},\n`];
	});
	return `{\n${lines.join("")}${"\t".repeat(depth)}}`;
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

function placementOf(init: Expression | undefined, moduleName: string): string {
	const placed = init === undefined ? undefined : chainOf(init).find(({ method }) => method === PLACEMENT_METHOD);
	const [argument] = placed?.call.arguments ?? [];

	if (argument?.type !== "Identifier" || !PLACEMENTS.has(argument.name)) {
		throw new CliRefusal(fillTemplate(NO_PLACEMENT, { module: moduleName }));
	}

	return argument.name;
}

function moduleTagOf(init: Expression | undefined, moduleName: string): string {
	const passed = init === undefined ? [] : (rootCallOf(init)?.call.arguments ?? []);

	if (passed.length > 0) {
		throw new CliRefusal(fillTemplate(MODULE_NAMED_BY_STRING, { module: moduleName }));
	}

	return moduleTagOfName(moduleName);
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
