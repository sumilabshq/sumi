import { isSourceTreeNode } from "./source-tree-node.js";
import { scopeOpenedBy } from "./source-scopes.js";
import type { ScopeChain } from "./source-scopes.js";
import type { SourceTreeNode } from "./source-tree-node.js";

export interface Visited {
	readonly node: SourceTreeNode;
	readonly parent: SourceTreeNode | null;
	readonly key: string;
	readonly scope: ScopeChain | null;
}

const NEVER_WALKED_KEYS: ReadonlySet<string> = new Set([
	"loc",
	"start",
	"end",
	"extra",
	"leadingComments",
	"trailingComments",
	"innerComments",
	"comments",
	"tokens",
	"typeAnnotation",
	"returnType",
	"typeParameters",
	"typeArguments",
	"superTypeParameters",
	"superTypeArguments",
	"implements",
	"predicate",
]);
const OUTER_KEYS: ReadonlySet<string> = new Set(["key", "decorators", "discriminant", "superClass"]);
const TYPE_ONLY_NODES: ReadonlySet<string> = new Set([
	"TSInterfaceDeclaration",
	"TSTypeAliasDeclaration",
	"TSDeclareFunction",
	"TSDeclareMethod",
]);

export function walkSourceTree(program: SourceTreeNode, visit: (visited: Visited) => void): void {
	walkFrom({ node: program, parent: null, key: "", scope: null }, visit);
}

function walkFrom(visited: Visited, visit: (visited: Visited) => void): void {
	if (TYPE_ONLY_NODES.has(visited.node.type)) {
		return;
	}

	visit(visited);
	const { node } = visited;
	const inner = scopeOpenedBy(visited, visited.scope) ?? visited.scope;
	for (const key of Object.keys(node).filter((name) => !NEVER_WALKED_KEYS.has(name))) {
		const held = node[key];
		for (const child of (Array.isArray(held) ? held : [held]).filter(isSourceTreeNode)) {
			walkFrom({ node: child, parent: node, key, scope: OUTER_KEYS.has(key) ? visited.scope : inner }, visit);
		}
	}
}
