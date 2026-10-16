import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { domainFileOf } from "../domain-file.js";
import { fieldOf, isNode } from "../guards.js";

const GENERATED = "generated";
const COLLECTIONS: ReadonlySet<string> = new Set(["Map", "Set", "WeakMap", "WeakSet", "Array"]);
const READONLY_TYPES: ReadonlySet<string> = new Set(["ReadonlyMap", "ReadonlySet", "ReadonlyArray", "Readonly"]);
const UNWRAPPED: ReadonlySet<string> = new Set(["TSSatisfiesExpression", "TSNonNullExpression"]);

export const moduleState: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a module keeps no state at its top level: state belongs to a store the module provides" },
		schema: [],
		messages: {
			topLevelLet: "no top-level {{kind}} in a module: the state it keeps belongs to a store the module provides",
			writableCollection:
				"{{name}} is a writable collection at the top level: keep it in a store the module provides, or type it Readonly",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || file.folder === GENERATED) return {};
		return {
			Program(program) {
				for (const declared of program.body.map(declaredIn)) checkDeclared(context, declared);
			},
		};
	},
};

function declaredIn(statement: ESTree.Node): ESTree.Node | null | undefined {
	return statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
}

function checkDeclared(context: Rule.RuleContext, declared: ESTree.Node | null | undefined): void {
	if (declared?.type !== "VariableDeclaration") return;
	if (declared.kind !== "const")
		return context.report({ node: declared, messageId: "topLevelLet", data: { kind: declared.kind } });
	for (const declarator of declared.declarations.filter(isWritableCollection))
		context.report({ node: declarator, messageId: "writableCollection", data: { name: nameOf(declarator) } });
}

function isWritableCollection(declarator: ESTree.VariableDeclarator): boolean {
	if (declarator.init == null || isTypedReadonly(declarator.id) || isAsConst(declarator.init)) return false;
	const init = unwrapped(declarator.init);
	if (init.type === "ArrayExpression") return true;
	return init.type === "NewExpression" && init.callee.type === "Identifier" && COLLECTIONS.has(init.callee.name);
}

function unwrapped(node: ESTree.Node): ESTree.Node {
	const inner = fieldOf(node, "expression");
	return UNWRAPPED.has(node.type) && isNode(inner) ? unwrapped(inner) : node;
}

function isTypedReadonly(id: ESTree.Pattern): boolean {
	const annotation = fieldOf(fieldOf(id, "typeAnnotation"), "typeAnnotation");
	if (fieldOf(annotation, "type") === "TSTypeOperator") {
		return fieldOf(annotation, "operator") === "readonly";
	}

	return READONLY_TYPES.has(typeNameOf(annotation) ?? "");
}

function isAsConst(node: ESTree.Node): boolean {
	return fieldOf(node, "type") === "TSAsExpression" && typeNameOf(fieldOf(node, "typeAnnotation")) === "const";
}

function typeNameOf(annotation: unknown): string | null {
	const typeName = fieldOf(annotation, "typeName");
	return isNode(typeName) && typeName.type === "Identifier" ? typeName.name : null;
}

function nameOf(declarator: ESTree.VariableDeclarator): string {
	return declarator.id.type === "Identifier" ? declarator.id.name : "this binding";
}
