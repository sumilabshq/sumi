import type { KeptSplit } from "../../schema/splits.schema.js";
import type { TabEffect } from "../../schema/screen.schema.js";
import type { HostTabsMoment } from "../tabs/host-tabs.js";
import { heldTabOf, isPageTab } from "../tabs/host-tabs.js";
import { shownSplitOf, splitOfTab } from "../splits/split-members.js";
import { withEffect, withPageEnsured, withTabShown } from "./showing.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";

const BOARD_EFFECTS: ReadonlySet<TabEffect["kind"]> = new Set([
	"close-panes",
	"open-shown-tab-pane",
	"close-shown-tab-pane",
	"show-in-target-pane",
	"show-chat",
	"show-in-chat-group",
	"flash-pane",
]);

const LEAVE_SPLIT: TabEffect = { kind: "leave-split" };

export function boardlessOf(facts: TabFacts): TabFacts {
	return {
		...facts,
		tabPanes: [],
		shownTabPaneId: null,
		hasTabTarget: false,
		tabTargetId: null,
		chatGroupIds: [],
		groupOfPane: new Map(),
		focusedChatId: null,
	};
}

export function withSplitLeftFor(showing: Showing): Showing {
	return {
		...showing,
		effects: [LEAVE_SPLIT, ...showing.effects],
	};
}

export function withSplitFollowed(was: HostTabsMoment, showing: Showing, facts: TabFacts): Showing {
	const before = shownSplitOf(was);
	const after = shownSplitOf(showing.moment);

	if (after !== null) {
		return isSameDrawing(before, after)
			? withSplitRefocused(showing, before, after)
			: withSplitDrawn(showing, facts, after);
	}

	const hasLeft = showing.effects.some((effect) => effect.kind === LEAVE_SPLIT.kind);
	return before === null || hasLeft ? showing : withSplitLeft(showing, facts, before);
}

function withSplitRefocused(showing: Showing, before: KeptSplit, after: KeptSplit): Showing {
	if (before.focusedId === after.focusedId) {
		return showing;
	}

	console.info(`[widgetarium] ${after.id} focus ${before.focusedId} → ${after.focusedId} (the drawing stays)`);
	return withEffect(showing, { kind: "focus-split", focusedId: after.focusedId });
}

function withSplitDrawn(showing: Showing, facts: TabFacts, split: KeptSplit): Showing {
	const { moment } = showing;
	const paged = withMemberPagesEnsured(unboardedOf(showing), facts, split);
	console.info(`[widgetarium] board → ${split.id} (${split.memberIds.join(" + ")}, focused ${split.focusedId})`);
	return withEffect(paged, {
		kind: "show-split",
		layout: split.layout,
		chatIds: split.memberIds.filter((id) => !isPageTabId(moment, id)),
		focusedId: split.focusedId,
	});
}

function withSplitLeft(showing: Showing, facts: TabFacts, split: KeptSplit): Showing {
	const unboarded = withSplitLeftFor(unboardedOf(showing));
	const shownId = aloneIdOf(showing.moment, split);
	const tab = shownId === null ? undefined : heldTabOf(showing.moment, shownId);
	console.info(`[widgetarium] board ${split.id} → ${shownId ?? "nothing"} alone`);

	if (tab === undefined) {
		return unboarded;
	}

	return isPageTab(showing.moment.apps, tab)
		? withTabShown(unboarded, boardlessOf(facts), tab)
		: withEffect(unboarded, { kind: "show-chat", chatId: tab.id });
}

function unboardedOf(showing: Showing): Showing {
	return {
		...showing,
		effects: showing.effects.filter((effect) => !BOARD_EFFECTS.has(effect.kind)),
	};
}

function withMemberPagesEnsured(showing: Showing, facts: TabFacts, split: KeptSplit): Showing {
	return split.memberIds
		.filter((id) => isPageTabId(showing.moment, id))
		.reduce<Showing>(
			(drawn, tabId) => withPageEnsured(drawn, facts, { tabId, why: `drawn in ${split.id}` }).showing,
			showing,
		);
}

function aloneIdOf(moment: HostTabsMoment, split: KeptSplit): string | null {
	const left = split.memberIds.filter((id) => heldTabOf(moment, id) !== undefined && splitOfTab(moment, id) === null);
	const isDissolved = !moment.splits.some((one) => one.id === split.id);
	return isDissolved && left.length === 1 ? (left[0] ?? null) : moment.shownId;
}

function isSameDrawing(before: KeptSplit | null, after: KeptSplit): before is KeptSplit {
	return before !== null && JSON.stringify(unfocusedOf(before)) === JSON.stringify(unfocusedOf(after));
}

function unfocusedOf({ focusedId: _focused, ...drawing }: KeptSplit): Omit<KeptSplit, "focusedId"> {
	return drawing;
}

function isPageTabId(moment: HostTabsMoment, id: string): boolean {
	const tab = heldTabOf(moment, id);
	return tab !== undefined && isPageTab(moment.apps, tab);
}
