import {
	flatTabIdsOf,
	givePage,
	markChatTabShown,
	markShown,
	openEssentialTab,
	tabOf,
} from "../host-tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, MovedTabs } from "../host-tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../host-tabs/tab-lists.js";
import type { AppKind } from "../../schema/app-tab.schema.js";
import type { KeptEssentials } from "../../schema/essential.schema.js";
import type { StudioView } from "../../schema/studio-view.schema.js";
import { chatHomeOf } from "./chat-home.js";
import { newTabPageOf } from "./new-tab-page.js";
import { tabIdsInPanesOf } from "./tab-facts.js";
import type { TabFacts } from "./tab-facts.js";
import { tabPageOf } from "./tab-pages.js";

export type TabEffect =
	| { readonly kind: "open-page"; readonly pageId: string }
	| { readonly kind: "close-page"; readonly pageId: string }
	| { readonly kind: "show-page"; readonly pageId: string }
	| { readonly kind: "open-address"; readonly pageId: string; readonly address: string; readonly isShown: boolean }
	| { readonly kind: "reload-page"; readonly pageId: string }
	| { readonly kind: "open-own-window"; readonly pageId: string }
	| { readonly kind: "focus-own-window"; readonly pageId: string }
	| { readonly kind: "focus-window"; readonly window: string }
	| { readonly kind: "tear-off-page"; readonly pageId: string; readonly tabId: string }
	| { readonly kind: "close-panes"; readonly tabIds: readonly string[] }
	| { readonly kind: "open-shown-tab-pane" }
	| { readonly kind: "close-shown-tab-pane" }
	| { readonly kind: "show-in-target-pane"; readonly tabId: string }
	| { readonly kind: "show-chat"; readonly chatId: string }
	| {
			readonly kind: "show-in-chat-group";
			readonly chatId: string;
			readonly tabId: string;
			readonly isOnlyWhenBare: boolean;
	  }
	| { readonly kind: "flash-pane"; readonly paneId: string };

export interface Showing {
	readonly moment: HostTabsMoment;
	readonly shownView: StudioView;
	readonly effects: readonly TabEffect[];
	readonly reasons: readonly string[];
}

export interface PageAsk {
	readonly tabId: string;
	readonly why: string;
}

export interface EnsuredPage {
	readonly showing: Showing;
	readonly pageId: string | null;
}

export function showingOf(moment: HostTabsMoment, shownView: StudioView): Showing {
	return {
		moment,
		shownView,
		effects: [],
		reasons: [],
	};
}

export function shownAppOf(view: StudioView): AppKind | null {
	return view === "app" ? null : view;
}

export function shownTabIdOf(moment: HostTabsMoment, shownApp: AppKind | null): string | null {
	if (shownApp === null) {
		return null;
	}

	const free = moment.tabs.filter((tab) => tab.app === shownApp && chatHomeOf(moment, tab.id) === null);
	return (free.find((tab) => tab.id === moment.shownId) ?? free[0])?.id ?? null;
}

export function withMoved(showing: Showing, moved: MovedTabs | null): Showing {
	if (moved === null) {
		return showing;
	}

	return {
		...showing,
		moment: moved.moment,
		reasons: [...showing.reasons, moved.reason],
	};
}

export function withEffect(showing: Showing, effect: TabEffect): Showing {
	return {
		...showing,
		effects: [...showing.effects, effect],
	};
}

export function withView(showing: Showing, view: StudioView, reason: string): Showing {
	if (showing.shownView === view) {
		return showing;
	}

	return {
		...showing,
		shownView: view,
		reasons: [...showing.reasons, `view ${showing.shownView} → ${view}, ${reason}`],
	};
}

export function withPageEnsured(showing: Showing, facts: TabFacts, { tabId, why }: PageAsk): EnsuredPage {
	const tab = tabOf(showing.moment, tabId);
	const pageId =
		tabPageOf(showing.moment, facts.pages, tabId)?.pageId ?? newTabPageOf(tab.app, facts.isBrowserAvailable);

	if (pageId === null) {
		return {
			showing,
			pageId,
		};
	}

	const given = withMoved(showing, givePage(showing.moment, { id: tabId, pageId, why }));
	const isListed = facts.pages.some((page) => page.pageId === pageId);

	if (isListed) {
		return {
			showing: given,
			pageId,
		};
	}

	const opened = withEffect(given, { kind: "open-page", pageId });
	return {
		showing:
			tab.lastAddress === null
				? opened
				: withEffect(opened, { kind: "open-address", pageId, address: tab.lastAddress, isShown: true }),
		pageId,
	};
}

