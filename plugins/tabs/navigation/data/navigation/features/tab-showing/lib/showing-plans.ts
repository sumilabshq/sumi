import type { RestoreTabsAsk, ShowTabAsk } from "../../../shared/schema/tab-asks.schema.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import type { StudioView } from "../../../shared/schema/tabs.schema.js";
import { shownSplitOf } from "../../../shared/lib/splits/split-members.js";
import { withShownTab } from "../../../shared/lib/showing/tab-shown.js";
import type { Showing } from "../../../shared/lib/showing/showing.js";
import {
	withEffect,
	withFirstTabShown,
	withFreeTabBesidePanes,
	withMoved,
	withPageEnsured,
	withPanePagesEnsured,
	withTabTornOff,
} from "../../../shared/lib/showing/showing.js";
import type { TabFacts } from "../../../shared/lib/showing/tab-facts.js";
import { tabPageOf } from "../../../shared/lib/showing/tab-pages.js";
import { abilitiesOf, isChatTab, isPageApp } from "../../../shared/lib/tabs/app-abilities.js";
import { chatIdOf, heldTabOf, markSelected } from "../../../shared/lib/tabs/host-tabs.js";
import { forgetPages, rememberPages } from "../../../shared/lib/tabs/page-memory.js";

export const NOT_HELD = 'the host holds no tab "{id}"';
export const NO_OWN_WINDOW = 'the tab "{id}" holds no page that can open in its own window';

const NO_OWN_WINDOWS = "this host cannot open a page in its own window";
const NO_PAGE = 'the tab "{id}" shows no browser page';
const NOT_A_PAGE_VIEW = 'the view "{view}" names no app whose tabs run in a page';

export function restorePlan({ isBeside, keepsPages }: Omit<RestoreTabsAsk, "at">): ShowingPlan {
	return (showing, facts) => {
		if (isBeside) {
			console.info("[widgetarium] host tabs restore → panes only (this studio opens beside a running one)");
			return withPanePagesEnsured(showing, facts);
		}

		const started = keepsPages ? showing : withMoved(showing, forgetPages(showing.moment));
		return withFirstTabShown(started, facts);
	};
}

export function showTabPlan({ id, paneId, isFollowingFocus }: Omit<ShowTabAsk, "at">): ShowingPlan {
	return (showing, facts) => {
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		if (isFollowingFocus) {
			return withSelectionOn(showing, id);
		}

		return withShownTab(withMoved(showing, markSelected(showing.moment, id)), facts, {
			tab,
			paneId,
		});
	};
}

export function fitTabsPlan(): ShowingPlan {
	return (showing, facts) => {
		if (shownSplitOf(showing.moment) !== null) {
			return withPanePagesEnsured(showing, facts);
		}

		return withFreeTabBesidePanes(withPanePagesEnsured(showing, facts), facts);
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

		return isChatTab(showing.moment.apps, tab)
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

function withChatTornOff(showing: Showing, id: string): Showing {
	const held = heldTabOf(showing.moment, id);
	const chatId = held === undefined ? id : (chatIdOf(showing.moment.apps, held) ?? id);
	const unpaned = withEffect(showing, { kind: "close-chat-panes", chatIds: [chatId] });
	return withEffect(unpaned, { kind: "tear-off-tab", tabId: id, view: "chat" });
}

function withPagelessTabTornOff(showing: Showing, facts: TabFacts, id: string): Showing {
	const tornOff = withEffect(showing, { kind: "tear-off-tab", tabId: id, view: "app" });
	return withTabTornOff(tornOff, facts, id);
}

function withSelectionOn(showing: Showing, id: string): Showing {
	const { selectedId } = showing.moment;

	if (selectedId === id) {
		console.info(`[widgetarium] ${id} focused: selection stays on ${selectedId}`);
		return showing;
	}

	return withMoved(showing, markSelected(showing.moment, id));
}
