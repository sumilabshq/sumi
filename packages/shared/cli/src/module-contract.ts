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
}

export interface ModuleContracts {
	readonly contract: string;
	readonly server: string | null;
	readonly handledItems: readonly HandledItem[];
}

type ItemRoot = "query" | "command" | "event" | "subscriber";

interface DeclaredItem {
	readonly name: string;
	readonly file: SourceFile;
	readonly chain: readonly ChainStep[];
	readonly rootStep: ChainStep;
	readonly root: ItemRoot;
	readonly isPublic: boolean;
	readonly isHandled: boolean;
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
const NO_MODULE_NAME = "{module}: module(...) takes its name as a string literal";
const NAMED_TWICE = "{module}: {name} is declared in {first} and {second}; a module names each request once";
const CYCLE = "the contracts of {names} name each other in a cycle";

export function moduleContractsOf(folder: string, moduleName: string): ModuleContracts {
	const moduleFile = sourceOf(folder, MODULE_FILE);
	const init = exportedConstsOf(moduleFile.body).find(({ name }) => name === moduleName)?.init;
	const tag = moduleTagOf(init, moduleName);
	const placement = placementOf(init, moduleName);
	const items = declaredItemsOf(folder, moduleName);
	const contracted = items.filter(({ root }) => root !== "subscriber");
	const listedNames = new Set(contracted.map(({ name }) => name));
	const publicListed = contracted.filter(({ isPublic }) => isPublic).map((item) => contractOfItem(item, tag));
	const serverListed =
		placement === DEVICE
			? []
			: contracted
					.filter(({ isPublic, root }) => !isPublic && root !== "event")
					.map((item) => contractOfItem(item, tag));
	const publicRequests = publicListed.filter(({ root }) => root !== "event");
	const descriptor = descriptorOf(moduleName, tag, placement, publicRequests);
	const contract = cutOf({
		folder,
		listed: publicListed,
		listedNames,
		extraImports: descriptor.imports,
	});
	const publicContract = {
		requestNames: new Set(publicListed.map(({ name }) => name)),
		schemaNames: contract.exportedSchemaNames,
	};
	return {
		contract: `${contract.text}${descriptor.text}`,
		server:
			serverListed.length === 0
				? null
				: serverContractOf({ folder, listed: serverListed, listedNames, extraImports: [] }, publicContract),
		handledItems: items
			.filter(({ root, isHandled }) => root === "event" || isHandled)
			.map(({ name, file }) => ({ name, file: file.relative })),
	};
}

function declaredItemsOf(folder: string, moduleName: string): DeclaredItem[] {
	const scripts = filesUnder(folder, isModuleScript);
	refuseItemsElsewhere(folder, scripts.filter((relative) => !isItemFile(relative)));
	const items = scripts.filter(isItemFile).flatMap((relative) => itemsIn(sourceOf(folder, relative)));
	refuseNamedTwice(items, moduleName);
	refuseUnhandledRequests(items);
	return items;
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

		return [
			{
				name,
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

function refuseNamedTwice(items: readonly DeclaredItem[], moduleName: string): void {
	const seen = new Map<string, string>();

	for (const { name, file } of items) {
		const first = seen.get(name);

		if (first !== undefined) {
			throw new CliRefusal(fillTemplate(NAMED_TWICE, { module: moduleName, name, first, second: file.relative }));
		}

		seen.set(name, file.relative);
	}
}

function refuseUnhandledRequests(items: readonly DeclaredItem[]): void {
	const unhandled = items.find(({ root, isHandled }) => (root === "query" || root === "command") && !isHandled);

	if (unhandled !== undefined) {
		const { name, file, root } = unhandled;
		throw new CliRefusal(fillTemplate(UNHANDLED_REQUEST, { file: file.relative, name, root }));
	}
}

function contractOfItem({ name, file, chain, rootStep }: DeclaredItem, tag: string): ListedRequest {
	const kept = contractStepsOf(chain);
	const contractSteps = kept.filter(({ method }) => !VISIBILITY_STEPS.has(method));
	contractSteps.forEach((step) => refuseKeyFunction(step, { file: file.relative, name }));
	const text = withoutCallableBy(file, name, rootStep, kept);
	return {
		name,
		file,
		chain: withFullName(text, rootStep, tag),
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
		imports: [namedImportOf(FRAMEWORK, "moduleContract"), namedImportOf(FRAMEWORK, placement)],
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
