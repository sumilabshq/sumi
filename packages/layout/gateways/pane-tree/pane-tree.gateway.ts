import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";

export abstract class PaneTreeGateway {
	abstract tree(): PaneTree;
	abstract saveTree(tree: PaneTree, reason: string): void;
	abstract treeChanged(listener: () => void): () => void;
}
