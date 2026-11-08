import type { NodePath, types } from "@babel/core";

export type Binding = NonNullable<ReturnType<NodePath["scope"]["getBinding"]>>;

const SKIPPED_KEY_PARENTS: ReadonlySet<string> = new Set([
	"ObjectProperty",
	"ObjectMethod",
	"ClassMethod",
	"ClassProperty",
	"ClassPrivateProperty",
	"TSPropertySignature",
	"TSMethodSignature",
	"TSEnumMember",
]);
const DECLARING_PARENTS: ReadonlySet<string> = new Set([
	"ImportSpecifier",
	"ImportDefaultSpecifier",
	"ImportNamespaceSpecifier",
	"LabeledStatement",
	"BreakStatement",
	"ContinueStatement",
]);

export interface Span {
	readonly start: number;
	readonly end: number;
}

export function isReference(node: types.Identifier, parent: types.Node): boolean {
	if (DECLARING_PARENTS.has(parent.type)) {
		return false;
	}

	if (parent.type === "ObjectProperty" && parent.shorthand && parent.value === node) {
		return true;
	}

	if (parent.type === "ExportSpecifier") {
		return parent.local === node;
	}

	if ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") && !parent.computed) {
		return parent.property !== node;
	}

	if (parent.type === "TSQualifiedName") {
		return parent.right !== node;
	}

	return !(SKIPPED_KEY_PARENTS.has(parent.type) && "key" in parent && parent.key === node && !isComputed(parent));
}

export function nameOf(node: types.Identifier | types.StringLiteral): string {
	return node.type === "Identifier" ? node.name : node.value;
}

export function spanOf(node: types.Node): Span {
	return {
		start: node.start ?? 0,
		end: node.end ?? 0,
	};
}

export function identifierSpan(node: types.Node, name: string): Span {
	const start = node.start ?? 0;
	return {
		start,
		end: start + name.length,
	};
}

export function lineOf(node: types.Node): number {
	return node.loc?.start.line ?? 0;
}

function isComputed(node: types.Node): boolean {
	return "computed" in node && node.computed === true;
}
