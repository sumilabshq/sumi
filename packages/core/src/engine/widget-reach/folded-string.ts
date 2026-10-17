import { childOf, childrenOf } from "./source-tree-node.js";
import type { SourceTreeNode } from "./source-tree-node.js";

type Folder = (node: SourceTreeNode) => string | null;

const FOLDERS: Readonly<Record<string, Folder>> = {
	StringLiteral: (node) => stringField(node, "value"),
	NumericLiteral: (node) => (typeof node["value"] === "number" ? String(node["value"]) : null),
	TemplateLiteral: foldedTemplate,
	BinaryExpression: foldedSum,
	ParenthesizedExpression: (node) => foldedChild(node, "expression"),
	TSAsExpression: (node) => foldedChild(node, "expression"),
	TSSatisfiesExpression: (node) => foldedChild(node, "expression"),
	TSNonNullExpression: (node) => foldedChild(node, "expression"),
	TSTypeAssertion: (node) => foldedChild(node, "expression"),
	CallExpression: foldedCall,
};

export function foldedString(node: SourceTreeNode | null): string | null {
	if (node === null) {
		return null;
	}

	return FOLDERS[node.type]?.(node) ?? null;
}

export function isStringBuilt(node: SourceTreeNode | null): boolean {
	if (node === null) {
		return false;
	}

	if (foldedString(node) !== null || node.type === "TemplateLiteral") {
		return true;
	}

	if (node.type === "BinaryExpression" && node["operator"] === "+") {
		return isStringBuilt(childOf(node, "left")) || isStringBuilt(childOf(node, "right"));
	}

	return node.type === "CallExpression" && calleeName(node) === "String";
}

function foldedChild(node: SourceTreeNode, key: string): string | null {
	return foldedString(childOf(node, key));
}

function foldedSum(node: SourceTreeNode): string | null {
	if (node["operator"] !== "+") {
		return null;
	}

	const left = foldedChild(node, "left");
	const right = foldedChild(node, "right");
	return left === null || right === null ? null : left + right;
}

function foldedTemplate(node: SourceTreeNode): string | null {
	const quasis = childrenOf(node, "quasis").map((quasi) => cookedOf(quasi));
	const expressions = childrenOf(node, "expressions").map((expression) => foldedString(expression));
	if ([...quasis, ...expressions].some((part) => part === null)) {
		return null;
	}

	return quasis.map((quasi, at) => `${quasi ?? ""}${expressions[at] ?? ""}`).join("");
}

function foldedCall(node: SourceTreeNode): string | null {
	const callee = childOf(node, "callee");
	if (callee === null) {
		return null;
	}

	if (isMemberNamed(callee, "fromCharCode")) {
		return foldedCharCodes(childrenOf(node, "arguments"));
	}

	if (isMemberNamed(callee, "join")) {
		return foldedJoin(childOf(callee, "object"), childrenOf(node, "arguments")[0] ?? null);
	}

	return null;
}

function foldedCharCodes(codes: readonly SourceTreeNode[]): string | null {
	const numbers = codes.map((code) => code["value"]);
	if (!numbers.every((code): code is number => typeof code === "number")) {
		return null;
	}

	return String.fromCharCode(...numbers);
}

function foldedJoin(list: SourceTreeNode | null, glue: SourceTreeNode | null): string | null {
	if (list?.type !== "ArrayExpression") {
		return null;
	}

	const parts = childrenOf(list, "elements").map((element) => foldedString(element));
	const between = glue === null ? "," : foldedString(glue);
	if (between === null || parts.some((part) => part === null)) {
		return null;
	}

	return parts.join(between);
}

function cookedOf(quasi: SourceTreeNode): string | null {
	const value = quasi["value"];
	const cooked: unknown = typeof value === "object" && value !== null ? Reflect.get(value, "cooked") : null;
	return typeof cooked === "string" ? cooked : null;
}

function isMemberNamed(node: SourceTreeNode, name: string): boolean {
	const isMember = node.type === "MemberExpression" || node.type === "OptionalMemberExpression";
	return isMember && node["computed"] !== true && stringField(childOf(node, "property"), "name") === name;
}

function calleeName(node: SourceTreeNode): string | null {
	return stringField(childOf(node, "callee"), "name");
}

function stringField(node: SourceTreeNode | null, key: string): string | null {
	const held = node?.[key];
	return typeof held === "string" ? held : null;
}
