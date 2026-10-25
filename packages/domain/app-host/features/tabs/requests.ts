import { z } from "zod";
import { Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import type { AnyQuery } from "@widgetarium/core/requests";
import {
	AccessAsksChangedEvent,
	BrowserTabsQuery,
	InkActivityChangedEvent,
	PagesChangedEvent,
} from "@widgetarium/browser";
import { DropGoneTabsCommand, PanesChangedEvent } from "@widgetarium/layout";
import { ChatListQuery, ChatsChangedEvent } from "@widgetarium/workspaces";
import { EssentialsChangedEvent } from "../../gateways/essentials/essentials.events.js";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { HostTabsChangedEvent } from "../../gateways/host-tabs/host-tabs.events.js";
import { HostTabsGateway } from "../../gateways/host-tabs/host-tabs.gateway.js";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewChangedEvent } from "../../gateways/shown-view/shown-view.events.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { TabsColumnChangedEvent } from "../../gateways/tabs-column/tabs-column.events.js";
import { TabsColumnGateway } from "../../gateways/tabs-column/tabs-column.gateway.js";
import { sidebarViewOf } from "../../shared/lib/tabs-column/column-look.js";
import { essentialFaceOf } from "../../shared/lib/essentials/essential-face.js";
import { addEssential } from "../../shared/lib/essentials/essentials.js";
import { heldTabOf, makeEssential, placeTab } from "../../shared/lib/host-tabs/host-tabs.js";
import { forgetPages, rememberPages } from "../../shared/lib/host-tabs/page-memory.js";
import type { HostTab, HostTabsMoment } from "../../shared/lib/host-tabs/host-tabs.js";
import { WORKSPACE_LIST, chatOfGroup, isKnownList, listPlaceOf } from "../../shared/lib/host-tabs/tab-lists.js";
import {
	shownAppOf,
	shownTabIdOf,
	withChatTabShown,
	withTabPressed,
	withEffect,
	withFirstTabShown,
	withFreeTabBesidePanes,
	withMoved,
	withPageEnsured,
	withPanePagesEnsured,
} from "../../shared/lib/tab-showing/showing.js";
import { withHomeFollowed, withTabsAtHome } from "../../shared/lib/tab-showing/rehoming.js";
import type { Showing, TabEffect } from "../../shared/lib/tab-showing/showing.js";
import { tabIdsInPanesOf } from "../../shared/lib/tab-showing/tab-facts.js";
import type { TabFacts } from "../../shared/lib/tab-showing/tab-facts.js";
import { tabPageOf, tabPagesOf } from "../../shared/lib/tab-showing/tab-pages.js";
import {
	NOT_HELD,
	NO_OWN_WINDOW,
	factsOf,
	saveEssentials,
	sendLogged,
	settle,
	tabsNowOf,
} from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { AppTabsSchema, HeldTabsSchema, TabsSidebarSchema } from "../../shared/schema/app-tab.schema.js";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";
import { sidebarOf, tabRowsOf } from "./lib/tab-rows.js";

const UNKNOWN_LIST = 'no tab list "{list}" is on screen';
const GROUP_NOT_IN_LIST = 'no group "{group}" stands in the tab list "{list}"';
const NO_OWN_WINDOWS = "this host cannot open a page in its own window";
const ALL_PAGES = { heldTabId: null };
const TAB_PARTS = {
	hostTabs: HostTabsGateway,
	essentials: EssentialsGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};

interface OwnWindowOpening {
	readonly showing: Showing;
	readonly facts: TabFacts;
	readonly tab: HostTab;
}

export const AppTabsQuery = query("app-tabs")
	.output(AppTabsSchema)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		return {
			tabs: tabRowsOf(showing.moment, facts.pages, shownAppOf(showing.shownView), [
				WORKSPACE_LIST,
				...facts.chatGroupIds,
			]),
			canReopen: showing.moment.closed.length > 0,
		};
	});

export const TabsSidebarQuery = query("tabs-sidebar")
	.output(TabsSidebarSchema)
	.inject({
		...TAB_PARTS,
		tabsColumn: TabsColumnGateway,
	})
	.handle(async (_input, { send, tabsColumn, ...parts }) => {
		const [facts, chatList] = await Promise.all([factsOf(parts, send), send(ChatListQuery)]);
		const { showing, kept } = tabsNowOf(parts, facts);
		const chatRows = [...chatList.pinned, ...chatList.recents];
		return sidebarOf({
			moment: showing.moment,
			essentials: kept.essentials,
			pages: facts.pages,
			shownApp: shownAppOf(showing.shownView),
			boardChats: chatRows
				.filter((row) => facts.chatGroupIds.includes(row.id))
				.map((row) => ({ id: row.id, title: row.title })),
			shutLists: tabsColumn.column().shutLists,
			view: sidebarViewOf(tabsColumn.column()),
			inPanes: tabIdsInPanesOf(facts),
			hasShownTabPane: facts.shownTabPaneId !== null,
			elsewhere: [...facts.tabWindows.keys()],
		});
	});

export const HeldTabsQuery = query("held-tabs")
	.output(HeldTabsSchema)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const pages = tabPagesOf(showing.moment.tabs, facts.pages);
		return {
			tabs: showing.moment.tabs.map((tab) => ({
				id: tab.id,
				app: tab.app,
				label: tab.label,
				pageId: pages.get(tab.id)?.pageId ?? null,
			})),
			shownTabId: shownTabIdOf(showing.moment, shownAppOf(showing.shownView)),
		};
	});

export const CanOpenOwnWindowQuery = query("can-open-own-window")
	.output(z.boolean())
	.handle(async (_input, { send }) => (await send(BrowserTabsQuery, ALL_PAGES)).canOpenOwnWindow);

