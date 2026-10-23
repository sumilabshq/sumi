import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { domainFileOf } from "../domain-file.js";
import { fieldOf } from "../guards.js";
import { EVERY_NAME, importersOf } from "../lib-importers.js";

const LIB_FILE = /^(shared\/lib|features\/(?:[^/]+\/){1,2}lib)\//;
const PUBLIC_LIB = "shared/lib/index.ts";

interface Exported {
	readonly name: string;
	readonly node: ESTree.Node;
}

export const singleUseLib: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: { description: "a lib export has more than one user; one used by a single file belongs in that file" },
		schema: [],
		messages: {
			singleUse: "{{name}} has one user, {{user}}: inline it into its only user",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || !LIB_FILE.test(file.inside.join("/"))) return {};
		return {
			Program(program) {
				const importers = importersOf(file.root, path.resolve(context.filename));
				for (const exported of program.body.flatMap(exportedBy))
					reportSingleUse(context, file.root, importers, exported);
			},
		};
	},
};

function reportSingleUse(
	context: Rule.RuleContext,
	root: string,
	importers: ReadonlyMap<string, ReadonlySet<string>>,
	{ name, node }: Exported,
): void {
	const users = new Set([...(importers.get(name) ?? []), ...(importers.get(EVERY_NAME) ?? [])]);
	const [user] = users;
	if (users.size === 1 && user !== undefined && path.relative(root, user) !== PUBLIC_LIB)
		context.report({ node, messageId: "singleUse", data: { name, user: path.relative(root, user) } });
}

function exportedBy(statement: ESTree.Node): Exported[] {
	if (statement.type === "ExportDefaultDeclaration") return [{ name: "default", node: statement }];
	if (statement.type !== "ExportNamedDeclaration") return [];
	if (statement.declaration == null)
		return statement.specifiers.map((specifier) => ({ name: nameIn(specifier.exported), node: specifier }));
	return namesDeclared(statement.declaration).map((name) => ({ name, node: statement }));
}

function namesDeclared(declaration: ESTree.Declaration): string[] {
	if (declaration.type === "VariableDeclaration")
		return declaration.declarations.flatMap((one) => (one.id.type === "Identifier" ? [one.id.name] : []));
	const name = fieldOf(fieldOf(declaration, "id"), "name");
	return typeof name === "string" ? [name] : [];
}

function nameIn(exported: ESTree.Identifier | ESTree.Literal): string {
	return exported.type === "Identifier" ? exported.name : String(exported.value);
}
