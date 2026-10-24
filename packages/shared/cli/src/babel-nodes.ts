import type { Node } from "@babel/types";

const SKIPPED_KEYS: ReadonlySet<string> = new Set([
	"loc",
	"start",
	"end",
	"extra",
	"range",
	"leadingComments",
	"trailingComments",
	"innerComments",
	"label",
]);

const FUNCTION_TYPES: ReadonlySet<string> = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"FunctionDeclaration",
	"ObjectMethod",
	"ClassMethod",
	"ClassPrivateMethod",
]);

const SIGNATURE_TYPES: ReadonlySet<string> = new Set([
	"TSFunctionType",
	"TSConstructorType",
	"TSMethodSignature",
	"TSCallSignatureDeclaration",
	"TSConstructSignatureDeclaration",
]);

export function childrenOf(node: Node, skipped: string | null): Node[] {
	return Object.entries(node)
		.filter(([key]) => !SKIPPED_KEYS.has(key) && key !== skipped)
		.flatMap(([, value]: [string, unknown]) => (Array.isArray(value) ? value : [value]))
		.filter(isNode);
}

type FunctionNode = Extract<
	Node,
	{
		readonly type:
			| "ArrowFunctionExpression"
			| "FunctionExpression"
			| "FunctionDeclaration"
			| "ObjectMethod"
			| "ClassMethod"
			| "ClassPrivateMethod";
	}
>;

type SignatureNode = Extract<
	Node,
	{
		readonly type:
			| "TSFunctionType"
			| "TSConstructorType"
			| "TSMethodSignature"
			| "TSCallSignatureDeclaration"
			| "TSConstructSignatureDeclaration";
	}
>;

export function isFunctionNode(node: Node): node is FunctionNode {
	return FUNCTION_TYPES.has(node.type);
}

export function isSignatureNode(node: Node): node is SignatureNode {
	return SIGNATURE_TYPES.has(node.type);
}

export function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}
