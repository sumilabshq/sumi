import type { PaneLeaf, PaneNode, PaneTree, PaneView } from "../schema/pane-tree.schema.js";
import { isSameView, leavesOf, withPlaced, withShare, withView, withoutPane } from "./pane-tree.js";
import type { PanePlace } from "./pane-tree.js";

const NO_PANE = 'no pane "{id}"';

export class PaneTreeStore {
	private readonly watchers = new Set<() => void>();

	constructor(
		private tree: PaneTree,
		private readonly keep: (tree: PaneTree, reason: string) => void,
	) {}

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

		const standing = this.leaves().find((leaf) => isSameView(leaf.view, view));
		const placedId = standing?.id ?? this.mintLeaf(view).id;
		this.become(
			{
				root,
				minted: standing === undefined ? this.tree.minted + 1 : this.tree.minted,
				targetId: view.kind === "app" ? placedId : this.tree.targetId,
			},
			`place ${viewWords(view)} ${at.side} of ${at.targetId ?? "the board"}`,
		);
	}

	aimAt(id: string): void {
		const leaf = this.leaves().find((one) => one.id === id);

		if (leaf === undefined || leaf.view.kind !== "app" || this.tree.targetId === id) {
			return;
		}

		this.become(
			{
				...this.tree,
				targetId: id,
			},
			`tabs open in ${id} now`,
		);
	}

	showIn(id: string, tabId: string): void {
		if (!this.hasPane(id)) {
			throw new Error(NO_PANE.replace("{id}", id));
		}

		this.become(
			{
				...this.tree,
				root: withView(this.tree.root, id, {
					kind: "app",
					tabId,
				}),
			},
			`show tab ${tabId} in ${id}`,
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

		this.become(this.treeWithout(id), `close ${id}`);
	}

	dropGoneTabs(heldTabIds: ReadonlySet<string>): void {
		for (const leaf of this.leaves()) {
			if (leaf.view.kind === "app" && leaf.view.tabId !== null && !heldTabIds.has(leaf.view.tabId)) {
				this.dropGoneTab(leaf.id, leaf.view.tabId);
			}
		}
	}

	private dropGoneTab(id: string, tabId: string): void {
		const reason = `kept tab ${tabId} is gone`;
		const appPanes = this.leaves().filter((leaf) => leaf.view.kind === "app");

		if (appPanes.length > 1) {
			this.become(this.treeWithout(id), reason);
			return;
		}

		this.become(
			{
				...this.tree,
				root: withView(this.tree.root, id, {
					kind: "app",
					tabId: null,
				}),
			},
			reason,
		);
	}

	private treeWithout(id: string): PaneTree {
		return {
			...this.tree,
			root: withoutPane(this.tree.root, id),
			targetId: this.tree.targetId === id ? null : this.tree.targetId,
		};
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
		this.keep(next, reason);

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