export interface PageAddressing {
	readonly address: string;
	readonly isShown: boolean;
}

export interface ChatTabAsk {
	readonly tab: HostTab;
	readonly chatId: string;
	readonly isOnlyWhenBare: boolean;
	readonly isPressed: boolean;
}

export function withTabPressed(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const chatId = chatHomeOf(showing.moment, tab.id);
	return chatId === null
		? withTabShown(showing, facts, tab)
		: withChatTabPlaced(showing, facts, { tab, chatId, isOnlyWhenBare: false, isPressed: true });
}

export function withTabShown(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const chatId = chatHomeOf(showing.moment, tab.id);

	if (chatId !== null) {
		return withChatTabPlaced(showing, facts, { tab, chatId, isOnlyWhenBare: false, isPressed: false });
	}

	const marked = withMoved(showing, markShown(showing.moment, tab.id));
	const paneId = paneStandingFor(showing, facts, tab);

	if (paneId !== null) {
		return withEffect(marked, { kind: "flash-pane", paneId });
	}

	if (facts.hasTabTarget) {
		const targeted = withEffect(marked, { kind: "show-in-target-pane", tabId: tab.id });
		return withPageEnsured(targeted, facts, { tabId: tab.id, why: "shown in the target pane" }).showing;
	}

	const opened = withView(withEffect(marked, { kind: "open-shown-tab-pane" }), tab.app, `${tab.id} shown`);
	const ensured = withPageEnsured(opened, facts, { tabId: tab.id, why: "shown" });
	return ensured.pageId === null
		? ensured.showing
		: withEffect(ensured.showing, { kind: "show-page", pageId: ensured.pageId });
}

export function withChatTabPlaced(
	showing: Showing,
	facts: TabFacts,
	{ tab, chatId, isOnlyWhenBare, isPressed }: ChatTabAsk,
): Showing {
	const marked = withMoved(showing, markChatTabShown(showing.moment, tab.id, chatId));
	const standing = facts.tabPanes.find((pane) => pane.tabId === tab.id);

	if (standing !== undefined) {
		return withEffect(marked, { kind: "flash-pane", paneId: standing.paneId });
	}

	const isOnBoard = facts.chatGroupIds.includes(chatId);
	const window = facts.tabWindows.get(tab.id);

	if (window !== undefined) {
		return withEffect(marked, { kind: "focus-window", window });
	}

	if (!isOnBoard && !isPressed) {
		console.info(
			`[widgetarium] chat tab ${tab.id} stays off screen: chat ${chatId} is not on the board and nobody pressed the tab`,
		);
		return marked;
	}

	const opened = isOnBoard ? marked : withEffect(marked, { kind: "show-chat", chatId });
	const placed = withEffect(opened, { kind: "show-in-chat-group", chatId, tabId: tab.id, isOnlyWhenBare });
	return withPageEnsured(placed, facts, { tabId: tab.id, why: `shown in chat ${chatId}` }).showing;
}

export function withTabPageOpened(showing: Showing, tab: HostTab, { address, isShown }: PageAddressing): Showing {
	if (tab.pageId === null) {
		return showing;
	}

	const opened = withEffect(showing, { kind: "open-page", pageId: tab.pageId });
	return address === "" ? opened : withEffect(opened, { kind: "open-address", pageId: tab.pageId, address, isShown });
}

export function withChatTabShown(showing: Showing, facts: TabFacts, chatId: string): Showing {
	const { tabs, shownId } = showing.moment;
	const isEssentialShown = tabs.some((tab) => tab.id === shownId && tab.essentialId !== null);
	const shownNext = chatTabToShow(showing.moment, chatId);

	if (isEssentialShown) {
		console.info(`[widgetarium] host tabs keep essential ${shownId} on screen in chat ${chatId}`);
		return showing;
	}

	if (shownNext === null) {
		console.info(`[widgetarium] host tabs keep ${shownId ?? "nothing"} in chat ${chatId}`);
		return showing;
	}

	return withChatTabPlaced(showing, facts, {
		tab: tabOf(showing.moment, shownNext),
		chatId,
		isOnlyWhenBare: true,
		isPressed: false,
	});
}

