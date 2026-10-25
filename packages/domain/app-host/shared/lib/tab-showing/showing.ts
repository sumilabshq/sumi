import { flatTabIdsOf, givePage, markShown, openEssentialTab, tabOf } from "../host-tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, MovedTabs } from "../host-tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../host-tabs/tab-lists.js";
import type { AppKind } from "../../schema/app-tab.schema.js";
import type { KeptEssentials } from "../../schema/essential.schema.js";
import type { StudioView } from "../../schema/studio-view.schema.js";
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
	| { readonly kind: "tear-off-page"; readonly pageId: string }
	| { readonly kind: "close-panes"; readonly tabIds: readonly string[] }
	| { readonly kind: "open-shown-tab-pane" }
	| { readonly kind: "close-shown-tab-pane" }
	| { readonly kind: "show-in-target-pane"; readonly tabId: string }
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

export function shownTabIdOf({ tabs, shownId }: HostTabsMoment, shownApp: AppKind | null): string | null {
	if (shownApp === null) {
		return null;
	}

	const remembered = tabs.find((tab) => tab.id === shownId && tab.app === shownApp);
	return (remembered ?? tabs.find((tab) => tab.app === shownApp))?.id ?? null;
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
	return {
		showing: isListed ? given : withEffect(given, { kind: "open-page", pageId }),
		pageId,
	};
}

export interface PageAddressing {
	readonly address: string;
	readonly isShown: boolean;
}

export function withTabShown(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	const marked = withMoved(showing, markShown(showing.moment, tab.id));
	const pane = facts.tabPanes.find(({ tabId }) => tabId === tab.id);

	if (pane !== undefined) {
		return withEffect(marked, { kind: "flash-pane", paneId: pane.paneId });
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

export function withTabPageOpened(showing: Showing, tab: HostTab, { address, isShown }: PageAddressing): Showing {
	if (tab.pageId === null) {
		return showing;
	}

	const opened = withEffect(showing, { kind: "open-page", pageId: tab.pageId });
	return address === "" ? opened : withEffect(opened, { kind: "open-address", pageId: tab.pageId, address, isShown });
}

export function withChatTabShown(showing: Showing, facts: TabFacts): Showing {
	const { tabs, shownId } = showing.moment;
	const chatId = facts.chat.id;
	const isEssentialShown = tabs.some((tab) => tab.id === shownId && tab.essentialId !== null);
	const shownNext = chatTabToShow(showing.moment, chatId);

	if (isEssentialShown) {
		console.info(`[widgetarium] host tabs keep essential ${shownId} on screen in chat ${chatId}`);
		return showing;
	}

	if (shownNext === null || shownNext === shownId) {
		console.info(`[widgetarium] host tabs keep ${shownId ?? "nothing"} in chat ${chatId}`);
		return showing;
	}

	return withTabShown(showing, facts, tabOf(showing.moment, shownNext));
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

	const listed = [...flatTabIdsOf(showing.moment, facts.chat.id), ...flatTabIdsOf(showing.moment, WORKSPACE_LIST)];
	const freeId = listed.find((id) => !inPanes.includes(id));
	console.info(`[widgetarium] shown tab ${shownId} → ${freeId ?? "none"} (${shownId} stands in its own pane now)`);

	if (freeId === undefined) {
		return withEffect(showing, { kind: "close-shown-tab-pane" });
	}

	return withTabShown(showing, facts, tabOf(showing.moment, freeId));
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
