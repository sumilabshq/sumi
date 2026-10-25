import type { JsonMemory } from "@widgetarium/behaviors";
import { KeptPaneTreeSchema, PaneTreeGateway } from "./pane-tree.gateway.js";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import type { WindowTree } from "../../shared/lib/window-trees.js";

const UNREAD = "[widgetarium] kept panes could not be read, so the board starts from the first panes";
const REFUSED = "[widgetarium] kept panes refused, so the board starts from the first panes";

export class JsonMemoryPaneTreeGateway extends PaneTreeGateway {
	private readonly listeners = new Set<() => void>();
	private held: PaneTree;

	constructor(
		private readonly memory: JsonMemory<PaneTree>,
		first: PaneTree,
		private readonly others: readonly WindowTree[] = [],
	) {
		super();
		this.held = keptTreeIn(memory) ?? first;
	}

	tree(): PaneTree {
		return this.held;
	}

	elsewhere(): readonly WindowTree[] {
		return this.others;
	}

	saveOwnTree(tree: PaneTree, reason: string): void {
		this.memory.write(tree, reason);
		this.held = tree;
		for (const listener of this.listeners) {
			listener();
		}
	}

	isLoaded(): boolean {
		return true;
	}

	treeChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}

function keptTreeIn(memory: JsonMemory<PaneTree>): PaneTree | null {
	try {
		return keptTreeOf(memory.read());
	} catch (failure: unknown) {
		console.warn(UNREAD, failure);
		return null;
	}
}

function keptTreeOf(kept: unknown): PaneTree | null {
	if (kept === null) {
		return null;
	}

	const parsed = KeptPaneTreeSchema.safeParse(kept);

	if (parsed.success) {
		return parsed.data;
	}

	console.warn(REFUSED, parsed.error.issues);
	return null;
}
