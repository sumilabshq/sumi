import { traverse } from "@babel/core";
import type { NodePath, types } from "@babel/core";
import type { ParsedScript, Resolve } from "./rename-files.js";
import type { RenamePlan } from "./rename-plan.js";

export interface SourceChange {
	readonly start: number;
	readonly end: number;
	readonly text: string;
	readonly line: number;
	readonly was: string;
}

export interface ScriptChanges {
	readonly file: string;
	readonly changes: readonly SourceChange[];
	readonly clashLines: readonly number[];
}

type Binding = NonNullable<ReturnType<NodePath["scope"]["getBinding"]>>;

interface Renaming {
	readonly script: ParsedScript;
	readonly plan: RenamePlan;
	readonly changes: Map<string, SourceChange>;
	readonly clashLines: number[];
	readonly locals: Map<Binding, LocalRename>;
	readonly namespaces: Map<Binding, readonly string[]>;
}

interface LocalRename {
	readonly from: string;
	readonly to: string;
}

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

export function scriptChangesOf(
	script: ParsedScript,
	plan: RenamePlan,
	{ resolve, sources }: { readonly resolve: Resolve; readonly sources: ReadonlySet<string> },
): ScriptChanges {
	const renaming: Renaming = {
		script,
		plan,
		changes: new Map(),
		clashLines: [],
		locals: new Map(),
		namespaces: new Map(),
	};
	traverse(script.ast, {
		Program(program) {
			bindingsIn(program, renaming, { resolve, sources });
			program.traverse({
				Identifier: (identifier) => identifierChange(identifier, renaming),
				StringLiteral: (literal) => stringChange(literal, renaming),
				CallExpression: (call) => identityChange(call, renaming),
			});
			refuseClashes(program, renaming);
			program.stop();
		},
	});
	return {
		file: script.file,
		changes: [...renaming.changes.values()].sort((one, other) => one.start - other.start),
		clashLines: renaming.clashLines,
	};
}

function bindingsIn(
	program: NodePath<types.Program>,
	renaming: Renaming,
	{ resolve, sources }: { readonly resolve: Resolve; readonly sources: ReadonlySet<string> },
): void {
	const { plan, script } = renaming;
	const declared = sources.has(script.file) ? program.scope.getBinding(plan.oldName) : undefined;

	if (declared !== undefined && declared.kind !== "module") {
		renaming.locals.set(declared, { from: plan.oldName, to: plan.newName });
		addChange(renaming, identifierSpan(declared.identifier, plan.oldName), plan.newName);
	}

	for (const statement of program.get("body")) {
		if (statement.isImportDeclaration()) {
			importBindings(statement, renaming, resolve(script.file, statement.node.source.value), sources);
		}

		if (statement.isExportNamedDeclaration() && statement.node.source != null) {
			const from = resolve(script.file, statement.node.source.value);
			reExportChanges(statement.node, renaming, from !== null && sources.has(from));
		}
	}
}

function importBindings(
	statement: NodePath<types.ImportDeclaration>,
	renaming: Renaming,
	from: string | null,
	sources: ReadonlySet<string>,
): void {
	const { plan } = renaming;

	if (from === null) {
		return;
	}

	for (const specifier of statement.node.specifiers) {
		const binding = statement.scope.getBinding(specifier.local.name);

		if (binding === undefined) {
			continue;
		}

		if (specifier.type === "ImportNamespaceSpecifier" && sources.has(from)) {
			renaming.namespaces.set(binding, []);
			continue;
		}

		if (specifier.type !== "ImportSpecifier") {
			continue;
		}

		const imported = nameOf(specifier.imported);

		if (plan.namespace !== null && imported === plan.namespace.constant && plan.namespace.sources.has(from)) {
			renaming.namespaces.set(binding, plan.namespace.path);
		}

		if (imported !== plan.oldName || !sources.has(from)) {
			continue;
		}

		const local = specifier.local.name;
		const isLocalRenamed = local === plan.oldName;

		if (isLocalRenamed) {
			renaming.locals.set(binding, { from: local, to: plan.newName });
		}

		const newLocal = isLocalRenamed ? plan.newName : local;
		addChange(renaming, spanOf(specifier), newLocal === plan.newName ? plan.newName : `${plan.newName} as ${newLocal}`);
	}
}

function reExportChanges(node: types.ExportNamedDeclaration, renaming: Renaming, isFromSource: boolean): void {
	const { plan } = renaming;

	if (!isFromSource) {
		return;
	}

	for (const specifier of node.specifiers) {
		if (specifier.type !== "ExportSpecifier" || specifier.local.name !== plan.oldName) {
			continue;
		}

		const exported = nameOf(specifier.exported);
		addChange(renaming, spanOf(specifier), exported === plan.oldName ? plan.newName : `${plan.newName} as ${exported}`);
	}
}

