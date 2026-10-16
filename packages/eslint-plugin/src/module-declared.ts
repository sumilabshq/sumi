import type { Node, Statement } from "@babel/types";

export type ModuleRuns = "client" | "server";

export interface DeclaredModule {
	readonly runs: ModuleRuns;
	readonly name: string;
}

const STARTERS: Readonly<Record<string, ModuleRuns>> = { serverModule: "server", clientModule: "client" };

export function moduleDeclaredIn(body: readonly Statement[]): DeclaredModule | null {
	for (const statement of body) {
		const declared = declaredBy(statement);
		if (declared !== null) return declared;
	}
	return null;
}

export function runsDeclaredIn(body: readonly Statement[]): ModuleRuns | null {
	return moduleDeclaredIn(body)?.runs ?? null;
}

export function runsOfStarter(node: Node): ModuleRuns | null {
	if (node.type === "MemberExpression") return runsOfStarter(node.object);
	if (node.type !== "CallExpression") return null;
	if (node.callee.type !== "Identifier") return runsOfStarter(node.callee);
	return STARTERS[node.callee.name] ?? null;
}

function declaredBy(statement: Statement): DeclaredModule | null {
	if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration") return null;
	for (const declarator of statement.declaration.declarations) {
		const runs = declarator.init == null ? null : runsOfStarter(declarator.init);
		if (runs !== null && declarator.id.type === "Identifier") return { runs, name: declarator.id.name };
	}
	return null;
}
