import type { TabEffect } from "../../schema/screen.schema.js";
import { focusedInSplit } from "../splits/split-moves.js";
import { shownSplitOf, splitOfTab } from "../splits/split-members.js";
import { isChatTab } from "../tabs/app-abilities.js";
import { chatIdOf, heldTabOf } from "../tabs/host-tabs.js";
import { isChatList } from "../tabs/chat-lists.js";
import { locationOf } from "../tabs/tab-lists.js";
import type { HostTab, HostTabsMoment } from "../tabs/host-tabs.js";
import { markSeen } from "../tabs/tab-marks.js";
import { holderLabelOf } from "../tabs/tab-leases.js";
import { boardlessOf, withLostSplitDrawn, withSplitLeftFor } from "./split-showing.js";
import { withEffect, withMoved, withTabShown } from "./showing.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";
import { tabPageOf } from "./tab-pages.js";

export interface TabToShow {
	readonly tab: HostTab;
	readonly paneId: string | null;
}

export function withShownTab(showing: Showing, facts: TabFacts, { tab, paneId }: TabToShow): Showing {
	const holder = holderLabelOf(showing.moment.heldElsewhere, tab.id);

	if (holder !== null) {
		console.info(`[widgetarium] show ${tab.id} → window ${holder} comes forward (it holds the tab)`);
		return withEffect(showing, { kind: "focus-window", window: holder });
	}

	if (isChatTab(showing.moment.apps, tab)) {
		return withHolderShown(showing, facts, { tab, paneId });
	}

	if (paneId !== null) {
		console.info(`[widgetarium] show ${tab.id}: pane ${paneId} ignored, only a tab holder opens in a pane it names`);
	}

	return withHoldingChatShown(splitShowingOf(showing, facts, tab) ?? withLoneTabShown(showing, facts, tab), tab);
}

function withHoldingChatShown(showing: Showing, tab: HostTab): Showing {
	const list = locationOf(showing.moment, tab.id)?.chatId ?? null;
	const chat = list === null || !isChatList(showing.moment, list) ? undefined : heldTabOf(showing.moment, list);

	if (chat === undefined) {
		return showing;
	}

	console.info(`[widgetarium] show ${tab.id}: its chat ${chat.id} comes beside it`);
	return withEffect(showing, {
		kind: "show-chat",
		chatId: chatIdOf(showing.moment.apps, chat) ?? chat.id,
		paneId: null,
	});
}

function splitShowingOf(showing: Showing, facts: TabFacts, tab: HostTab): Showing | null {
	const split = splitOfTab(showing.moment, tab.id);

	if (split !== null) {
		const focused = withMoved(showing, focusedInSplit(showing.moment, tab.id));
		const isShownAlready = showing.moment.shownSplitId === split.id;
		const now = shownSplitOf(focused.moment);
		return isShownAlready && now !== null ? withLostSplitDrawn(focused, facts, now) : focused;
	}

	return shownSplitOf(showing.moment) === null ? null : withSplitLeftAlone(showing, facts, tab);
}

function withLoneTabShown(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const apart = shownApartEffectOf(tab, showing.moment, facts);

	if (apart === null) {
		return withTabShown(showing, facts, tab);
	}

	console.info(
		`[widgetarium] show ${tab.id}: ${apart.kind === "flash-pane" ? "reveal the pane holding it" : "focus its own window"}`,
	);
	return withEffect(showing, apart);
}

function withSplitLeftAlone(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const left = withSplitLeftFor(withMoved(showing, focusedInSplit(showing.moment, tab.id)));
	return withTabShown(left, boardlessOf(facts), tab);
}

function shownApartEffectOf(tab: HostTab, moment: HostTabsMoment, facts: TabFacts): TabEffect | null {
	const pane = facts.tabPanes.find(({ tabId }) => tabId === tab.id);

	if (pane !== undefined) {
		return {
			kind: "flash-pane",
			paneId: pane.paneId,
		};
	}

	const pageId = tabPageOf(moment, facts.pages, tab.id)?.pageId ?? null;
	const isInOwnWindow = facts.pages.some((page) => page.pageId === pageId && page.isInOwnWindow);
	return pageId !== null && isInOwnWindow
		? {
				kind: "focus-own-window",
				pageId,
			}
		: null;
}

function withHolderShown(showing: Showing, facts: TabFacts, { tab, paneId }: TabToShow): Showing {
	const apart = shownApartEffectOf(tab, showing.moment, facts);

	if (apart !== null) {
		console.info(`[widgetarium] show ${tab.id}: it stands apart (${apart.kind})`);
		return withEffect(showing, apart);
	}

	const focused = splitShowingOf(showing, facts, tab) ?? showing;
	const seen = withMoved(focused, markSeen(focused.moment, tab));
	return withEffect(seen, {
		kind: "show-chat",
		chatId: chatIdOf(showing.moment.apps, tab) ?? tab.id,
		paneId,
	});
}
