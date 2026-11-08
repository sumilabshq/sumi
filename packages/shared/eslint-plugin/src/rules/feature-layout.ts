import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { CONTRACT_FILE, FEATURES, REQUESTS_FILE, domainFileOf, featureFolderOf } from "../domain-file.js";
import type { DomainFile } from "../domain-file.js";
import { importListener } from "../imports.js";
import { placementOf } from "./feature-placement.js";

export const featureLayout: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a module is laid out as module.ts, features/, shared/, gateways/ and generated/" },
		schema: [],
		messages: {
			misplaced: "{{said}}",
			handlerInContract:
				"a handler lives in handlers.ts beside its contract, never in contract.ts: move {{name}} there",
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
}

function checkFeatureFile(context: Rule.RuleContext, file: DomainFile, program: ESTree.Program): void {
	const name = file.inside.at(-1);
	if (file.folder === FEATURES && (name === CONTRACT_FILE || name === REQUESTS_FILE)) checkContract(context, program);
}

function checkContract(context: Rule.RuleContext, program: ESTree.Program): void {
	for (const declared of program.body.map(declaredIn))
		if (declared?.type === "VariableDeclaration")
			for (const declarator of declared.declarations) checkDeclarator(context, declarator);
}

function declaredIn(statement: ESTree.Node): ESTree.Node | null | undefined {
	return statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
}

function checkDeclarator(context: Rule.RuleContext, declarator: ESTree.VariableDeclarator): void {
	const root = declarator.init == null ? null : rootCallOf(declarator.init);

	if (root?.name === "handler" && declarator.id.type === "Identifier") {
		context.report({ node: declarator, messageId: "handlerInContract", data: { name: declarator.id.name } });
	}
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
	if (node.callee.type === "Identifier") return { name: node.callee.name };
	return node.callee.type === "Super" ? null : rootCallOf(node.callee);
}
