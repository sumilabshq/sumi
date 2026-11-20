import type { TabEffect } from "../../schema/screen.schema.js";
import { focusedInSplit } from "../splits/split-moves.js";
import { shownSplitOf, splitOfTab } from "../splits/split-members.js";
import { isChatTab } from "../tabs/app-abilities.js";
import { chatIdOf, heldTabOf } from "../tabs/host-tabs.js";
import { mainPageOf, subPageIdsOf } from "../tabs/sub-pages.js";
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
	const chat = pairedChatOf(showing.moment, tab);

	if (chat === undefined) {
		return showing;
	}

	const isChatMain = mainPageOf(showing.moment, tab.id) === chat.id;
	console.info(`[widgetarium] show ${tab.id}: its paired chat ${chat.id} stands beside it`);
	return withEffect(showing, {
		kind: "show-beside-chat",
		chatId: chatIdOf(showing.moment.apps, chat) ?? chat.id,
		tabId: tab.id,
		side: isChatMain ? "right" : "left",
	});
}

function pairedChatOf(moment: HostTabsMoment, tab: HostTab): HostTab | undefined {
	const main = mainPageOf(moment, tab.id);
	const ids = main === null ? subPageIdsOf(moment, tab.id) : [main];
	return ids.map((id) => heldTabOf(moment, id)).find((one) => one !== undefined && isChatTab(moment.apps, one));
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
	const chatId = chatIdOf(showing.moment.apps, tab) ?? tab.id;
	const main = paneId === null ? mainPageOf(showing.moment, tab.id) : null;

	if (main === null) {
		return withEffect(seen, {
			kind: "show-chat",
			chatId,
			paneId,
		});
	}

	const mainChatId = mainChatIdOf(showing.moment, main);

	if (mainChatId !== null) {
		console.info(`[widgetarium] show chat ${chatId}: its main chat ${mainChatId} stands left of it`);
		return withEffect(seen, { kind: "show-chat-beside-chat", chatId: mainChatId, besideChatId: chatId });
	}

	console.info(`[widgetarium] show chat ${chatId}: its page ${main} stands beside it`);
	return withEffect(seen, { kind: "show-beside-chat", chatId, tabId: main, side: "left" });
}

function mainChatIdOf(moment: HostTabsMoment, main: string): string | null {
	const mainTab = heldTabOf(moment, main);
	return mainTab === undefined ? null : chatIdOf(moment.apps, mainTab);
}
