import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import type { Node } from "@babel/types";
import { PLATFORMS } from "../../../packages/core/src/mediator/platform.ts";
import { walk } from "../ast.mts";
import { findingAt, findingOnLine, type Finding } from "../finding.mts";
import type { ParsedSource } from "../source.mts";

export const id = "domain-layout";

interface DomainFile {
	readonly domain: string;
	readonly folder: string;
	readonly inside: readonly string[];
}

interface RelativeImport {
	readonly node: Node;
	readonly specifier: string;
	readonly target: string;
}

const IN_PACKAGE = /^packages\/([^/]+)\/(.+)$/;
const CONTRACT_FILE = /^[a-z0-9-]+\.(query|command)\.ts$/;
const REQUEST_SUFFIX = /(Query|Command)$/;
const PLATFORM_PART = /^(packages\/[^/]+\/adapters\/[^/]+\/([^/]+)\/)/;
const SCRIPT_EXTENSION = /\.[jt]sx?$/;
const NEVER_REACHING_SERVER = new Set(["client", "ui", "lib"]);
const DOMAINS = new Map<string, boolean>();

const NOT_A_CONTRACT =
	"requests/ holds only <name>.query.ts and <name>.command.ts; move {file} to lib/ (a helper) or client/<feature>/ (a handler)";
const HANDLER_IN_CONTRACT =
	"a handler lives in client/<feature>/<name>.handler.ts or server/<feature>/, never in requests/: move {name} there";
const REACHES_SERVER =
	"{folder}/ never imports server/ code: send a .onServer() request instead of importing {specifier}";
const NOT_TSX = "ui/ holds only .tsx blocks and layouts; move {file} to lib/";
const NOT_AN_ADAPTER =
	"adapters/<what>/ holds only .adapter.ts files at its top; an implementation's parts go in its own folder, adapters/<what>/<platform>/";
const NOT_A_PLATFORM_FOLDER =
	"adapters/<what>/{folder}/ is not named for a platform; a folder under adapters/<what>/ holds one platform's parts: {platforms}";
const NO_PLATFORM_ENTRY = "adapters/<what>/{folder}/ has no {folder}.adapter.ts, the one file outside it may import";
const PLATFORM_PART_REACHED =
	"{specifier} is a part of a platform's adapter; import its {platform}.adapter.ts instead, the folder's one entry";
const WRONG_NAME =
	'request {constant} is named "{name}"; name it "{wanted}": <module>/<the constant without its suffix, in kebab case>';

export function check(source: ParsedSource): Finding[] {
	const file = domainFileOf(source.path);
	if (file === null) return [];
	const imports = relativeImportsOf(source);
	return [
		...placementFindings(source, file),
		...platformPartImports(source.path, imports),
		...serverImports(file, imports),
	];
}

function placementFindings(source: ParsedSource, file: DomainFile): Finding[] {
	const fileName = file.inside[file.inside.length - 1] ?? "";
	if (file.folder === "ui" && !fileName.endsWith(".tsx"))
		return [findingOnLine(id, "error", 1, NOT_TSX.replace("{file}", fileName))];
	if (file.folder === "adapters") return adapterPlacement(file, fileName);
	if (file.folder !== "requests") return [];
	if (file.inside.length !== 2 || !CONTRACT_FILE.test(fileName))
		return [findingOnLine(id, "error", 1, NOT_A_CONTRACT.replace("{file}", fileName))];
	return [...handlersIn(source), ...requestNames(source, file.domain)];
}

function adapterPlacement(file: DomainFile, fileName: string): Finding[] {
	if (file.inside.length === 3)
		return fileName.endsWith(".adapter.ts") ? [] : [findingOnLine(id, "error", 1, NOT_AN_ADAPTER)];
	const [, what = "", folder = ""] = file.inside;
	if (file.inside.length < 4) return [];
	if (!PLATFORMS.some((platform) => platform === folder)) {
		const said = NOT_A_PLATFORM_FOLDER.replace("{folder}", folder).replace("{platforms}", PLATFORMS.join(", "));
		return [findingOnLine(id, "error", 1, said)];
	}
	if (existsSync(`packages/${file.domain}/adapters/${what}/${folder}/${folder}.adapter.ts`)) return [];
	return [findingOnLine(id, "error", 1, NO_PLATFORM_ENTRY.replaceAll("{folder}", folder))];
}