export const RestoreTabsCommand = command("restore-tabs")
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => {
		await parts.hostTabs.tabsLoaded();
		if (parts.hostTabs.opensBesideAnother()) {
			console.info(
				"[widgetarium] host tabs restore → skipped (this studio opens beside a running one; its pages live)",
			);
			const beside = await factsOf(parts, send);
			const { showing } = tabsNowOf(parts, beside);
			await settle(showing, withPanePagesEnsured(showing, beside), { parts, send });
			return;
		}

		const heldTabIds = parts.hostTabs.tabs()?.tabs.map(({ id }) => id) ?? [];
		await sendLogged("drop the panes of gone tabs", () => send(DropGoneTabsCommand, { heldTabIds }));
		const facts = await factsOf(parts, send);
		const { showing, kept } = tabsNowOf(parts, facts);
		const started = parts.hostTabs.keepsPagesAcrossStarts() ? showing : withMoved(showing, forgetPages(showing.moment));
		await settle(showing, withFirstTabShown(started, facts, kept), { parts, send });
	});

export const ShowTabCommand = command("show-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const apart = shownApartEffectOf(tab, showing.moment, facts);

		if (apart !== null) {
			console.info(
				`[widgetarium] show ${id}: ${apart.kind === "flash-pane" ? "reveal the pane holding it" : "focus its own window"}`,
			);
			return settle(showing, withEffect(showing, apart), { parts, send });
		}

		return settle(showing, withTabPressed(showing, facts, tab), { parts, send });
	});

export const ShowChatTabCommand = command("show-chat-tab")
	.input(z.object({ chatId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ chatId }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		return settle(showing, withChatTabShown(showing, facts, chatId), { parts, send });
	});

export const PlaceTabCommand = command("place-tab")
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id, to }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing, kept } = tabsNowOf(parts, facts);
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		if (to.kind === "list" && !isKnownList(showing.moment, to.list, facts.chatGroupIds)) {
			return refuse(UNKNOWN_LIST.replace("{list}", to.list));
		}

		if (to.kind === "list" && to.groupId !== null && chatOfGroup(showing.moment, to.groupId) !== to.list) {
			return refuse(GROUP_NOT_IN_LIST.replace("{group}", to.groupId).replace("{list}", to.list));
		}

		if (to.kind === "list") {
			const placed = withMoved(showing, placeTab(showing.moment, id, listPlaceOf(to)));
			return settle(showing, withHomeFollowed(showing, placed, facts), { parts, send });
		}

		if (to.kind === "own-window") {
			return openInOwnWindow({ showing, facts, tab }, { parts, send });
		}

		const added = addEssential(kept, essentialFaceOf(tab, showing.moment.tabs, facts.pages), to.at);
		saveEssentials(kept, added, parts.essentials);
		return settle(showing, withMoved(showing, makeEssential(showing.moment, id, added.id)), { parts, send });
	});

export const MoveTabToListCommand = command("move-tab-to-list")
	.input(z.object({ id: z.string(), list: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id, list }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);

		if (!heldTabOf(showing.moment, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		if (!isKnownList(showing.moment, list, facts.chatGroupIds)) {
			return refuse(UNKNOWN_LIST.replace("{list}", list));
		}

		const place = {
			chatId: list,
			groupId: null,
			before: null,
		};
		const placed = withMoved(showing, placeTab(showing.moment, id, place));
		return settle(showing, withHomeFollowed(showing, placed, facts), { parts, send });
	});

export const EnsurePanePagesSubscriber = subscriber(PanesChangedEvent)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, invalidate, ...parts }) => {
		invalidateTabReads(invalidate);
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const atHome = withTabsAtHome(showing, facts);
		const settled = atHome === showing ? withFreeTabBesidePanes(withPanePagesEnsured(showing, facts), facts) : atHome;
		await settle(showing, settled, { parts, send });
	});

export const RememberPagesSubscriber = subscriber(PagesChangedEvent)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		await settle(showing, withMoved(showing, rememberPages(showing.moment, facts.pages)), { parts, send });
	});

export const RereadTabsSubscriber = subscriber(HostTabsChangedEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const RereadTabsForShownViewSubscriber = subscriber(ShownViewChangedEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const RereadTabsForPagesSubscriber = subscriber(PagesChangedEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
	invalidate(CanOpenOwnWindowQuery);
});

export const RereadTabsForAccessAsksSubscriber = subscriber(AccessAsksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
});

export const RereadTabsForInkSubscriber = subscriber(InkActivityChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
});

export const RereadTabsForChatsSubscriber = subscriber(ChatsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
});

export const RereadSidebarForEssentialsSubscriber = subscriber(EssentialsChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(TabsSidebarQuery);
	},
);

export const RereadSidebarForColumnSubscriber = subscriber(TabsColumnChangedEvent).handle((_input, { invalidate }) => {
	invalidate(TabsSidebarQuery);
});

function invalidateTabReads(invalidate: (query: { readonly request: AnyQuery }) => void): void {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
	invalidate(HeldTabsQuery);
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

function openInOwnWindow(
	{ showing, facts, tab }: OwnWindowOpening,
	reach: TabsReach,
): ReturnType<typeof refuse> | Promise<void> {
	if (!facts.canOpenOwnWindow) {
		return refuse(NO_OWN_WINDOWS);
	}

	const ensured = withPageEnsured(showing, facts, { tabId: tab.id, why: "dropped outside the studio" });

	if (ensured.pageId === null) {
		return refuse(NO_OWN_WINDOW.replace("{id}", tab.id));
	}

	return settle(showing, withEffect(ensured.showing, { kind: "open-own-window", pageId: ensured.pageId }), reach);
}