export function chatTabToShow(moment: HostTabsMoment, chatId: string): string | null {
	const ids = flatTabIdsOf(moment, chatId);
	const last = moment.lastShown[chatId];
	return last !== undefined && ids.includes(last) ? last : (ids[0] ?? null);
}

export function withFreeTabBesidePanes(showing: Showing, facts: TabFacts): Showing {
	const inPanes = tabIdsInPanesOf(facts);
	const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.shownView));
	const shownPane = facts.tabPanes.find(({ tabId }) => tabId === shownId);

	if (shownId === null || shownPane === undefined || shownPane.paneId === facts.tabTargetId) {
		return showing;
	}

	const listed = flatTabIdsOf(showing.moment, WORKSPACE_LIST);
	const freeId = listed.find((id) => !inPanes.includes(id));
	console.info(`[widgetarium] shown tab ${shownId} → ${freeId ?? "none"} (${shownId} stands in its own pane now)`);

	if (freeId === undefined) {
		return withEffect(showing, { kind: "close-shown-tab-pane" });
	}

	return withTabShown(showing, facts, tabOf(showing.moment, freeId));
}

export function withTabTornOff(showing: Showing, facts: TabFacts, tabId: string): Showing {
	const isInPane = facts.tabPanes.some((pane) => pane.tabId === tabId);
	const unpaned = isInPane ? withEffect(showing, { kind: "close-panes", tabIds: [tabId] }) : showing;

	if (shownTabIdOf(unpaned.moment, shownAppOf(unpaned.shownView)) !== tabId) {
		return unpaned;
	}

	const inPanes = tabIdsInPanesOf(facts);
	const inOwnWindows = new Set(facts.pages.filter((page) => page.isInOwnWindow).map((page) => page.pageId));
	const listed = flatTabIdsOf(unpaned.moment, WORKSPACE_LIST);
	const freeId = listed.find((id) => {
		const pageId = tabOf(unpaned.moment, id).pageId;
		return id !== tabId && !inPanes.includes(id) && (pageId === null || !inOwnWindows.has(pageId));
	});
	console.info(`[widgetarium] shown tab ${tabId} → ${freeId ?? "none"} (${tabId} left for its own window)`);

	if (freeId === undefined) {
		return withEffect(unpaned, { kind: "close-shown-tab-pane" });
	}

	return withTabShown(unpaned, facts, tabOf(unpaned.moment, freeId));
}

export function withPanePagesEnsured(showing: Showing, facts: TabFacts): Showing {
	const held = new Set(showing.moment.tabs.map((tab) => tab.id));
	return tabIdsInPanesOf(facts)
		.filter((id) => held.has(id))
		.reduce((ensured, tabId) => withPageEnsured(ensured, facts, { tabId, why: "placed in a pane" }).showing, showing);
}

export function withFirstTabShown(showing: Showing, facts: TabFacts, essentials: KeptEssentials): Showing {
	const { moment } = showing;
	const shownApp = shownAppOf(showing.shownView);
	const shownId = shownTabIdOf(moment, shownApp);

	if (shownId !== null) {
		return withMoved(showing, markShown(moment, shownId));
	}

	const essential = essentials.essentials.find((one) => one.app === shownApp);

	if (essential) {
		const opened = openEssentialTab(moment, essential.id, {
			app: essential.app,
			pageId: null,
		});
		return withMoved(showing, opened);
	}

	const first = moment.tabs[0];
	console.info(
		`[widgetarium] studio opened on ${shownApp ?? "no app"} → ${first?.id ?? "nothing"} (no ${shownApp ?? ""} tab to show)`,
	);
	return first ? withTabShown(showing, facts, first) : showing;
}

function paneStandingFor(showing: Showing, facts: TabFacts, tab: HostTab): string | null {
	const pane = facts.tabPanes.find((standing) => standing.tabId === tab.id);

	if (pane !== undefined) {
		return pane.paneId;
	}

	return showing.moment.shownId === tab.id && tab.pageId !== null ? facts.shownTabPaneId : null;
}
