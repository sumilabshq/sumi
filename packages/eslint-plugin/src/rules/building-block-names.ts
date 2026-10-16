import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { builderTracker, chainCallsOf } from "../builders.js";
import type { Builder, BuilderCall } from "../builders.js";

const SUFFIX: Readonly<Record<Exclude<Builder, "handler">, string>> = {
	query: "Query",
	command: "Command",
	guard: "Guard",
	middleware: "Middleware",
	serverModule: "ServerModule",
	clientModule: "ClientModule",
};
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const REQUEST_NAME = /(Command|Query)$/;

export const buildingBlockNames: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: { description: "a building block is a named exported const whose name says its kind" },
		schema: [],
		messages: {
			unnamed: "a {{builder}}(...) building block is a named exported const: export const <Name> = {{builder}}(...)",
			notPascal: "{{name}} is a building block: name it in PascalCase",
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
	if (!PASCAL_CASE.test(name)) return context.report({ node: call, messageId: "notPascal", data: { name } });
	if (builder === "handler") return checkHandlerName(context, call, name);
	const suffix = SUFFIX[builder];
	if (!name.endsWith(suffix)) context.report({ node: call, messageId: "wrongSuffix", data: { name, builder, suffix } });
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
