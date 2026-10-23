import type { PaneLeaf, PaneNode, PaneTree, PaneView } from "../schema/pane-tree.schema.js";
import { isSameView, leavesOf, withPlaced, withShare, withoutPane } from "./pane-tree.js";
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
		if (at.targetId !== null && !this.hasPane(at.targetId)) {
			throw new Error(NO_PANE.replace("{id}", at.targetId));
		}

		const root = withPlaced(this.tree.root, at, this.mintLeaf(view));

		if (root === null) {
			console.info(
				`[widgetarium] place ${viewWords(view)} skipped: it already stands in ${at.targetId ?? "the board"}`,
			);
			return;
		}

		const isMove = this.leaves().some((leaf) => isSameView(leaf.view, view));
		this.become(
			{
				root,
				minted: isMove ? this.tree.minted : this.tree.minted + 1,
			},
			`place ${viewWords(view)} ${at.side} of ${at.targetId ?? "the board"}`,
		);
	}

	resize(splitId: string, at: number, share: number): void {
		const { root } = this.tree;

		if (root === null) {
			throw new Error(NO_PANE.replace("{id}", splitId));
		}

		this.become(
			{
				...this.tree,
				root: withShare(root, splitId, at, share),
			},
			`resize ${splitId} at ${at} to ${share.toFixed(3)}`,
			false,
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

	private become(next: PaneTree, reason: string, isLogged = true): void {
		if (isLogged) {
			console.info(`[widgetarium] panes ${shapeWords(this.tree.root)} → ${shapeWords(next.root)} (${reason})`);
		}

		this.tree = next;

		for (const changed of this.watchers) {
			changed();
		}
	}
}

function viewWords(view: PaneView): string {
	return view.kind === "chat" ? "the chat" : `tab ${view.tabId ?? "shown"}`;
}

function shapeWords(node: PaneNode | null): string {
	if (node === null) {
		return "empty";
	}

	if (node.kind === "pane") {
		return `${node.id}(${viewWords(node.view)})`;
	}

	return `${node.dir}[${node.children.map(shapeWords).join(", ")}]`;
}