function identifierChange(identifier: NodePath<types.Identifier>, renaming: Renaming): void {
	const { node, parent } = identifier;
	const binding = identifier.scope.getBinding(node.name);

	if (binding === undefined || node === binding.identifier || !isReference(node, parent)) {
		return;
	}

	const local = renaming.locals.get(binding);

	if (local !== undefined) {
		localChange(identifier, renaming, local);
		return;
	}

	const path = renaming.namespaces.get(binding);

	if (path !== undefined) {
		memberChange(identifier, renaming, path);
	}
}

function localChange(identifier: NodePath<types.Identifier>, renaming: Renaming, { from, to }: LocalRename): void {
	const { node, parent } = identifier;

	if (identifier.scope.getBinding(to) !== undefined) {
		renaming.clashLines.push(lineOf(node));
	}

	if (parent.type === "ObjectProperty" && parent.shorthand && parent.value === node) {
		addChange(renaming, spanOf(parent), `${from}: ${to}`);
		return;
	}

	if (parent.type === "ExportSpecifier" && parent.local === node) {
		const exported = nameOf(parent.exported);
		addChange(renaming, spanOf(parent), exported === from ? to : `${to} as ${exported}`);
		return;
	}

	addChange(renaming, identifierSpan(node, from), to);
}

function memberChange(identifier: NodePath<types.Identifier>, renaming: Renaming, path: readonly string[]): void {
	const { plan } = renaming;
	const segments = [...path, plan.oldName];
	let reached: NodePath = identifier;

	for (const [at, segment] of segments.entries()) {
		const step = reached.parentPath;
		const property = step === null ? null : propertyNamed(step.node, reached.node, segment);

		if (step === null || property === null) {
			return;
		}

		reached = step;

		if (at === segments.length - 1) {
			addChange(renaming, spanOf(property), plan.newName);
		}
	}
}

function propertyNamed(step: types.Node, object: types.Node, name: string): types.Identifier | null {
	const isMember = step.type === "MemberExpression" || step.type === "OptionalMemberExpression";

	if (isMember && step.object === object && !step.computed && step.property.type === "Identifier") {
		return step.property.name === name ? step.property : null;
	}

	if (step.type === "TSQualifiedName" && step.left === object) {
		return step.right.name === name ? step.right : null;
	}

	return null;
}

function stringChange(literal: NodePath<types.StringLiteral>, renaming: Renaming): void {
	const renamed = renaming.plan.strings.get(literal.node.value);

	if (renamed === undefined || literal.parentPath.isImportDeclaration() || literal.parentPath.isExportDeclaration()) {
		return;
	}

	const { start, end } = spanOf(literal.node);
	addChange(renaming, { start: start + 1, end: end - 1 }, renamed);
}

function identityChange(call: NodePath<types.CallExpression>, renaming: Renaming): void {
	const { identity } = renaming.plan;
	const { callee, arguments: passed } = call.node;
	const [id] = passed;

	if (identity === null || identity.file !== renaming.script.file || callee.type !== "Identifier") {
		return;
	}

	if (callee.name !== identity.method || id?.type !== "StringLiteral" || id.value !== identity.from) {
		return;
	}

	const { start, end } = spanOf(id);
	addChange(renaming, { start: start + 1, end: end - 1 }, identity.to);
}

function refuseClashes(program: NodePath<types.Program>, renaming: Renaming): void {
	for (const [binding, { to }] of renaming.locals) {
		const shadowing = binding.scope.getBinding(to);

		if (shadowing !== undefined) {
			renaming.clashLines.push(lineOf(shadowing.identifier));
		}

		const global = program.scope.globals[to];

		if (global !== undefined) {
			renaming.clashLines.push(lineOf(global));
		}
	}
}

function isReference(node: types.Identifier, parent: types.Node): boolean {
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

function isComputed(node: types.Node): boolean {
	return "computed" in node && node.computed === true;
}

function nameOf(node: types.Identifier | types.StringLiteral): string {
	return node.type === "Identifier" ? node.name : node.value;
}

function addChange(renaming: Renaming, { start, end }: Span, text: string): void {
	const { script } = renaming;
	renaming.changes.set(`${start}:${end}`, {
		start,
		end,
		text,
		line: script.text.slice(0, start).split("\n").length,
		was: script.text.slice(start, end),
	});
}

interface Span {
	readonly start: number;
	readonly end: number;
}

function spanOf(node: types.Node): Span {
	return {
		start: node.start ?? 0,
		end: node.end ?? 0,
	};
}

function identifierSpan(node: types.Node, name: string): Span {
	const start = node.start ?? 0;
	return {
		start,
		end: start + name.length,
	};
}

function lineOf(node: types.Node): number {
	return node.loc?.start.line ?? 0;
}
