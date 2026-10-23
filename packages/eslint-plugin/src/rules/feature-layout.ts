import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { CONTRACT_FILE, FEATURES, REQUESTS_FILE, domainFileOf, featureFolderOf } from "../domain-file.js";
import type { DomainFile } from "../domain-file.js";
import { importListener } from "../imports.js";
import { placementOf } from "./feature-placement.js";

const REQUEST_SUFFIX = /(Query|Command)$/;

export const featureLayout: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a module is laid out as module.ts, features/, shared/, gateways/ and generated/" },
		schema: [],
		messages: {
			misplaced: "{{said}}",
			handlerInContract:
				"a handler lives in handlers.ts beside its contract, never in contract.ts: move {{name}} there",
			wrongName:
				'request {{constant}} is named "{{name}}"; name it "{{wanted}}": <module>/<the constant without its suffix, in kebab case>',
			otherFeature:
				"a feature imports only its own folder; {{specifier}} is another feature: move what both use to shared/",
			gatewayPart:
				"{{specifier}} is a part of a gateway; import its {{implementation}}.gateway.ts, the folder's one entry",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null) return {};
		return {
			...importListener((node, specifier) => checkImport(context, file, node, specifier)),
			Program(program) {
				for (const said of placementOf(file)) context.report({ node: program, messageId: "misplaced", data: { said } });
				checkFeatureFile(context, file, program);
			},
		};
	},
};

interface Reached {
	readonly importer: string;
	readonly target: string;
	readonly specifier: string;
}

interface RootCall {
	readonly name: string;
	readonly call: ESTree.CallExpression;
}

function checkFeatureFile(context: Rule.RuleContext, file: DomainFile, program: ESTree.Program): void {
	const name = file.inside.at(-1);
	if (file.folder === FEATURES && (name === CONTRACT_FILE || name === REQUESTS_FILE))
		checkContract(context, file, program);
}

function checkContract(context: Rule.RuleContext, file: DomainFile, program: ESTree.Program): void {
	for (const declared of program.body.map(declaredIn))
		if (declared?.type === "VariableDeclaration")
			for (const declarator of declared.declarations) checkDeclarator(context, file, declarator);
}

function declaredIn(statement: ESTree.Node): ESTree.Node | null | undefined {
	return statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
}

function checkDeclarator(context: Rule.RuleContext, file: DomainFile, declarator: ESTree.VariableDeclarator): void {
	const root = declarator.init == null ? null : rootCallOf(declarator.init);
	if (root === null || declarator.id.type !== "Identifier") return;
	const constant = declarator.id.name;
	if (root.name === "handler")
		return context.report({ node: declarator, messageId: "handlerInContract", data: { name: constant } });
	const named = requestNameOf(root, constant);
	const wanted = `${path.basename(file.root)}/${kebabOf(constant.replace(REQUEST_SUFFIX, ""))}`;
	if (named !== null && named !== wanted)
		context.report({ node: declarator, messageId: "wrongName", data: { constant, name: named, wanted } });
}

function requestNameOf(root: RootCall, constant: string): string | null {
	if ((root.name !== "query" && root.name !== "command") || !REQUEST_SUFFIX.test(constant)) return null;
	const [named] = root.call.arguments;
	return named?.type === "Literal" && typeof named.value === "string" ? named.value : null;
}

function checkImport(context: Rule.RuleContext, file: DomainFile, node: ESTree.Node, specifier: string): void {
	if (!specifier.startsWith(".")) return;
	const inside = path.relative(file.root, path.resolve(path.dirname(context.filename), specifier)).split(path.sep);
	const importerFeature = featureFolderOf(file.root, file.inside);
	const targetFeature = featureFolderOf(file.root, inside);
	if (importerFeature !== null && targetFeature !== null && importerFeature !== targetFeature) {
		return context.report({ node, messageId: "otherFeature", data: { specifier } });
	}

	checkGatewayPart(context, node, { importer: file.inside.join("/"), target: inside.join("/"), specifier });
}

function checkGatewayPart(
	context: Rule.RuleContext,
	node: ESTree.Node,
	{ importer, target, specifier }: Reached,
): void {
	const [gateways, port, implementation, ...rest] = target.split("/");
	if (gateways !== "gateways" || port === undefined || implementation === undefined || rest.length === 0) return;
	const folder = `gateways/${port}/${implementation}/`;
	if (importer.startsWith(folder) || rest.join("/").replace(/\.[jt]sx?$/, "") === `${implementation}.gateway`) return;
	context.report({ node, messageId: "gatewayPart", data: { specifier, implementation } });
}

function rootCallOf(node: ESTree.Node): RootCall | null {
	if (node.type === "MemberExpression") return rootCallOf(node.object);
	if (node.type !== "CallExpression") return null;
	if (node.callee.type === "Identifier") return { name: node.callee.name, call: node };
	return node.callee.type === "Super" ? null : rootCallOf(node.callee);
}

function kebabOf(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
