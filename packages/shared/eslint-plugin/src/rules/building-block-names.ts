import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { builderTracker, chainCallsOf } from "../builders.js";
import type { Builder, BuilderCall } from "../builders.js";

type SuffixedBuilder = "guard" | "middleware" | "serverModule" | "clientModule";

const SUFFIX: Readonly<Record<SuffixedBuilder, string>> = {
	guard: "Guard",
	middleware: "Middleware",
	serverModule: "ServerModule",
	clientModule: "ClientModule",
};
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_NAME = /^[a-z]+([A-Z][a-z]*)*$/;
const KIND_SUFFIX = /(Query|Command|Event|Subscriber|Module|Plugin|Slot)$/;
const REQUEST_NAME = /(Command|Query)$/;

export const buildingBlockNames: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: { description: "a building block is a named exported const whose name says its kind" },
		schema: [],
		messages: {
			unnamed: "a {{builder}}(...) building block is a named exported const: export const <Name> = {{builder}}(...)",
			notPascal: "{{name}} is a building block: name it in PascalCase",
			notCamel:
				"{{name}} is built by {{builder}}(), which names it by this constant: name it in camelCase of letters, such as frameSides",
			kindSuffix:
				"{{name}} is built by {{builder}}(), which names it by this constant: drop the kind suffix, the builder already says it",
			wrongSuffix: "{{name}} is built by {{builder}}(...): its name ends with {{suffix}}",
			wrongHandler: "a handler of {{request}} is named {{wanted}}",
			notRequest: "handler(...) takes a request named *Command or *Query, not {{request}}",
		},
	},
	create(context) {
		return builderTracker((found) => checkName(context, found));
	},
};

function checkName(context: Rule.RuleContext, { builder, call }: BuilderCall): void {
	const top = chainCallsOf(call).at(-1) ?? call;
	const name = exportedConstNameOf(top);
	if (name === null) return context.report({ node: call, messageId: "unnamed", data: { builder } });
	if (!isSuffixed(builder) && builder !== "handler") return checkCamelName(context, { builder, call }, name);
	if (!PASCAL_CASE.test(name)) return context.report({ node: call, messageId: "notPascal", data: { name } });
	if (builder === "handler") return checkHandlerName(context, call, name);
	const suffix = SUFFIX[builder];
	if (!name.endsWith(suffix)) context.report({ node: call, messageId: "wrongSuffix", data: { name, builder, suffix } });
}

function isSuffixed(builder: Builder): builder is SuffixedBuilder {
	return builder in SUFFIX;
}

function checkCamelName(context: Rule.RuleContext, { builder, call }: BuilderCall, name: string): void {
	if (!CAMEL_NAME.test(name)) {
		return context.report({ node: call, messageId: "notCamel", data: { name, builder } });
	}

	if (KIND_SUFFIX.test(name)) {
		context.report({ node: call, messageId: "kindSuffix", data: { name, builder } });
	}
}

function checkHandlerName(context: Rule.RuleContext, call: ESTree.CallExpression, name: string): void {
	const [request] = call.arguments;
	const requestName = request?.type === "Identifier" ? request.name : "";
	if (!REQUEST_NAME.test(requestName))
		return context.report({ node: call, messageId: "notRequest", data: { request: requestName || "an expression" } });
	const wanted = `${requestName}Handler`;
	if (name !== wanted)
		context.report({ node: call, messageId: "wrongHandler", data: { request: requestName, wanted } });
}

function exportedConstNameOf(top: Rule.Node): string | null {
	const declarator = top.parent;
	if (declarator?.type !== "VariableDeclarator" || declarator.init !== top) return null;
	return declarator.id.type === "Identifier" && isExportedConst(declarator) ? declarator.id.name : null;
}

function isExportedConst(declarator: Rule.Node): boolean {
	const declaration = declarator.parent;
	if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return false;
	return declaration.parent?.type === "ExportNamedDeclaration";
}
