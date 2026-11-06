import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { MODULE_FILE, domainFileOf } from "../domain-file.js";

const STARTERS: ReadonlySet<string> = new Set(["serverModule", "clientModule", "module"]);
const TYPE_EXPORT = "type";

export const moduleDefinition: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"module.ts holds only the module(...), serverModule(...) or clientModule(...) definition and re-exports the types its config names",
		},
		schema: [],
		messages: {
			notTheModule:
				"module.ts exports only its module(...), serverModule(...) or clientModule(...) const and type re-exports for its config; move this export to gateways/, shared/ or a feature",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || file.inside.join("/") !== MODULE_FILE) return {};
		return {
			Program(program) {
				for (const statement of program.body)
					if (isExport(statement) && !isModuleConst(statement) && !isTypeReexport(statement))
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

function isTypeReexport(statement: ESTree.Node): boolean {
	return (
		statement.type === "ExportNamedDeclaration" &&
		statement.declaration == null &&
		statement.source != null &&
		Reflect.get(statement, "exportKind") === TYPE_EXPORT
	);
}
