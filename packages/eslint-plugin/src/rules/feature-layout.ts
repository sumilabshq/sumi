import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { domainFileOf } from "../domain-file.js";
import type { DomainFile } from "../domain-file.js";
import { importListener } from "../imports.js";
import { placementOf } from "./feature-placement.js";

const CONTRACT_FILE = "contract.ts";
const HANDLERS_FILE = "handlers.ts";
const FEATURE_CODE: ReadonlySet<string> = new Set([CONTRACT_FILE, HANDLERS_FILE]);
const REQUEST_SUFFIX = /(Query|Command)$/;
const FEATURE_PART = /^features\/(?:[^/]+\/)*?([^/]+)\/(ui|lib)\//;

export const featureLayout: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a module is laid out as module.ts, features/, shared/, adapters/ and generated/" },
		schema: [],
		messages: {
			misplaced: "{{said}}",
			topLevelLet:
				"no top-level let in contract.ts or handlers.ts: state a request or handler keeps belongs to a store the module provides",
			handlerInContract:
				"a handler lives in handlers.ts beside its contract, never in contract.ts: move {{name}} there",
			wrongName:
				'request {{constant}} is named "{{name}}"; name it "{{wanted}}": <module>/<the constant without its suffix, in kebab case>',
			otherFeature: "{{specifier}} is another feature's {{part}}/: move what two features use to shared/",
			adapterPart:
				"{{specifier}} is a part of an adapter; import its {{implementation}}.adapter.ts, the folder's one entry",
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
	if (file.folder !== "features" || !FEATURE_CODE.has(name ?? "")) return;
	for (const declared of program.body.map(declaredIn).filter(isTopLevelLet))
		context.report({ node: declared, messageId: "topLevelLet" });
	if (name === CONTRACT_FILE) checkContract(context, file, program);
}

function isTopLevelLet(declared: ESTree.Node | null | undefined): declared is ESTree.VariableDeclaration {
	return declared?.type === "VariableDeclaration" && declared.kind === "let";
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
	const target = path
		.relative(file.root, path.resolve(path.dirname(context.filename), specifier))
		.split(path.sep)
		.join("/");
	const importer = file.inside.join("/");
	const reached = FEATURE_PART.exec(target);
	if (reached !== null && importer.startsWith("features/") && !importer.startsWith(featureFolderOf(target)))
		return context.report({ node, messageId: "otherFeature", data: { specifier, part: reached[2] ?? "" } });
	checkAdapterPart(context, node, { importer, target, specifier });
}

function checkAdapterPart(
	context: Rule.RuleContext,
	node: ESTree.Node,
	{ importer, target, specifier }: Reached,
): void {
	const [adapters, port, implementation, ...rest] = target.split("/");
	if (adapters !== "adapters" || port === undefined || implementation === undefined || rest.length === 0) return;
	const folder = `adapters/${port}/${implementation}/`;
	if (importer.startsWith(folder) || rest.join("/").replace(/\.[jt]sx?$/, "") === `${implementation}.adapter`) return;
	context.report({ node, messageId: "adapterPart", data: { specifier, implementation } });
}

function featureFolderOf(target: string): string {
	const at = target.search(/\/(ui|lib)\//);
	return target.slice(0, at + 1);
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
