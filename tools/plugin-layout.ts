import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

interface AstNode {
	readonly type: string;
	readonly [key: string]: unknown;
}

const PLUGIN_FILE = "src/plugin.ts";
const SLOTS_FILE = "src/slots.ts";
const INDEX_FILE = "src/index.ts";
const ALLOWED_TOP = new Set(["src", "data", "node_modules", "package.json", "tsconfig.json", "LICENSE"]);
const SRC_TOP_FILES = new Set(["plugin.ts", "slots.ts", "index.ts"]);
const SRC_AREAS = new Set(["features", "shared"]);
const AREA_PARTS = new Set(["ui", "lib"]);
const UI_FILE = /\.(tsx|css)$/;
const LIB_FILE = /(?<!\.d)\.ts$/;
const SOURCE = /\.(ts|tsx)$/;
const LOOSE_IN_SRC = "no other loose file at the top of src; it goes to features/<feature>/ or shared/";
const NOT_A_PART = "a feature or shared/ holds only ui/ and lib/";
const NOT_A_BLOCK = "ui/ holds only block folders, ui/<block>/";
const NOT_UI_FILE = "a block folder holds only its .tsx and the .css it uses";
const NOT_LIB_FILE = "lib/ holds only .ts files, no folder, no .tsx, no .css";
const FOREIGN_LIB = "a feature's lib/ is its own; what two features use goes to shared/lib/";

export function layoutRefusalsOf(pluginsRoot: string): readonly string[] {
	return readdirSync(pluginsRoot)
		.filter((name) => !name.startsWith(".") && statSync(path.join(pluginsRoot, name)).isDirectory())
		.sort()
		.flatMap((name) => pluginRefusalsOf(pluginsRoot, name));
}

function pluginRefusalsOf(pluginsRoot: string, name: string): readonly string[] {
	const folder = path.join(pluginsRoot, name);
	const at = (relative: string): string => `plugins/${name}/${relative}`;
	return [
		...topRefusalsOf(folder, at),
		...pluginFileRefusalsOf(folder, at),
		...slotRefusalsOf(folder, at),
		...indexRefusalsOf(folder, at),
		...srcPlacementRefusalsOf(folder, at),
		...foreignLibRefusalsOf(folder, at),
		...dataRefusalsOf(folder, at),
	];
}

function srcPlacementRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	const src = path.join(folder, "src");

	if (!existsSync(src)) {
		return [];
	}

	return entriesOf(src).flatMap(({ name, isFolder }) => {
		const relative = `src/${name}`;

		if (isFolder && SRC_AREAS.has(name)) {
			return name === "shared"
				? areaPartsRefusalsOf(folder, relative, at)
				: entriesOf(path.join(folder, relative)).flatMap((feature) =>
						feature.isFolder
							? areaPartsRefusalsOf(folder, `${relative}/${feature.name}`, at)
							: [`${at(`${relative}/${feature.name}`)}: features/ holds only feature folders`],
					);
		}

		return isFolder || !SRC_TOP_FILES.has(name) ? [`${at(relative)}: ${LOOSE_IN_SRC}`] : [];
	});
}

function areaPartsRefusalsOf(folder: string, relative: string, at: (relative: string) => string): readonly string[] {
	return entriesOf(path.join(folder, relative)).flatMap(({ name, isFolder }) => {
		const part = `${relative}/${name}`;

		if (!isFolder || !AREA_PARTS.has(name)) {
			return [`${at(part)}: ${NOT_A_PART}`];
		}

		return name === "ui" ? uiRefusalsOf(folder, part, at) : libRefusalsOf(folder, part, at);
	});
}

function uiRefusalsOf(folder: string, relative: string, at: (relative: string) => string): readonly string[] {
	return entriesOf(path.join(folder, relative)).flatMap(({ name, isFolder }) => {
		const block = `${relative}/${name}`;

		if (!isFolder) {
			return [`${at(block)}: ${NOT_A_BLOCK}`];
		}

		return entriesOf(path.join(folder, block))
			.filter((entry) => entry.isFolder || !UI_FILE.test(entry.name))
			.map((entry) => `${at(`${block}/${entry.name}`)}: ${NOT_UI_FILE}`);
	});
}

