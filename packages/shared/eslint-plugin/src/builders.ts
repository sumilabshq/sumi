import type { Rule } from "eslint";
import type * as ESTree from "estree";

export type Builder =
	| "query"
	| "command"
	| "event"
	| "subscriber"
	| "guard"
	| "middleware"
	| "serverModule"
	| "clientModule"
	| "module"
	| "handler";

export interface BuilderCall {
	readonly builder: Builder;
	readonly call: ChainCall;
}

const BUILDERS: ReadonlySet<string> = new Set([
	"query",
	"command",
	"event",
	"subscriber",
	"guard",
	"middleware",
	"serverModule",
	"clientModule",
	"module",
	"handler",
]);
const FRAMEWORK_SOURCE = /^@widgetarium\/data-framework$|\/data-framework\/src\/index(\.[jt]s)?$/;

export function builderTracker(onBuilder: (found: BuilderCall) => void): Rule.RuleListener {
	const builders = new Map<string, Builder>();
	return {
		ImportDeclaration: (node) => trackImport(builders, node),
		CallExpression(node) {
			const builder = node.callee.type === "Identifier" ? builders.get(node.callee.name) : undefined;
			if (builder !== undefined) onBuilder({ builder, call: node });
		},
	};
}

export type ChainCall = ESTree.CallExpression & Rule.NodeParentExtension;

export function chainCallsOf(call: ChainCall): ChainCall[] {
	const calls = [call];
	let at: Rule.Node = call;
	for (let member = at.parent; member?.type === "MemberExpression" && member.object === at; member = at.parent) {
		const chained = member.parent;
		if (chained?.type !== "CallExpression" || chained.callee !== member) break;
		calls.push(chained);
		at = chained;
	}
	return calls;
}

function trackImport(builders: Map<string, Builder>, node: ESTree.ImportDeclaration): void {
	if (typeof node.source.value !== "string" || !FRAMEWORK_SOURCE.test(node.source.value)) return;
	for (const specifier of node.specifiers) {
		const imported = specifier.type === "ImportSpecifier" ? nameOf(specifier.imported) : "";
		if (isBuilder(imported)) builders.set(specifier.local.name, imported);
	}
}

function isBuilder(name: string): name is Builder {
	return BUILDERS.has(name);
}

function nameOf(node: ESTree.Identifier | ESTree.Literal): string {
	return node.type === "Identifier" ? node.name : String(node.value);
}
