import { closeGroup, closeTabs } from "../tabs/tab-closing.js";
import { chatIdOf } from "../tabs/host-tabs.js";
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

export function withTabsGone(showing: Showing, facts: TabFacts, closing: TabsClosing): Showing {
	return goneShowing(showing, facts, (pages) => closeTabs(showing.moment, pages, closing));
}

export function withGroupClosed(showing: Showing, facts: TabFacts, group: TabGroup): Showing {
	return withClosing(showing, facts, (pages) => closeGroup(showing.moment, group, pages));
}

function withClosing(showing: Showing, facts: TabFacts, closing: (pages: TabPages) => MovedTabs): Showing {
	const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.moment.view));
	const released = goneShowing(showing, facts, closing);

	if (shownId === null || released.moment.tabs.some((tab) => tab.id === shownId)) {
		return released;
	}

	return withNextTabShown(released, facts);
}

function goneShowing(showing: Showing, facts: TabFacts, closing: (pages: TabPages) => MovedTabs): Showing {
	const pages = tabPagesOf(showing.moment.tabs, facts.pages);
	const closed = withMoved(showing, closing(pages));
	const held = new Set(closed.moment.tabs.map((tab) => tab.id));
	const gone = showing.moment.tabs.filter((tab) => !held.has(tab.id));
	return withReleasedPages(withPanesOfGoneClosed(closed, gone), pages, held);
}

function withPanesOfGoneClosed(showing: Showing, gone: readonly HostTab[]): Showing {
	const panesClosed = withEffect(showing, { kind: "close-panes", tabIds: gone.map((tab) => tab.id) });
	const stillLinked = new Set(showing.moment.tabs.flatMap((tab) => chatIdOf(showing.moment.apps, tab) ?? []));
	const chatIds = gone.flatMap((tab) => chatIdOf(showing.moment.apps, tab) ?? []).filter((id) => !stillLinked.has(id));
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
