import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";

export abstract class PaneTreeGateway {
	abstract read(): PaneTree | null;
	abstract keep(tree: PaneTree, reason: string): void;
}
