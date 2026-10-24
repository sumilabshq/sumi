import { closeGroup, closeTabs } from "../host-tabs/host-tabs.js";
import type { MovedTabs, TabGroup, TabPage, TabsClosing } from "../host-tabs/host-tabs.js";
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
	const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.shownView));
	const pages = tabPagesOf(showing.moment.tabs, facts.pages);
	const before = showing.moment.tabs.map((tab) => tab.id);
	const closed = withMoved(showing, closing(pages));
	const held = new Set(closed.moment.tabs.map((tab) => tab.id));
	const panesClosed = withEffect(closed, { kind: "close-panes", tabIds: before.filter((id) => !held.has(id)) });
	const released = withReleasedPages(panesClosed, pages, held);

	if (shownId === null || held.has(shownId)) {
		return released;
	}

	return withNextTabShown(released, facts);
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
