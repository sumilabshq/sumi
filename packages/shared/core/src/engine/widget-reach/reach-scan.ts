import { foldedString } from "./folded-string.js";
import { callFindings } from "./reach-calls.js";
import { refusalAt, saidReachFinding, warningAt } from "./reach-finding.js";
import { REFUSED_GLOBALS, REFUSED_PROPERTIES } from "./reach-names.js";
import { isBound } from "./source-scopes.js";
import { walkSourceTree } from "./source-tree.js";
import { childOf, childrenOf, lineOf, parsedProgram } from "./source-tree-node.js";
import type { Found, ReachFinding } from "./reach-finding.js";
import type { Visited } from "./source-tree.js";
import type { SourceTreeNode } from "./source-tree-node.js";

export type { ReachFinding, ReachRule } from "./reach-finding.js";
export { saidReachFinding } from "./reach-finding.js";

export const REACH_SCAN_VERSION = 2;

const MINIFIED_LINE_CHARS = 2000;
const OBFUSCATED_NAME = /^_0x[0-9a-f]{3,}$/i;
const MEMBERS: ReadonlySet<string> = new Set(["MemberExpression", "OptionalMemberExpression", "JSXMemberExpression"]);
const CALLS: ReadonlySet<string> = new Set(["CallExpression", "OptionalCallExpression", "NewExpression"]);
const KEY_HOLDERS: ReadonlySet<string> = new Set([
	"ObjectProperty",
	"ObjectMethod",
	"ClassProperty",
	"ClassMethod",
	"ClassPrivateProperty",
	"ClassAccessorProperty",
	"TSPropertySignature",
	"TSMethodSignature",
]);
const NAMES_NOT_READ: Readonly<Record<string, readonly string[]>> = {
	ImportSpecifier: ["imported"],
	ExportSpecifier: ["exported"],
	ExportNamespaceSpecifier: ["exported"],
	MetaProperty: ["meta", "property"],
	LabeledStatement: ["label"],
	BreakStatement: ["label"],
	ContinueStatement: ["label"],
	TSEnumMember: ["id"],
	PrivateName: ["id"],
};

export function reachFindingsOfFolder(
	files: Readonly<Record<string, string>>,
	modules: readonly string[],
): ReachFinding[] {
	return modules.flatMap((name) => reachFindingsIn(files[name] ?? "", name));
}

export function reachFindingsIn(source: string, file: string): ReachFinding[] {
	const program = parsedProgram(source);
	const found: Found[] =
		program === null
			? [refusalAt({ line: 0, token: "source", rule: "unreadable", kind: null })]
			: [...treeFindings(program), ...minifiedFindings(source)];
	return found.map((one) => ({ file, ...one }));
}

export function reachRefusal(findings: readonly ReachFinding[], folder: string): string | null {
	const refusedFindings = findings.filter((one) => one.isRefused);
	if (refusedFindings.length === 0) {
		return null;
	}

	return `${folder} reaches past its ports, so it is not run:\n${refusedFindings.map(saidReachFinding).join("\n")}`;
}

function treeFindings(program: SourceTreeNode): Found[] {
	const found: Found[] = [];
	walkSourceTree(program, (visited) => {
		found.push(...findingsAt(visited));
	});
	const firstObfuscated = found.find((one) => !one.isRefused);
	const refused = found.filter((one) => one.isRefused).sort((one, other) => one.line - other.line);
	return firstObfuscated === undefined ? refused : [...refused, firstObfuscated];
}

function findingsAt(visited: Visited): Found[] {
	const { node } = visited;
	if (node.type === "Identifier" || node.type === "JSXIdentifier") {
		return identifierFindings(visited);
	}

	if (MEMBERS.has(node.type)) {
		return propertyFindings(node, memberKeyOf(node));
	}

	if (node.type === "ObjectPattern") {
		return childrenOf(node, "properties").flatMap((property) => propertyFindings(property, patternKeyOf(property)));
	}

	if (CALLS.has(node.type)) {
		return callFindings(node);
	}

	return node.type === "ImportExpression" || node.type === "Import"
		? [refusalAt({ line: lineOf(node), token: "import()", rule: "dynamic-import", kind: null })]
		: [];
}

function identifierFindings({ node, parent, key, scope }: Visited): Found[] {
	const name = node["name"];
	if (typeof name !== "string") {
		return [];
	}

	if (OBFUSCATED_NAME.test(name)) {
		return [warningAt(name, lineOf(node))];
	}

	const kind = REFUSED_GLOBALS.get(name);
	if (kind === undefined || !isReadAsValue(node, parent, key) || isBound(scope, name)) {
		return [];
	}

	return [refusalAt({ line: lineOf(node), token: name, rule: "global", kind })];
}

function isReadAsValue(node: SourceTreeNode, parent: SourceTreeNode | null, key: string): boolean {
	if (parent === null) {
		return true;
	}

	if ((MEMBERS.has(parent.type) && key === "property") || (KEY_HOLDERS.has(parent.type) && key === "key")) {
		return parent["computed"] === true;
	}

	if (node.type === "JSXIdentifier") {
		return key === "object";
	}

	return !(NAMES_NOT_READ[parent.type] ?? []).includes(key);
}

function propertyFindings(node: SourceTreeNode, name: string | null): Found[] {
	const kind = name === null ? undefined : REFUSED_PROPERTIES.get(name);
	if (name === null || kind === undefined) {
		return [];
	}

	return [refusalAt({ line: lineOf(node), token: `.${name}`, rule: "property", kind })];
}

function memberKeyOf(node: SourceTreeNode): string | null {
	const property = childOf(node, "property");
	if (node["computed"] === true) {
		return foldedString(property);
	}

	const name = property?.["name"];
	return property?.type === "PrivateName" || typeof name !== "string" ? null : name;
}

function patternKeyOf(property: SourceTreeNode): string | null {
	if (property.type !== "ObjectProperty") {
		return null;
	}

	return memberKeyOf({ ...property, property: property["key"] });
}

function minifiedFindings(source: string): Found[] {
	const longLine = source.split("\n").findIndex((line) => line.length > MINIFIED_LINE_CHARS);
	return longLine === -1 ? [] : [warningAt(`a line of ${MINIFIED_LINE_CHARS}+ characters`, longLine + 1)];
}
