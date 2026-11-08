import type { NodePath, types } from "@babel/core";
import type { ParsedScript, Resolve } from "./rename-files.js";
import type { Binding } from "./rename-nodes.js";
import { lineOf } from "./rename-nodes.js";
import type { RenamePlan } from "./rename-plan.js";

export interface UnsafeUse {
	readonly line: number;
	readonly why: string;
}

export interface UnsafeScan {
	readonly script: ParsedScript;
	readonly plan: RenamePlan;
	readonly resolve: Resolve;
	readonly contractSources: ReadonlySet<string>;
	readonly unsafeUses: UnsafeUse[];
	readonly namespaces: ReadonlyMap<Binding, readonly string[]>;
}

export interface MemberStep {
	readonly step: types.Node;
	readonly object: types.Node;
	readonly segment: string;
	readonly isGroup: boolean;
}

const COMPUTED_ACCESS = "computed member access: the name is not written out";
const DESTRUCTURED = "destructuring takes the name out of its namespace";
const ESCAPES = "the namespace leaves as a value (alias, argument, spread, cast), so its uses cannot be followed";
const JSX_MEMBER = "a JSX member expression";
const STAR_AS = "export * as re-exports the contract under a name uses cannot be followed through";
const DYNAMIC_IMPORT = "a dynamic import of the contract";
const IMPORT_TYPE = "an import() type of the contract";
const REQUIRED = "a require of the contract";
const WRAPPERS: ReadonlySet<string> = new Set([
	"TSAsExpression",
	"TSNonNullExpression",
	"TSSatisfiesExpression",
	"TSTypeAssertion",
	"ParenthesizedExpression",
]);

export function unsafeStepOf({ step, object, segment, isGroup }: MemberStep): string | null {
	const isMember = step.type === "MemberExpression" || step.type === "OptionalMemberExpression";

	if (isMember && step.object === object) {
		return step.computed ? computedAccessOf(step.property, segment) : null;
	}

	if (step.type === "TSQualifiedName" && step.left === object) {
		return null;
	}

	const pattern = patternFed(step, object);

	if (pattern !== null) {
		return patternTakes(pattern, segment) ? DESTRUCTURED : escapeOf(pattern.type === "Identifier");
	}

	return escapeOf(isGroup || WRAPPERS.has(step.type));
}

export function noteStarAs(node: types.ExportNamedDeclaration, scan: UnsafeScan, from: string | null): void {
	const isStarAs = node.specifiers.some(({ type }) => type === "ExportNamespaceSpecifier");

	if (isStarAs && from !== null && scan.contractSources.has(from)) {
		addUnsafe(scan, node, STAR_AS);
	}
}

export function noteJsxMember(member: NodePath<types.JSXMemberExpression>, scan: UnsafeScan): void {
	if (member.parent.type === "JSXMemberExpression") {
		return;
	}

	const [root = "", ...properties] = jsxNamesOf(member.node);
	const binding = member.scope.getBinding(root);
	const path = binding === undefined ? undefined : scan.namespaces.get(binding);
	const segments = [...(path ?? []), scan.plan.oldName];
	const isTarget = segments.every((segment, at) => properties[at] === segment);

	if (path !== undefined && isTarget) {
		addUnsafe(scan, member.node, JSX_MEMBER);
	}
}

export function noteDynamicImport(keyword: NodePath<types.Import>, scan: UnsafeScan): void {
	const call = keyword.parent;
	const [specifier] = call.type === "CallExpression" ? call.arguments : [];

	if (specifier?.type === "StringLiteral" && isContractSpecifier(specifier.value, scan)) {
		addUnsafe(scan, call, DYNAMIC_IMPORT);
	}
}

export function noteRequire(call: NodePath<types.CallExpression>, scan: UnsafeScan): void {
	const { callee, arguments: passed } = call.node;
	const [specifier] = passed;
	const isRequire = callee.type === "Identifier" && callee.name === "require";

	if (isRequire && specifier?.type === "StringLiteral" && isContractSpecifier(specifier.value, scan)) {
		addUnsafe(scan, call.node, REQUIRED);
	}
}

export function noteImportType(imported: NodePath<types.TSImportType>, scan: UnsafeScan): void {
	const { argument } = imported.node;
	const specifier = argument.type === "StringLiteral" ? argument.value : null;

	if (specifier !== null && isContractSpecifier(specifier, scan)) {
		addUnsafe(scan, imported.node, IMPORT_TYPE);
	}
}

export function addUnsafe(scan: UnsafeScan, node: types.Node, why: string): void {
	scan.unsafeUses.push({ line: lineOf(node), why });
}

function computedAccessOf(property: types.Node, segment: string): string | null {
	return property.type === "StringLiteral" && property.value !== segment ? null : COMPUTED_ACCESS;
}

function patternFed(step: types.Node, object: types.Node): types.Node | null {
	if (step.type === "VariableDeclarator" && step.init === object) {
		return step.id;
	}

	if ((step.type === "AssignmentExpression" || step.type === "AssignmentPattern") && step.right === object) {
		return step.left;
	}

	return null;
}

function escapeOf(isEscaping: boolean): string | null {
	return isEscaping ? ESCAPES : null;
}

function patternTakes(pattern: types.Node, segment: string): boolean {
	if (pattern.type === "ArrayPattern") {
		return true;
	}

	if (pattern.type !== "ObjectPattern") {
		return false;
	}

	return pattern.properties.some(
		(property) =>
			property.type === "RestElement" ||
			property.computed ||
			(property.key.type === "Identifier" && property.key.name === segment) ||
			(property.key.type === "StringLiteral" && property.key.value === segment),
	);
}

function jsxNamesOf(node: types.JSXMemberExpression | types.JSXIdentifier): string[] {
	if (node.type === "JSXIdentifier") {
		return [node.name];
	}

	return [...jsxNamesOf(node.object), node.property.name];
}

function isContractSpecifier(specifier: string, scan: UnsafeScan): boolean {
	const from = scan.resolve(scan.script.file, specifier);
	return from !== null && scan.contractSources.has(from);
}
