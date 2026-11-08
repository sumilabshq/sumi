import { holdsTabs } from "../tabs/app-abilities.js";
import { closeGroup, closeTabs } from "../tabs/tab-closing.js";
import type { HostTab, MovedTabs, TabGroup, TabPage } from "../tabs/host-tabs.js";
import type { TabsClosing } from "../tabs/tab-closing.js";
import { shownAppOf, shownTabIdOf, withEffect, withMoved, withTabShown, withView } from "./showing.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";
import { tabPagesOf } from "./tab-pages.js";

type TabPages = ReadonlyMap<string, TabPage>;

export function withTabsClosed(showing: Showing, facts: TabFacts, closing: TabsClosing): Showing {
	return withClosing(showing, facts, (pages) => closeTabs(showing.moment, pages, closing));
}

export function withGroupClosed(showing: Showing, facts: TabFacts, group: TabGroup): Showing {
	return withClosing(showing, facts, (pages) => closeGroup(showing.moment, group, pages));
}

function withClosing(showing: Showing, facts: TabFacts, closing: (pages: TabPages) => MovedTabs): Showing {
	const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.moment.view));
	const pages = tabPagesOf(showing.moment.tabs, facts.pages);
	const closed = withMoved(showing, closing(pages));
	const held = new Set(closed.moment.tabs.map((tab) => tab.id));
	const gone = showing.moment.tabs.filter((tab) => !held.has(tab.id));
	const released = withReleasedPages(withPanesOfGoneClosed(closed, gone), pages, held);

	if (shownId === null || held.has(shownId)) {
		return released;
	}

	return withNextTabShown(released, facts);
}

function withPanesOfGoneClosed(showing: Showing, gone: readonly HostTab[]): Showing {
	const panesClosed = withEffect(showing, { kind: "close-panes", tabIds: gone.map((tab) => tab.id) });
	const chatIds = gone.filter((tab) => holdsTabs(showing.moment.apps, tab)).map((tab) => tab.id);
	if (chatIds.length === 0) {
		return panesClosed;
	}

	return withEffect(panesClosed, { kind: "close-chat-panes", chatIds });
}

function withReleasedPages(showing: Showing, pages: TabPages, held: ReadonlySet<string>): Showing {
	return [...pages]
		.filter(([tabId]) => !held.has(tabId))
		.reduce((released, [, page]) => withEffect(released, { kind: "close-page", pageId: page.pageId }), showing);
}

function withNextTabShown(showing: Showing, facts: TabFacts): Showing {
	const { tabs, shownId } = showing.moment;
	const next = tabs.find((tab) => tab.id === shownId);

	if (!next) {
		return withView(showing, "app", "no tab is left to show");
	}

	return withTabShown(showing, facts, next);
}
