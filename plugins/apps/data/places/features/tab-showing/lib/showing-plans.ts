import type { TabEffect } from "../../../shared/schema/screen.schema.js";
import type { RestoreTabsAsk, ShowTabAsk } from "../../../shared/schema/tab-asks.schema.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import type { StudioView } from "../../../shared/schema/tabs.schema.js";
import { withTabsAtHome } from "../../../shared/lib/showing/rehoming.js";
import { chatHomeOf } from "../../../shared/lib/showing/chat-home.js";
import { boardlessOf, withSplitLeftFor } from "../../../shared/lib/showing/split-showing.js";
import { focusedInSplit } from "../../../shared/lib/splits/split-moves.js";
import { shownSplitOf, splitOfTab } from "../../../shared/lib/splits/split-members.js";
import type { Showing } from "../../../shared/lib/showing/showing.js";
import {
	withChatTabShown,
	withEffect,
	withFirstTabShown,
	withFreeTabBesidePanes,
	withMoved,
	withPageEnsured,
	withPanePagesEnsured,
	withTabPressed,
	withTabTornOff,
} from "../../../shared/lib/showing/showing.js";
import type { TabFacts } from "../../../shared/lib/showing/tab-facts.js";
import { tabPageOf } from "../../../shared/lib/showing/tab-pages.js";
import { abilitiesOf, holdsTabs, isPageApp } from "../../../shared/lib/tabs/app-abilities.js";
import { heldTabOf, markSelected } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTab, HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { forgetPages, rememberPages } from "../../../shared/lib/tabs/page-memory.js";
import { markSeen } from "../../../shared/lib/tabs/tab-marks.js";

export const NOT_HELD = 'the host holds no tab "{id}"';
export const NO_OWN_WINDOW = 'the tab "{id}" holds no page that can open in its own window';

const NO_OWN_WINDOWS = "this host cannot open a page in its own window";
const NO_PAGE = 'the tab "{id}" shows no browser page';
interface HolderToShow {
	readonly tab: HostTab;
	readonly paneId: string | null;
}

const NOT_A_PAGE_VIEW = 'the view "{view}" names no app whose tabs run in a page';

export function restorePlan({ essentials, isBeside, keepsPages }: Omit<RestoreTabsAsk, "at">): ShowingPlan {
	return (showing, facts) => {
		if (isBeside) {
			console.info("[widgetarium] host tabs restore → panes only (this studio opens beside a running one)");
			return withPanePagesEnsured(showing, facts);
		}

		const started = keepsPages ? showing : withMoved(showing, forgetPages(showing.moment));
		return withFirstTabShown(started, facts, essentials);
	};
}

export function showTabPlan({ id, paneId, isFollowingFocus }: Omit<ShowTabAsk, "at">): ShowingPlan {
	return (showing, facts) => {
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		if (isFollowingFocus) {
			return withFocusFollowed(showing, facts, tab);
		}

		const selected = withMoved(showing, markSelected(showing.moment, id));

		if (holdsTabs(showing.moment.apps, tab)) {
			return withHolderShown(selected, facts, { tab, paneId });
		}

		if (paneId !== null) {
			console.info(`[widgetarium] show ${id}: pane ${paneId} ignored, only a tab holder opens in a pane it names`);
		}

		return splitShowingOf(selected, facts, tab) ?? withLoneTabShown(selected, facts, tab);
	};
}

export function fitTabsPlan(): ShowingPlan {
	return (showing, facts) => {
		if (shownSplitOf(showing.moment) !== null) {
			return withPanePagesEnsured(showing, facts);
		}

		const atHome = withTabsAtHome(showing, facts);
		return atHome === showing ? withFreeTabBesidePanes(withPanePagesEnsured(showing, facts), facts) : atHome;
	};
}

export function rememberPagesPlan(): ShowingPlan {
	return (showing, facts) => withMoved(showing, rememberPages(showing.moment, facts.pages));
}

export function ownWindowPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		if (!heldTabOf(showing.moment, id)) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		if (!facts.canOpenOwnWindow) {
			return refusal(NO_OWN_WINDOWS);
		}

		const ensured = withPageEnsured(showing, facts, { tabId: id, why: "dropped outside the studio" });
		return ensured.pageId === null
			? refusal(NO_OWN_WINDOW.replace("{id}", id))
			: withEffect(ensured.showing, { kind: "open-own-window", pageId: ensured.pageId });
	};
}

export function tearOffPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		const window = facts.tabWindows.get(id);

		if (window !== undefined) {
			console.info(`[widgetarium] tear off ${id} → window ${window} comes forward (it holds the tab)`);
			return withEffect(showing, { kind: "focus-window", window });
		}

		const ensured = withPageEnsured(showing, facts, { tabId: id, why: "dragged toward its own window" });

		if (ensured.pageId !== null) {
			const tornOff = withEffect(ensured.showing, { kind: "tear-off-page", pageId: ensured.pageId, tabId: id });
			return withTabTornOff(tornOff, facts, id);
		}

		if (abilitiesOf(showing.moment.apps, tab.app).navigates) {
			return refusal(NO_OWN_WINDOW.replace("{id}", id));
		}

		if (!facts.canOpenOwnWindow) {
			return refusal(NO_OWN_WINDOWS);
		}

		return holdsTabs(showing.moment.apps, tab)
			? withChatTornOff(showing, id)
			: withPagelessTabTornOff(showing, facts, id);
	};
}

