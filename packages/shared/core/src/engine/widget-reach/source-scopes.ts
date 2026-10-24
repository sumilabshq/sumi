import { childOf, childrenOf } from "./source-tree-node.js";
import type { SourceTreeNode } from "./source-tree-node.js";

export interface ScopeChain {
	readonly names: ReadonlySet<string>;
	readonly outer: ScopeChain | null;
}

export interface ScopeSpot {
	readonly node: SourceTreeNode;
	readonly parent: SourceTreeNode | null;
	readonly key: string;
}

const FUNCTIONS: ReadonlySet<string> = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"ObjectMethod",
	"ClassMethod",
	"ClassPrivateMethod",
]);
const VAR_HOLDERS: ReadonlySet<string> = new Set([...FUNCTIONS, "StaticBlock"]);
const BLOCKS: ReadonlySet<string> = new Set(["BlockStatement", "SwitchStatement", "TSModuleBlock"]);
const LOOPS: ReadonlySet<string> = new Set(["ForStatement", "ForInStatement", "ForOfStatement"]);
const NAMED_DECLARATIONS: ReadonlySet<string> = new Set([
	"FunctionDeclaration",
	"ClassDeclaration",
	"TSEnumDeclaration",
	"TSModuleDeclaration",
]);
const PATTERN_PARTS: Readonly<Record<string, readonly string[]>> = {
	ObjectPattern: ["properties"],
	ObjectProperty: ["value"],
	ArrayPattern: ["elements"],
	AssignmentPattern: ["left"],
	RestElement: ["argument"],
	TSParameterProperty: ["parameter"],
};

export function isBound(chain: ScopeChain | null, name: string): boolean {
	for (let at = chain; at !== null; at = at.outer) {
		if (at.names.has(name)) {
			return true;
		}
	}

	return false;
}

export function scopeOpenedBy(spot: ScopeSpot, outer: ScopeChain | null): ScopeChain | null {
	const names = namesDeclaredBy(spot);
	return names === null ? null : { names, outer };
}

function namesDeclaredBy({ node, parent, key }: ScopeSpot): Set<string> | null {
	if (node.type === "Program" || node.type === "StaticBlock") {
		return new Set([...namesOfStatements(childrenOf(node, "body")), ...hoistedVars(node)]);
	}

	if (FUNCTIONS.has(node.type)) {
		return new Set(namesOfFunction(node));
	}

	if (node.type === "BlockStatement" && parent !== null && FUNCTIONS.has(parent.type) && key === "body") {
		return new Set([...namesOfStatements(childrenOf(node, "body")), ...hoistedVars(node)]);
	}

	if (BLOCKS.has(node.type)) {
		return new Set(namesOfStatements(statementsOf(node)));
	}

	if (LOOPS.has(node.type)) {
		return new Set(namesOfStatements([childOf(node, "init") ?? childOf(node, "left")]));
	}

	if (node.type === "CatchClause") {
		return new Set(namesInPattern(childOf(node, "param")));
	}

	return node.type === "ClassExpression" ? new Set(namesInPattern(childOf(node, "id"))) : null;
}

function statementsOf(node: SourceTreeNode): SourceTreeNode[] {
	if (node.type !== "SwitchStatement") {
		return childrenOf(node, "body");
	}

	return childrenOf(node, "cases").flatMap((switchCase) => childrenOf(switchCase, "consequent"));
}

function namesOfFunction(node: SourceTreeNode): string[] {
	const ownName = node.type === "FunctionExpression" ? namesInPattern(childOf(node, "id")) : [];
	return [...ownName, ...childrenOf(node, "params").flatMap((param) => namesInPattern(param))];
}

function namesOfStatements(statements: readonly (SourceTreeNode | null)[]): string[] {
	return statements.flatMap((statement) => (statement === null ? [] : namesOfStatement(statement)));
}

function namesOfStatement(statement: SourceTreeNode): string[] {
	if (isTypeOnly(statement)) {
		return [];
	}

	const declared = childOf(statement, "declaration");
	if (statement.type.startsWith("Export") && declared !== null) {
		return namesOfStatement(declared);
	}

	if (statement.type === "ImportDeclaration") {
		return childrenOf(statement, "specifiers")
			.filter((specifier) => !isTypeOnly(specifier))
			.flatMap((specifier) => namesInPattern(childOf(specifier, "local")));
	}

	if (statement.type === "VariableDeclaration") {
		return childrenOf(statement, "declarations").flatMap((declarator) => namesInPattern(childOf(declarator, "id")));
	}

	return NAMED_DECLARATIONS.has(statement.type) ? namesInPattern(childOf(statement, "id")) : [];
}

function isTypeOnly(node: SourceTreeNode): boolean {
	const isGlobalBlock = node["global"] === true || node["kind"] === "global";
	return node["declare"] === true || node["importKind"] === "type" || node["exportKind"] === "type" || isGlobalBlock;
}

function namesInPattern(pattern: SourceTreeNode | null): string[] {
	if (pattern === null) {
		return [];
	}

	const name = pattern["name"];
	if (pattern.type === "Identifier" && typeof name === "string") {
		return [name];
	}

	const parts = PATTERN_PARTS[pattern.type] ?? [];
	return parts.flatMap((key) => [childOf(pattern, key), ...childrenOf(pattern, key)]).flatMap(namesInPattern);
}

function hoistedVars(root: SourceTreeNode): string[] {
	if (root.type === "VariableDeclaration" && root["kind"] === "var") {
		return namesOfStatement(root);
	}

	return Object.keys(root)
		.flatMap((key) => [childOf(root, key), ...childrenOf(root, key)])
		.filter((child): child is SourceTreeNode => child !== null && !VAR_HOLDERS.has(child.type) && !isTypeOnly(child))
		.flatMap(hoistedVars);
}
