import type { CallExpression, Expression, Node, Statement } from "@babel/types";

export interface ChainStep {
	readonly method: string;
	readonly call: CallExpression;
}

export interface ExportedConst {
	readonly name: string;
	readonly init: Expression;
}

export function chainOf(node: Node): ChainStep[] {
	if (node.type !== "CallExpression") {
		return [];
	}

	if (node.callee.type === "Identifier") {
		return [
			{
				method: node.callee.name,
				call: node,
			},
		];
	}

	if (node.callee.type !== "MemberExpression") {
		return [];
	}

	return [
		...chainOf(node.callee.object),
		{
			method: methodOf(node.callee.property, node.callee.computed),
			call: node,
		},
	];
}

export function rootCallOf(node: Node): ChainStep | null {
	if (node.type === "MemberExpression") {
		return rootCallOf(node.object);
	}

	return chainOf(node)[0] ?? null;
}

export function exportedConstsOf(body: readonly Statement[]): ExportedConst[] {
	return body.flatMap((statement) => {
		if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration") {
			return [];
		}

		return statement.declaration.declarations.flatMap((declarator) =>
			declarator.id.type === "Identifier" && declarator.init != null
				? [
						{
							name: declarator.id.name,
							init: declarator.init,
						},
					]
				: [],
		);
	});
}

function methodOf(property: Node, isComputed: boolean): string {
	return property.type === "Identifier" && !isComputed ? property.name : "";
}