export function reloadPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		const page = tabPageOf(showing.moment, facts.pages, id);
		return page === undefined
			? refusal(NO_PAGE.replace("{id}", id))
			: withEffect(showing, { kind: "reload-page", pageId: page.pageId });
	};
}

export function showViewPlan(view: StudioView): MomentPlan<null> {
	return (moment) => {
		if (view !== "app" && !isPageApp(moment.apps, view)) {
			return refusal(NOT_A_PAGE_VIEW.replace("{view}", view));
		}

		if (moment.view === view) {
			console.info(`[widgetarium] show view ${view} skipped: it is shown already`);
			return movedPlan(moment, null, null);
		}

		return movedPlan(moment, { moment: { ...moment, view }, reason: `view ${moment.view} → ${view} (asked)` }, null);
	};
}

function splitShowingOf(showing: Showing, facts: TabFacts, tab: HostTab): Showing | null {
	if (splitOfTab(showing.moment, tab.id) !== null) {
		return withMoved(showing, focusedInSplit(showing.moment, tab.id));
	}

	const shown = shownSplitOf(showing.moment);

	if (shown === null) {
		return null;
	}

	const chatId = chatHomeOf(showing.moment, tab.id);

	if (chatId === null || !shown.memberIds.includes(chatId)) {
		return withSplitLeftAlone(showing, facts, tab);
	}

	console.info(`[widgetarium] show ${tab.id} inside chat ${chatId}, which stands in ${shown.id}`);
	return withTabPressed(withMoved(showing, focusedInSplit(showing.moment, chatId)), facts, tab);
}

function withLoneTabShown(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const apart = shownApartEffectOf(tab, showing.moment, facts);

	if (apart === null) {
		return withTabPressed(showing, facts, tab);
	}

	console.info(
		`[widgetarium] show ${tab.id}: ${apart.kind === "flash-pane" ? "reveal the pane holding it" : "focus its own window"}`,
	);
	return withEffect(showing, apart);
}

function withSplitLeftAlone(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const left = withSplitLeftFor(withMoved(showing, focusedInSplit(showing.moment, tab.id)));
	return withTabPressed(left, boardlessOf(facts), tab);
}

function shownApartEffectOf(tab: HostTab, moment: HostTabsMoment, facts: TabFacts): TabEffect | null {
	const window = facts.tabWindows.get(tab.id);

	if (window !== undefined) {
		return { kind: "focus-window", window };
	}

	const pane = facts.tabPanes.find(({ tabId }) => tabId === tab.id);

	if (pane !== undefined) {
		return { kind: "flash-pane", paneId: pane.paneId };
	}

	const pageId = tabPageOf(moment, facts.pages, tab.id)?.pageId ?? null;
	const isInOwnWindow = facts.pages.some((page) => page.pageId === pageId && page.isInOwnWindow);
	return pageId !== null && isInOwnWindow ? { kind: "focus-own-window", pageId } : null;
}

function withChatTornOff(showing: Showing, id: string): Showing {
	const unpaned = withEffect(showing, { kind: "close-chat-panes", chatIds: [id] });
	return withEffect(unpaned, { kind: "tear-off-tab", tabId: id, view: "chat" });
}

function withPagelessTabTornOff(showing: Showing, facts: TabFacts, id: string): Showing {
	const tornOff = withEffect(showing, { kind: "tear-off-tab", tabId: id, view: "app" });
	return withTabTornOff(tornOff, facts, id);
}

function withFocusFollowed(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const selected = withSelectionOn(showing, tab.id);

	if (!holdsTabs(showing.moment.apps, tab)) {
		return selected;
	}

	return withChatTabShown(selected, facts, tab.id);
}

function withSelectionOn(showing: Showing, id: string): Showing {
	const { selectedId } = showing.moment;

	if (selectedId === id || (selectedId !== null && chatHomeOf(showing.moment, selectedId) === id)) {
		console.info(`[widgetarium] ${id} focused: selection stays on ${selectedId}`);
		return showing;
	}

	return withMoved(showing, markSelected(showing.moment, id));
}

function withHolderShown(showing: Showing, facts: TabFacts, { tab, paneId }: HolderToShow): Showing {
	const apart = shownApartEffectOf(tab, showing.moment, facts);

	if (apart !== null) {
		console.info(`[widgetarium] show ${tab.id}: it stands apart (${apart.kind})`);
		return withEffect(showing, apart);
	}

	const focused = splitShowingOf(showing, facts, tab) ?? showing;
	const seen = withMoved(focused, markSeen(focused.moment, tab));
	return withEffect(seen, { kind: "show-chat", chatId: tab.id, paneId });
}
