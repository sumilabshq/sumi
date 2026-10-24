import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { MODULE_FILE, domainFileOf } from "../domain-file.js";

const STARTERS: ReadonlySet<string> = new Set(["serverModule", "clientModule", "module"]);
const NEEDS_METHOD = "needs";

export const moduleDefinition: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"module.ts holds only the module(...), serverModule(...) or clientModule(...) definition and re-exports the tokens its .needs() names",
		},
		schema: [],
		messages: {
			notTheModule:
				"module.ts exports only its module(...), serverModule(...) or clientModule(...) const and the tokens its .needs() names; move this export to gateways/, shared/ or a feature",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || file.inside.join("/") !== MODULE_FILE) return {};
		return {
			Program(program) {
				const needed = neededNamesIn(program.body);
				for (const statement of program.body)
					if (isExport(statement) && !isModuleConst(statement) && !isNeededReexport(statement, needed))
						context.report({ node: statement, messageId: "notTheModule" });
			},
		};
	},
};

function isExport(statement: ESTree.Node): boolean {
	return (
		statement.type === "ExportNamedDeclaration" ||
		statement.type === "ExportDefaultDeclaration" ||
		statement.type === "ExportAllDeclaration"
	);
}

function isModuleConst(statement: ESTree.Node): boolean {
	if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration")
		return false;
	const [declarator, ...others] = statement.declaration.declarations;
	return others.length === 0 && declarator?.init != null && startsWithModule(declarator.init);
}

function startsWithModule(node: ESTree.Node): boolean {
	if (node.type === "MemberExpression") return startsWithModule(node.object);
	if (node.type !== "CallExpression") return false;
	if (node.callee.type === "Identifier") return STARTERS.has(node.callee.name);
	return node.callee.type !== "Super" && startsWithModule(node.callee);
}

function neededNamesIn(body: readonly ESTree.Node[]): ReadonlySet<string> {
	const names = new Set<string>();
	for (const statement of body)
		if (isModuleConst(statement) && statement.type === "ExportNamedDeclaration")
			for (const declarator of statement.declaration?.type === "VariableDeclaration"
				? statement.declaration.declarations
				: [])
				if (declarator.init != null) collectNeeded(declarator.init, names);
	return names;
}

function collectNeeded(node: ESTree.Node, names: Set<string>): void {
	if (node.type === "MemberExpression") return collectNeeded(node.object, names);
	if (node.type !== "CallExpression" || node.callee.type === "Super") return;
	if (isNeedsCall(node.callee)) for (const argument of node.arguments) collectIdentifiers(argument, names);
	collectNeeded(node.callee, names);
}

function isNeedsCall(callee: ESTree.Node): boolean {
	return (
		callee.type === "MemberExpression" && callee.property.type === "Identifier" && callee.property.name === NEEDS_METHOD
	);
}

function collectIdentifiers(node: ESTree.Node, names: Set<string>): void {
	if (node.type === "Identifier") {
		names.add(node.name);
		return;
	}
	if (node.type === "ObjectExpression")
		for (const property of node.properties)
			collectIdentifiers(property.type === "Property" ? property.value : property.argument, names);
	if (node.type === "CallExpression") for (const argument of node.arguments) collectIdentifiers(argument, names);
}

function isNeededReexport(statement: ESTree.Node, needed: ReadonlySet<string>): boolean {
	if (statement.type !== "ExportNamedDeclaration" || statement.declaration != null || statement.source == null)
		return false;
	return (
		statement.specifiers.length > 0 &&
		statement.specifiers.every(
			({ local, exported }) => nameOf(local) === nameOf(exported) && needed.has(nameOf(exported)),
		)
	);
}

function nameOf(node: ESTree.Identifier | ESTree.Literal): string {
	return node.type === "Identifier" ? node.name : String(node.value);
}
