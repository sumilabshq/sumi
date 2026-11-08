import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { builderTracker, chainCallsOf } from "../builders.js";
import type { BuilderCall } from "../builders.js";

const NAMED_BY_STRING: ReadonlySet<string> = new Set(["serverModule", "clientModule", "module", "plugin"]);
const STEPS_TAKING_FREE_TEXT: ReadonlySet<string> = new Set(["metadata"]);

export const noChoiceStrings: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"a builder chain takes no string choices or names; only module() and plugin() take their name as a string",
		},
		schema: [],
		messages: {
			choiceString:
				'a string in a builder chain is free-form data only: a request, event, subscriber or slot is named by its constant, only module("…") and plugin("…") take a name, and a choice is the framework\'s value (PerCall, minutes(5), a guard), never a string',
		},
	},
	create(context) {
		return builderTracker((found) => checkStrings(context, found));
	},
};

function checkStrings(context: Rule.RuleContext, { builder, call }: BuilderCall): void {
	for (const chained of chainCallsOf(call)) {
		if (takesFreeText(chained)) {
			continue;
		}

		const named = chained === call && NAMED_BY_STRING.has(builder) ? 1 : 0;
		for (const argument of chained.arguments.slice(named))
			for (const found of stringsIn(argument)) context.report({ node: found, messageId: "choiceString" });
	}
}

function takesFreeText({ callee }: ESTree.CallExpression): boolean {
	return (
		callee.type === "MemberExpression" &&
		callee.property.type === "Identifier" &&
		STEPS_TAKING_FREE_TEXT.has(callee.property.name)
	);
}

function stringsIn(node: ESTree.Node): ESTree.Node[] {
	if (node.type === "Literal") return typeof node.value === "string" ? [node] : [];
	if (node.type === "TemplateLiteral") return [node];
	if (node.type === "ArrayExpression") return node.elements.flatMap((element) => (element ? stringsIn(element) : []));
	if (node.type !== "ObjectExpression") return [];
	return node.properties.flatMap((property) => (property.type === "Property" ? stringsIn(property.value) : []));
}
