import type { Rule } from "eslint";
import type * as ESTree from "estree";

export type OnImport = (node: ESTree.Node, specifier: string) => void;

export function importListener(onImport: OnImport): Rule.RuleListener {
	const heard = (node: ESTree.Node, source: ESTree.Node | null | undefined): void => {
		if (source?.type === "Literal" && typeof source.value === "string") onImport(node, source.value);
	};
	return {
		ImportDeclaration: (node) => heard(node, node.source),
		ExportAllDeclaration: (node) => heard(node, node.source),
		ExportNamedDeclaration: (node) => heard(node, node.source),
		ImportExpression: (node) => heard(node, node.source),
	};
}
