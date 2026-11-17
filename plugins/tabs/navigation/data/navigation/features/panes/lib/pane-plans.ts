import { refuse } from "@widgetarium/data-framework";
import type { PaneTree, PanePlacement, WindowSeat } from "../../../shared/schema/pane-tree.schema.js";
import type { MovePlacedTabs } from "../../../shared/lib/settling/settling.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { placedWithPanes, windowBoardOf } from "../../../shared/lib/panes/window-boards.js";
import type { WindowTree } from "../../../shared/lib/panes/window-trees.js";
import { holdsOf } from "../../../shared/lib/panes/window-trees.js";
import { homeOfPlacement, refuseHomeTarget } from "../../../shared/lib/panes/chat-groups.js";
import { leavesOf } from "../../../shared/lib/panes/pane-nodes.js";
import { refuseUnknownEdge, shareAt, withSplitShare } from "../../../shared/lib/panes/pane-splits.js";
import type { SplitShare } from "../../../shared/lib/panes/pane-splits.js";
import { goneTabsWords, paneTransitionOf, viewWords } from "../../../shared/lib/panes/pane-words.js";
import {
	goneTabPanesOf,
	isAimable,
	paneShowingTab,
	placedTreeOf,
	refuseUnknownPane,
	shownTabPaneOf,
	tabPaneIdsOf,
	tabTargetOf,
	treeShowingChat,
	treeShowingShownTabAlone,
	treeWithoutGoneTabs,
	treeWithoutPane,
	treeWithoutPanes,
	withTabShown,
	withTarget,
} from "../../../shared/lib/panes/pane-trees.js";

export interface PaneChange {
	readonly next: PaneTree | null;
	readonly said: string;
	readonly refusal: string | null;
}

export type PanePlan = (tree: PaneTree, others: readonly WindowTree[]) => PaneChange;

export interface SeatAt {
	readonly seat: WindowSeat;
	readonly apps: PlacedApps;
}

const NO_TAB_TARGET = "the target pane is not an app pane showing a tab";

export function panesMoved({ seat, apps }: SeatAt, plan: PanePlan): MovePlacedTabs<PaneChange> {
	return (placed) => {
		const board = windowBoardOf({ placed, seat, apps });
		const change = plan(board.tree, board.others);
		const said = `${seat.window} ${change.said}`;
		return {
			next: change.next === null ? null : placedWithPanes(placed, seat.window, change.next),
			reason: said,
			answer: { ...change, said },
		};
	};
}

export function saidOrRefused({ said, refusal }: PaneChange): ReturnType<typeof refuse> | undefined {
	if (refusal !== null) {
		return refuse(refusal);
	}

	console.info(`[widgetarium] ${said}`);
	return undefined;
}

export function placePlan(placement: PanePlacement): PanePlan {
	return (tree) => {
		const { view, targetId, side } = placement;
		const refusal = refusePlacement(tree, placement);

		if (refusal !== null) {
			return refused(refusal);
		}

		const placed = placedTreeOf(tree, view, { targetId, side });

		if (placed === null) {
			return skipped(`place ${viewWords(view)} skipped: it already stands in ${targetId ?? "the board"}`);
		}

		return moved(tree, placed.tree, `place ${viewWords(view)} ${side} of ${targetId ?? "the board"}`);
	};
}

export function closePlan(id: string): PanePlan {
	return (tree) => {
		const refusal = refuseUnknownPane(tree, id);
		return refusal === null ? moved(tree, treeWithoutPane(tree, id), `close ${id}`) : refused(refusal);
	};
}

export function resizeSplitPlan(asked: SplitShare): PanePlan {
	return (tree) => {
		const refusal = refuseUnknownEdge(tree, asked);

		if (refusal !== null) {
			return refused(refusal);
		}

		const next = withSplitShare(tree, asked);
		const was = shareAt(tree, asked).toFixed(3);
		const now = shareAt(next, asked).toFixed(3);
		return {
			next,
			said: `split ${asked.splitId} edge ${asked.at} ${was} → ${now} (drag)`,
			refusal: null,
		};
	};
}

