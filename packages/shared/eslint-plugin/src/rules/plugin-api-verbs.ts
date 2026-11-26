import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { builderTracker, chainCallsOf } from "../builders.js";
import type { ChainCall } from "../builders.js";
import { OLDER_PLUGIN_API_KEYS } from "../older-plugin-api-keys.js";

type Fn = ESTree.FunctionExpression | ESTree.ArrowFunctionExpression;

const VERBS: ReadonlySet<string> = new Set([
	"add",
	"remove",
	"set",
	"open",
	"close",
	"register",
	"use",
	"show",
	"hide",
	"replace",
	"provide",
	"create",
	"update",
	"delete",
	"toggle",
	"start",
	"stop",
	"draw",
	"track",
	"watch",
	"on",
]);
const LEADING_WORD = /^[a-z]+/;

export const pluginApiVerbs: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: { description: "a plugin's API is verb phrases: addRunner, never a noun or a getter" },
		schema: [],
		messages: {
			notVerb: '{{plugin}} API key "{{key}}" is not a verb phrase: start it with a verb (addRunner, openPage)',
			getter:
				'{{plugin}} API key "{{key}}" is a getter: reading goes through the plugin\'s module, an API has no getters',
		},
	},
	create(context) {
		return builderTracker(({ builder, call }) => {
			if (builder !== "plugin") return;
			const callback = chainCallsOf(call).find(isApplyCall)?.arguments[0];
			if (callback === undefined || !isFn(callback)) return;
			const plugin = pluginNameOf(call);
			for (const api of returnedObjectsOf(callback)) checkKeys(context, plugin, [], api);
		});
	},
};

function checkKeys(
	context: Rule.RuleContext,
	plugin: string,
	path: readonly string[],
	api: ESTree.ObjectExpression,
): void {
	for (const member of api.properties) {
		if (member.type !== "Property") continue;
		const key = keyNameOf(member);
		if (key === null) continue;
		if (member.value.type === "ObjectExpression") {
			checkKeys(context, plugin, [...path, key], member.value);
			continue;
		}

		const full = [...path, key].join(".");
		const word = LEADING_WORD.exec(key)?.[0] ?? "";
		if (VERBS.has(word) || OLDER_PLUGIN_API_KEYS.has(`${plugin}#${full}`)) continue;
		context.report({ node: member.key, messageId: word === "get" ? "getter" : "notVerb", data: { plugin, key: full } });
	}
}

function isApplyCall(call: ChainCall): boolean {
	return (
		call.callee.type === "MemberExpression" &&
		call.callee.property.type === "Identifier" &&
		call.callee.property.name === "apply"
	);
}

function isFn(node: ESTree.Node): node is Fn {
	return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";
}

function pluginNameOf(call: ChainCall): string {
	const [id] = call.arguments;
	if (id?.type === "Literal" && typeof id.value === "string") return id.value;
	const declarator = call.parent;
	return declarator.type === "VariableDeclarator" && declarator.id.type === "Identifier"
		? declarator.id.name
		: "plugin";
}

function keyNameOf(member: ESTree.Property): string | null {
	if (member.computed) return null;
	if (member.key.type === "Identifier") return member.key.name;
	return member.key.type === "Literal" ? String(member.key.value) : null;
}

function returnedObjectsOf(callback: Fn): ESTree.ObjectExpression[] {
	if (callback.body.type !== "BlockStatement") return objectOf(callback.body, []);
	const statements = callback.body.body;
	return statements.flatMap((statement) =>
		statement.type === "ReturnStatement" && statement.argument ? objectOf(statement.argument, statements) : [],
	);
}

function objectOf(node: ESTree.Node, scope: readonly ESTree.Statement[]): ESTree.ObjectExpression[] {
	if (node.type === "ObjectExpression") return [node];
	if (node.type !== "Identifier") return [];
	const declared = scope
		.flatMap((statement) => (statement.type === "VariableDeclaration" ? statement.declarations : []))
		.find((declarator) => declarator.id.type === "Identifier" && declarator.id.name === node.name);
	return declared?.init?.type === "ObjectExpression" ? [declared.init] : [];
}
