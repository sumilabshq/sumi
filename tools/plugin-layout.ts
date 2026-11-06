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
const SOURCE = /\.(ts|tsx)$/;

export function layoutRefusalsOf(pluginsRoot: string): readonly string[] {
	return readdirSync(pluginsRoot)
		.filter((name) => statSync(path.join(pluginsRoot, name)).isDirectory())
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
		...dataRefusalsOf(folder, at),
	];
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