export function aimPlan(id: string): PanePlan {
	return (tree) => {
		const refusal = refuseUnknownPane(tree, id);

		if (refusal !== null) {
			return refused(refusal);
		}

		const kind = leavesOf(tree.root).find((leaf) => leaf.id === id)?.view.kind;

		if (kind === undefined || !isAimable(tree, id)) {
			return skipped(`aim ${id} skipped: it is the target already`);
		}

		const was = kind === "chat" ? tree.chatTargetId : tree.targetId;
		return {
			next: withTarget(tree, id, kind),
			said: `${kind} pane target ${was ?? "none"} → ${id} (pressed)`,
			refusal: null,
		};
	};
}

export function showInTargetPlan(tabId: string): PanePlan {
	return (tree) => {
		const target = tabTargetOf(tree);

		if (target === null) {
			return refused(NO_TAB_TARGET);
		}

		const standing = paneShowingTab(tree, tabId);

		if (standing !== null && standing !== target.paneId) {
			return refused(`tab ${tabId} already stands in ${standing}`);
		}

		if (standing === target.paneId) {
			return skipped(`show tab ${tabId} skipped: the target pane shows it already`);
		}

		return moved(tree, withTabShown(tree, target.paneId, tabId), `show tab ${tabId} in the target pane`);
	};
}

export function showChatPlan(chatId: string, paneId: string | null): PanePlan {
	return (tree, others) => {
		const holder = holdsOf(others).find((holds) => holds.chatIds.includes(chatId));

		if (holder !== undefined) {
			return skipped(`show chat ${chatId} skipped: it stands in window ${holder.window}`);
		}

		const next = treeShowingChat(tree, chatId, paneId);

		if (next === tree) {
			return skipped(`show chat ${chatId} skipped: its pane is the active chat pane already`);
		}

		return moved(tree, next, `show chat ${chatId} in ${paneId ?? "the active chat pane"}`);
	};
}

export function openShownPlan(): PanePlan {
	return (tree) => {
		const shownTabLeaf = shownTabPaneOf(tree);

		if (shownTabLeaf !== null && tree.root?.id === shownTabLeaf.id) {
			return skipped("open the shown tab pane skipped: it holds the board alone already");
		}

		return moved(tree, treeShowingShownTabAlone(tree), "the shown tab takes the whole board, chats go to the shelf");
	};
}

export function closeShownPlan(): PanePlan {
	return (tree) => {
		const shown = shownTabPaneOf(tree);

		if (shown === null) {
			return skipped("close the shown tab pane skipped: none stands");
		}

		return moved(tree, treeWithoutPane(tree, shown.id), `close the shown tab pane ${shown.id}`);
	};
}

export function closeShowingPanesPlan(tabIds: readonly string[]): PanePlan {
	return (tree) => {
		const paneIds = tabPaneIdsOf(tree, tabIds);

		if (paneIds.length === 0) {
			return skipped(`close the panes of tabs ${tabIds.join(", ")} skipped: none stands`);
		}

		return moved(tree, treeWithoutPanes(tree, paneIds), `close the panes of tabs ${tabIds.join(", ")}`);
	};
}

export function dropGoneTabsPlan(heldTabIds: readonly string[]): PanePlan {
	return (tree) => {
		const gonePanes = goneTabPanesOf(tree, new Set(heldTabIds));

		if (gonePanes.length === 0) {
			return skipped("drop the panes of gone tabs skipped: every pane shows a kept tab");
		}

		return moved(tree, treeWithoutGoneTabs(tree, gonePanes), goneTabsWords(gonePanes.map(({ tabId }) => tabId)));
	};
}

export function refusePlacement(tree: PaneTree, { view, targetId, home }: PanePlacement): string | null {
	return refuseUnknownPane(tree, targetId) ?? refuseHomeTarget(tree.root, homeOfPlacement(tree.root, view, home), targetId);
}

function moved(was: PaneTree, next: PaneTree, why: string): PaneChange {
	return {
		next,
		said: paneTransitionOf(was, next, why),
		refusal: null,
	};
}

function skipped(said: string): PaneChange {
	return {
		next: null,
		said,
		refusal: null,
	};
}

function refused(refusal: string): PaneChange {
	return {
		next: null,
		said: refusal,
		refusal,
	};
}
