import type { PaneLeaf, PaneNode, PaneTree, PaneView } from "../schema/pane-tree.schema.js";
import { leavesOf, placedRoot, withoutPane } from "./pane-tree.js";
import type { PanePlace } from "./pane-tree.js";

const NO_PANE = 'no pane "{id}"';

export class PaneTreeStore {
	private readonly watchers = new Set<() => void>();

	constructor(private tree: PaneTree) {}

	now = (): PaneTree => this.tree;

	leaves = (): readonly PaneLeaf[] => leavesOf(this.tree.root);

	watch = (changed: () => void): (() => void) => {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	};

	hasPane(id: string): boolean {
		return this.leaves().some((leaf) => leaf.id === id);
	}

	place(view: PaneView, at: PanePlace): void {
		const root = placedRoot(this.tree.root, at, this.mintLeaf(view));

		if (root === null) {
			return;
		}

		this.become(
			{
				root,
				minted: this.tree.minted + 1,
			},
			`place ${viewSaid(view)} ${at.side} of ${at.targetId ?? "the board"}`,
		);
	}

	close(id: string): void {
		if (!this.hasPane(id)) {
			throw new Error(NO_PANE.replace("{id}", id));
		}

		this.become(
			{
				...this.tree,
				root: withoutPane(this.tree.root, id),
			},
			`close ${id}`,
		);
	}

	private mintLeaf(view: PaneView): PaneLeaf {
		return {
			kind: "pane",
			id: `pane-${this.tree.minted + 1}`,
			view,
		};
	}

	private become(next: PaneTree, reason: string): void {
		console.info(`[widgetarium] panes ${shapeSaid(this.tree.root)} → ${shapeSaid(next.root)} (${reason})`);
		this.tree = next;

		for (const changed of this.watchers) {
			changed();
		}
	}
}

function viewSaid(view: PaneView): string {
	return view.kind === "chat" ? "the chat" : `tab ${view.tabId ?? "shown"}`;
}

function shapeSaid(node: PaneNode | null): string {
	if (node === null) {
		return "empty";
	}

	if (node.kind === "pane") {
		return `${node.id}(${viewSaid(node.view)})`;
	}

	return `${node.dir}[${node.children.map(shapeSaid).join(", ")}]`;
}