function relativeImportsOf(source: ParsedSource): RelativeImport[] {
	const found: RelativeImport[] = [];
	walk(source.ast.program, (node) => {
		const specifier = specifierOf(node);
		if (specifier === null || !specifier.startsWith(".")) return;
		found.push({ node, specifier, target: posix.normalize(posix.join(posix.dirname(source.path), specifier)) });
	});
	return found;
}

function specifierOf(node: Node): string | null {
	if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") return node.source.value;
	if (node.type === "ExportNamedDeclaration") return node.source?.value ?? null;
	return dynamicSpecifierOf(node);
}

function dynamicSpecifierOf(node: Node): string | null {
	if (node.type === "ImportExpression") return stringIn(node.source);
	if (node.type !== "CallExpression" || node.callee.type !== "Import") return null;
	return stringIn(node.arguments[0] ?? null);
}

function stringIn(node: Node | null): string | null {
	return node?.type === "StringLiteral" ? node.value : null;
}

function platformPartImports(importer: string, imports: readonly RelativeImport[]): Finding[] {
	return imports.flatMap(({ node, specifier, target }) => {
		const [, folder = "", platform = ""] = PLATFORM_PART.exec(target) ?? [];
		if (folder === "" || importer.startsWith(folder)) return [];
		if (posix.basename(target).replace(SCRIPT_EXTENSION, "") === `${platform}.adapter`) return [];
		const said = PLATFORM_PART_REACHED.replace("{specifier}", specifier).replace("{platform}", platform);
		return [findingAt(id, "error", node, said)];
	});
}

function domainFileOf(path: string): DomainFile | null {
	const match = IN_PACKAGE.exec(path);
	if (!match) return null;
	const [, domain = "", rest = ""] = match;
	if (!isDomain(domain)) return null;
	const inside = rest.split("/");
	return { domain, folder: inside[0] ?? "", inside };
}

function isDomain(name: string): boolean {
	const known = DOMAINS.get(name);
	if (known !== undefined) return known;
	const manifest = `packages/${name}/package.json`;
	const parsed: unknown = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : null;
	const marks: unknown = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "widgetarium") : null;
	const isOne = typeof marks === "object" && marks !== null && Reflect.get(marks, "level") === "domain";
	DOMAINS.set(name, isOne);
	return isOne;
}

function serverImports(file: DomainFile, imports: readonly RelativeImport[]): Finding[] {
	if (!NEVER_REACHING_SERVER.has(file.folder)) return [];
	const serverFolder = `packages/${file.domain}/server/`;
	return imports
		.filter(({ target }) => `${target}/`.startsWith(serverFolder))
		.map(({ node, specifier }) =>
			findingAt(id, "error", node, REACHES_SERVER.replace("{folder}", file.folder).replace("{specifier}", specifier)),
		);
}

function handlersIn(source: ParsedSource): Finding[] {
	const findings: Finding[] = [];
	walk(source.ast.program, (node) => {
		if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression") return;
		const parent = node.superClass;
		if (parent?.type !== "CallExpression" || parent.callee.type !== "Identifier" || parent.callee.name !== "handlerOf")
			return;
		findings.push(findingAt(id, "error", node, HANDLER_IN_CONTRACT.replace("{name}", node.id?.name ?? "the class")));
	});
	return findings;
}

function requestNames(source: ParsedSource, domain: string): Finding[] {
	const findings: Finding[] = [];
	walk(source.ast.program, (node) => {
		if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier" || !REQUEST_SUFFIX.test(node.id.name))
			return;
		const named = requestNameIn(node.init ?? null);
		if (named === null) return;
		const wanted = `${domain}/${kebabOf(node.id.name.replace(REQUEST_SUFFIX, ""))}`;
		if (named === wanted) return;
		const said = WRONG_NAME.replace("{constant}", node.id.name).replace("{name}", named).replace("{wanted}", wanted);
		findings.push(findingAt(id, "error", node, said));
	});
	return findings;
}

function requestNameIn(node: Node | null): string | null {
	if (node === null || node.type !== "CallExpression") return null;
	const { callee } = node;
	const [first] = node.arguments;
	if (callee.type === "Identifier" && (callee.name === "query" || callee.name === "command"))
		return first?.type === "StringLiteral" ? first.value : null;
	return callee.type === "MemberExpression" ? requestNameIn(callee.object) : null;
}

function kebabOf(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