function libRefusalsOf(folder: string, relative: string, at: (relative: string) => string): readonly string[] {
	return entriesOf(path.join(folder, relative))
		.filter((entry) => entry.isFolder || !LIB_FILE.test(entry.name))
		.map((entry) => `${at(`${relative}/${entry.name}`)}: ${NOT_LIB_FILE}`);
}

function foreignLibRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	const src = path.join(folder, "src");
	const features = path.join(src, "features");
	return sourcesUnder(src)
		.filter((file) => path.dirname(file) !== src)
		.flatMap((file) => {
			const own = featureOf(features, file);
			return importsOf(file)
				.filter(({ source }) => source.startsWith("."))
				.filter(({ source }) => {
					const target = path.resolve(path.dirname(file), source);
					const theirs = featureOf(features, target);
					return theirs !== null && theirs !== own && isInLib(features, theirs, target);
				})
				.map(
					({ source, line }) => `${at(path.relative(folder, file))}:${line}: imports ${source}; ${FOREIGN_LIB}`,
				);
		});
}

function featureOf(features: string, file: string): string | null {
	const relative = path.relative(features, file);

	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		return null;
	}

	const [feature = null] = relative.split(path.sep);
	return feature;
}

function isInLib(features: string, feature: string, target: string): boolean {
	return !path.relative(path.join(features, feature, "lib"), target).startsWith("..");
}

interface FoundImport {
	readonly source: string;
	readonly line: string;
}

function importsOf(file: string): readonly FoundImport[] {
	const body = programOf(file);
	const declared = body.flatMap((statement) => {
		const source = nodeAt(statement, "source");
		return source !== null && typeof source["value"] === "string"
			? [{ source: source["value"], line: lineOf(statement) }]
			: [];
	});
	const loaded = callsOfImport(body).flatMap((call) => {
		const [argument] = Array.isArray(call["arguments"]) ? call["arguments"] : [nodeAt(call, "source")];
		const value = isAstNode(argument) ? argument["value"] : null;
		return typeof value === "string" ? [{ source: value, line: lineOf(call) }] : [];
	});
	return [...declared, ...loaded];
}

function isDynamicImport(node: AstNode): boolean {
	return (
		node.type === "ImportExpression" ||
		(node.type === "CallExpression" && nodeAt(node, "callee")?.type === "Import")
	);
}

function callsOfImport(nodes: readonly unknown[]): readonly AstNode[] {
	return nodes.flatMap((node) => {
		if (!isAstNode(node)) {
			return [];
		}

		const own = isDynamicImport(node) ? [node] : [];
		const children = Object.values(node).flatMap((value) => (Array.isArray(value) ? value : [value]));
		return [...own, ...callsOfImport(children)];
	});
}

interface FolderEntry {
	readonly name: string;
	readonly isFolder: boolean;
}

function entriesOf(folder: string): readonly FolderEntry[] {
	return readdirSync(folder, { withFileTypes: true })
		.filter((entry) => !entry.name.startsWith("."))
		.map((entry) => ({ name: entry.name, isFolder: entry.isDirectory() }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function topRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	return readdirSync(folder)
		.filter((entry) => !ALLOWED_TOP.has(entry) && !entry.startsWith("."))
		.map((entry) => `${at(entry)}: a plugin holds only src/, data/, package.json, tsconfig.json and LICENSE`);
}

function pluginFileRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	const file = path.join(folder, PLUGIN_FILE);

	if (!existsSync(file)) {
		return [`${at(PLUGIN_FILE)}: missing; every plugin defines itself there`];
	}

	const body = programOf(file);
	const definitions = body.filter(isPluginDefinition);
	const others = body.filter((statement) => statement.type !== "ImportDeclaration" && !isPluginDefinition(statement));
	return [
		...(definitions.length === 1
			? []
			: [`${at(PLUGIN_FILE)}: holds ${String(definitions.length)} plugin(...) definitions, not one`]),
		...others.map(
			(statement) =>
				`${at(PLUGIN_FILE)}:${lineOf(statement)}: ${statement.type} beside the plugin definition; move it to its own file`,
		),
	];
}

function slotRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	const sources = sourcesUnder(path.join(folder, "src"));
	const outside = sources
		.filter((file) => path.relative(folder, file) !== path.normalize(SLOTS_FILE))
		.filter((file) => callsOf(programOf(file), "slot").length > 0)
		.map((file) => `${at(path.relative(folder, file))}: slot(...) outside ${SLOTS_FILE}`);
	const slotsFile = path.join(folder, SLOTS_FILE);
	const empty =
		existsSync(slotsFile) && callsOf(programOf(slotsFile), "slot").length === 0
			? [`${at(SLOTS_FILE)}: declares no slot; delete it`]
			: [];
	return [...outside, ...empty];
}

function indexRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	const file = path.join(folder, INDEX_FILE);

	if (!existsSync(file)) {
		return [`${at(INDEX_FILE)}: missing; the plugin's entry re-exports its files`];
	}

	return programOf(file)
		.filter((statement) => !isReExport(statement))
		.map((statement) => `${at(INDEX_FILE)}:${lineOf(statement)}: ${statement.type}; the entry only re-exports`);
}

function dataRefusalsOf(folder: string, at: (relative: string) => string): readonly string[] {
	const data = path.join(folder, "data");
	const misplaced = modulePlacesUnder(folder)
		.filter((place) => path.dirname(path.dirname(place)) !== data)
		.map((place) => `${at(path.relative(folder, place))}: a module lives only in data/<module>/`);

	if (!existsSync(data)) {
		return misplaced;
	}

	const empty = readdirSync(data).length === 0 ? [`${at("data")}: holds no module; delete it`] : [];
	return [...misplaced, ...empty];
}

function modulePlacesUnder(folder: string): readonly string[] {
	return filesUnder(folder).filter((file) => path.basename(file) === "module.ts" || isDomainPackage(file));
}

function isDomainPackage(file: string): boolean {
	if (path.basename(file) !== "package.json") {
		return false;
	}

	return /"level"\s*:\s*"domain"/.test(readFileSync(file, "utf8"));
}

function filesUnder(folder: string): readonly string[] {
	return readdirSync(folder, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`));
}

function sourcesUnder(folder: string): readonly string[] {
	return existsSync(folder) ? filesUnder(folder).filter((file) => SOURCE.test(file) && !file.endsWith(".d.ts")) : [];
}

function programOf(file: string): readonly AstNode[] {
	const parsed = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx"] });
	const body: readonly unknown[] = parsed.program.body;
	return body.filter(isAstNode);
}

function isPluginDefinition(statement: AstNode): boolean {
	const declaration = nodeAt(statement, "declaration");

	if (statement.type !== "ExportNamedDeclaration" || declaration?.type !== "VariableDeclaration") {
		return false;
	}

	const declarations = declaration["declarations"];
	const [only] = Array.isArray(declarations) ? declarations : [];
	return (
		declaration["kind"] === "const" &&
		Array.isArray(declarations) &&
		declarations.length === 1 &&
		rootCalleeOf(nodeAt(only, "init")) === "plugin"
	);
}

function isReExport(statement: AstNode): boolean {
	return (
		(statement.type === "ExportAllDeclaration" || statement.type === "ExportNamedDeclaration") &&
		nodeAt(statement, "source") !== null
	);
}

function rootCalleeOf(node: AstNode | null): string | null {
	if (node === null || node.type !== "CallExpression") {
		return null;
	}

	const callee = nodeAt(node, "callee");

	if (callee?.type === "Identifier") {
		return typeof callee["name"] === "string" ? callee["name"] : null;
	}

	return callee?.type === "MemberExpression" ? rootCalleeOf(nodeAt(callee, "object")) : null;
}

function callsOf(nodes: readonly unknown[], name: string): readonly AstNode[] {
	return nodes.flatMap((node) => (isAstNode(node) ? callsIn(node, name) : []));
}

function callsIn(node: AstNode, name: string): readonly AstNode[] {
	const callee = nodeAt(node, "callee");
	const own = node.type === "CallExpression" && callee?.type === "Identifier" && callee["name"] === name ? [node] : [];
	const children = Object.values(node).flatMap((value) => (Array.isArray(value) ? value : [value]));
	return [...own, ...callsOf(children, name)];
}

function nodeAt(node: unknown, key: string): AstNode | null {
	if (!isAstNode(node)) {
		return null;
	}

	const value = node[key];
	return isAstNode(value) ? value : null;
}

function isAstNode(value: unknown): value is AstNode {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function lineOf(statement: AstNode): string {
	const loc = statement["loc"];
	const start = typeof loc === "object" && loc !== null && "start" in loc ? loc.start : null;
	return typeof start === "object" && start !== null && "line" in start ? String(start.line) : "?";
}
