import { traverse } from "@babel/core";
import type { NodePath, types } from "@babel/core";
import type { ParsedScript, Resolve } from "./rename-files.js";
import type { RenamePlan } from "./rename-plan.js";
import {
	addUnsafe,
	noteDynamicImport,
	noteImportType,
	noteJsxMember,
	noteRequire,
	noteStarAs,
	unsafeStepOf,
} from "./rename-unsafe-uses.js";
import type { UnsafeScan, UnsafeUse } from "./rename-unsafe-uses.js";
import { identifierSpan, isReference, lineOf, nameOf, spanOf } from "./rename-nodes.js";
import type { Binding, Span } from "./rename-nodes.js";

export interface SourceChange {
	readonly start: number;
	readonly end: number;
	readonly text: string;
	readonly line: number;
	readonly was: string;
}

export interface ScriptChanges {
	readonly file: string;
	readonly text: string;
	readonly changes: readonly SourceChange[];
	readonly clashLines: readonly number[];
	readonly stringLines: readonly number[];
	readonly unsafeUses: readonly UnsafeUse[];
}

export interface ScanContext {
	readonly resolve: Resolve;
	readonly sources: ReadonlySet<string>;
	readonly namespaceSources: ReadonlySet<string>;
	readonly isStringRewritten: boolean;
}

interface Renaming extends UnsafeScan {
	readonly context: ScanContext;
	readonly changes: Map<string, SourceChange>;
	readonly clashLines: number[];
	readonly stringLines: number[];
	readonly locals: Map<Binding, LocalRename>;
	readonly namespaces: Map<Binding, readonly string[]>;
}

interface LocalRename {
	readonly from: string;
	readonly to: string;
}

export function scriptChangesOf(script: ParsedScript, plan: RenamePlan, context: ScanContext): ScriptChanges {
	const renaming: Renaming = {
		script,
		plan,
		context,
		resolve: context.resolve,
		contractSources: new Set([...context.sources, ...context.namespaceSources]),
		changes: new Map(),
		clashLines: [],
		stringLines: [],
		unsafeUses: [],
		locals: new Map(),
		namespaces: new Map(),
	};
	traverse(script.ast, {
		Program(program) {
			bindingsIn(program, renaming);
			program.traverse({
				Identifier: (identifier) => identifierChange(identifier, renaming),
				JSXMemberExpression: (member) => noteJsxMember(member, renaming),
				StringLiteral: (literal) => stringChange(literal, renaming),
				CallExpression: (call) => {
					identityChange(call, renaming);
					noteRequire(call, renaming);
				},
				Import: (keyword) => noteDynamicImport(keyword, renaming),
				TSImportType: (imported) => noteImportType(imported, renaming),
			});
			noteShadowing(program, renaming);
			program.stop();
		},
	});
	return {
		file: script.file,
		text: script.text,
		changes: [...renaming.changes.values()].sort((one, other) => one.start - other.start),
		clashLines: renaming.clashLines,
		stringLines: renaming.stringLines,
		unsafeUses: renaming.unsafeUses,
	};
}

function bindingsIn(program: NodePath<types.Program>, renaming: Renaming): void {
	const { script, context } = renaming;

	if (context.sources.has(script.file) && !hasStarExportFromSource(program, renaming)) {
		localDeclaration(program, renaming);
	}

	for (const statement of program.get("body")) {
		if (statement.isImportDeclaration()) {
			importBindings(statement, renaming, context.resolve(script.file, statement.node.source.value));
		}

		if (statement.isExportNamedDeclaration() && statement.node.source != null) {
			const from = context.resolve(script.file, statement.node.source.value);
			reExportChanges(statement.node, renaming, from !== null && context.sources.has(from));
			noteStarAs(statement.node, renaming, from);
		}
	}
}

function localDeclaration(program: NodePath<types.Program>, renaming: Renaming): void {
	const { plan } = renaming;
	const declared = program.scope.getBinding(plan.oldName);

	if (declared !== undefined && declared.kind !== "module") {
		renaming.locals.set(declared, { from: plan.oldName, to: plan.newName });
		addChange(renaming, identifierSpan(declared.identifier, plan.oldName), plan.newName);
	}
}

function hasStarExportFromSource(program: NodePath<types.Program>, renaming: Renaming): boolean {
	const { script, context } = renaming;
	return program.node.body.some((statement) => {
		if (statement.type !== "ExportAllDeclaration") {
			return false;
		}

		const from = context.resolve(script.file, statement.source.value);
		return from !== null && from !== script.file && context.sources.has(from);
	});
}

function importBindings(statement: NodePath<types.ImportDeclaration>, renaming: Renaming, from: string | null): void {
	const { plan, context } = renaming;

	if (from === null) {
		return;
	}

	for (const specifier of statement.node.specifiers) {
		const binding = statement.scope.getBinding(specifier.local.name);

		if (binding === undefined) {
			continue;
		}

		if (specifier.type === "ImportNamespaceSpecifier") {
			namespaceImport(binding, renaming, from);
			continue;
		}

		if (specifier.type !== "ImportSpecifier") {
			continue;
		}

		const imported = nameOf(specifier.imported);

		if (plan.namespace !== null && imported === plan.namespace.constant && context.namespaceSources.has(from)) {
			renaming.namespaces.set(binding, plan.namespace.path);
		}

		if (imported === plan.oldName && context.sources.has(from)) {
			importedTargetChange(specifier, binding, renaming);
		}
	}
}

function namespaceImport(binding: Binding, renaming: Renaming, from: string): void {
	const { plan, context } = renaming;

	if (context.sources.has(from)) {
		renaming.namespaces.set(binding, []);
		return;
	}

	if (plan.namespace !== null && context.namespaceSources.has(from)) {
		renaming.namespaces.set(binding, [plan.namespace.constant, ...plan.namespace.path]);
	}
}

function importedTargetChange(specifier: types.ImportSpecifier, binding: Binding, renaming: Renaming): void {
	const { plan } = renaming;
	const local = specifier.local.name;

	if (local !== plan.oldName) {
		addChange(renaming, spanOf(specifier), `${plan.newName} as ${local}`);
		return;
	}

	renaming.locals.set(binding, { from: local, to: plan.newName });
	addChange(renaming, spanOf(specifier), plan.newName);
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
	const segments = [...path, renaming.plan.oldName];
	let reached: NodePath = identifier;

	for (const [at, segment] of segments.entries()) {
		const step = reached.parentPath;

		if (step === null) {
			return;
		}

		const unsafe = unsafeStepOf({ step: step.node, object: reached.node, segment, isGroup: at > 0 });

		if (unsafe !== null) {
			addUnsafe(renaming, step.node, unsafe);
			return;
		}

		const property = propertyNamed(step.node, reached.node, segment);

		if (property === null) {
			return;
		}

		reached = step;

		if (at === segments.length - 1) {
			addChange(renaming, spanOf(property), renaming.plan.newName);
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

	if (!renaming.context.isStringRewritten) {
		renaming.stringLines.push(lineOf(literal.node));
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

function noteShadowing(program: NodePath<types.Program>, renaming: Renaming): void {
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
