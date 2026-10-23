import { handler, refuse } from "@widgetarium/core/requests";
import { ActiveChatGateway } from "../../gateways/active-chat/active-chat.gateway.js";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { PageFactsGateway } from "../../gateways/page-facts/page-facts.gateway.js";
import { PaneTabsGateway } from "../../gateways/pane-tabs/pane-tabs.gateway.js";
import { essentialFaceOf } from "../../shared/lib/essentials/essential-face.js";
import { Essentials } from "../../shared/lib/essentials/essentials.js";
import { HostTabs, chatOfTab } from "../../shared/lib/host-tabs/host-tabs.js";
import type { HostTab } from "../../shared/lib/host-tabs/host-tabs.js";
import { WORKSPACE_LIST, isKnownList, listPlaceOf } from "../../shared/lib/host-tabs/tab-lists.js";
import { showChatTab } from "../../shared/lib/tab-showing/chat-tabs.js";
import { closeTabs } from "../../shared/lib/tab-showing/close-tab.js";
import { newTabPageOf } from "../../shared/lib/tab-showing/new-tab-page.js";
import { openTabPage, showTab, shownTabIdOf } from "../../shared/lib/tab-showing/show-tab.js";
import { tabPageOf } from "../../shared/lib/tab-showing/tab-pages.js";
import { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import {
	AppTabsQuery,
	CloseOtherTabsCommand,
	CloseShownTabCommand,
	CloseTabCommand,
	DuplicateTabCommand,
	MoveTabToListCommand,
	OpenTabBelowCommand,
	OpenTabCommand,
	PlaceTabCommand,
	ReloadTabCommand,
	RenameTabCommand,
	ReopenClosedTabCommand,
	ShowChatTabCommand,
	ShowTabCommand,
	TabsSidebarQuery,
} from "./contract.js";
import { AppHostClientModule } from "../../module.js";
import { tabRowsOf, sidebarOf } from "./lib/tab-rows.js";
import { watchTabs } from "./lib/watch-tabs.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NO_PAGE = 'the tab "{id}" shows no browser page';
const UNKNOWN_LIST = 'no tab list "{list}" is on screen';
const NO_OWN_WINDOW = 'the tab "{id}" holds no page that can open in its own window';
const NOTHING_CLOSED = "no closed tab is left to reopen";
const TABS = {
	appTabsGateway: AppTabsGateway,
	pageFactsGateway: PageFactsGateway,
	hostTabs: HostTabs,
	essentials: Essentials,
	activeChatGateway: ActiveChatGateway,
	tabsColumnStore: TabsColumnStore,
	paneTabsGateway: PaneTabsGateway,
};

export const AppTabsQueryHandler = handler(AppTabsQuery, AppHostClientModule)
	.inject(TABS)
	.watch((_input, parts, changed) => watchTabs(parts, changed))
	.handle((_input, { appTabsGateway, pageFactsGateway, hostTabs, activeChatGateway }) => ({
		tabs: tabRowsOf(hostTabs.now(), pageFactsGateway.pages(), appTabsGateway.shownApp(), [
			WORKSPACE_LIST,
			activeChatGateway.now().id,
		]),
		canReopen: hostTabs.now().closed.length > 0,
	}));

export const TabsSidebarQueryHandler = handler(TabsSidebarQuery, AppHostClientModule)
	.inject(TABS)
	.watch((_input, parts, changed) => watchTabs(parts, changed))
	.handle((_input, parts) => {
		const { id, title } = parts.activeChatGateway.now();
		return sidebarOf({
			moment: parts.hostTabs.now(),
			essentials: parts.essentials.now().essentials,
			pages: parts.pageFactsGateway.pages(),
			shownApp: parts.appTabsGateway.shownApp(),
			chat: {
				id,
				title,
			},
			shutLists: parts.tabsColumnStore.now().shutLists,
			inPanes: parts.paneTabsGateway.tabIdsInPanes(),
		});
	});

export const ShowTabCommandHandler = handler(ShowTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, paneTabsGateway, ...showing }) => {
		const tab = heldTabOf(hostTabs, id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		if (isShownApart(tab, { hostTabs, paneTabsGateway, pageFactsGateway: showing.pageFactsGateway })) {
			return;
		}

		hostTabs.show(id);
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const ShowChatTabCommandHandler = handler(ShowChatTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle((_input, { hostTabs, activeChatGateway, ...showing }) =>
		showChatTab(hostTabs, activeChatGateway.now().id, showing),
	);

export const OpenTabCommandHandler = handler(OpenTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ app }, { hostTabs, ...showing }) => {
		const tab = hostTabs.open(
			{
				app,
				pageId: newTabPageOf(app, showing.pageFactsGateway.isAvailable()),
			},
			{
				chatId: WORKSPACE_LIST,
				groupId: null,
				before: null,
			},
		);
		openTabPage(tab, "", showing);
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const OpenTabBelowCommandHandler = handler(OpenTabBelowCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		if (!heldTabOf(hostTabs, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const tab = hostTabs.openAfter(id, {
			app: "browser",
			pageId: newTabPageOf("browser", showing.pageFactsGateway.isAvailable()),
		});
		openTabPage(tab, "", showing);
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const DuplicateTabCommandHandler = handler(DuplicateTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		const source = heldTabOf(hostTabs, id);

		if (!source) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const address = tabPageOf(hostTabs, showing.pageFactsGateway, id)?.address ?? "";
		const tab = hostTabs.openAfter(id, {
			app: source.app,
			pageId: newTabPageOf(source.app, showing.pageFactsGateway.isAvailable()),
		});
		openTabPage(tab, address, showing);
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const ReloadTabCommandHandler = handler(ReloadTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, pageFactsGateway }) => {
		const page = tabPageOf(hostTabs, pageFactsGateway, id);

		if (!page) {
			return refuse(NO_PAGE.replace("{id}", id));
		}

		pageFactsGateway.reloadPage(page.pageId);
	});

export const RenameTabCommandHandler = handler(RenameTabCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id, label }, { hostTabs }) => {
		if (!heldTabOf(hostTabs, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		hostTabs.rename(id, label);
	});

export const CloseOtherTabsCommandHandler = handler(CloseOtherTabsCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		const kept = heldTabOf(hostTabs, id);

		if (!kept) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const listId = chatOfTab(hostTabs.now(), id) ?? WORKSPACE_LIST;
		const others = tabRowsOf(hostTabs.now(), [], null, [listId])
			.map((row) => row.id)
			.filter((other) => other !== id);
		closeTabs(others, hostTabs, showing, `close ${others.length} tabs beside ${id}`);
	});

export const ReopenClosedTabCommandHandler = handler(ReopenClosedTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle((_input, { hostTabs, activeChatGateway, ...showing }) => {
		const reopened = hostTabs.reopenClosed(activeChatGateway.now().id);

		if (!reopened) {
			return refuse(NOTHING_CLOSED);
		}

		openTabPage(reopened.tab, reopened.address, showing);
		showTab(reopened.tab, hostTabs.now().tabs, showing);
	});

export const CloseTabCommandHandler = handler(CloseTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		if (!heldTabOf(hostTabs, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		closeTabs([id], hostTabs, showing, `close ${id}`);
	});

export const CloseShownTabCommandHandler = handler(CloseShownTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle((_input, { hostTabs, ...showing }) => {
		const shownId = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp());

		if (shownId === null) {
			return refuse("no tab is shown");
		}

		closeTabs([shownId], hostTabs, showing, `close the shown ${shownId}`);
	});

export const PlaceTabCommandHandler = handler(PlaceTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id, to }, { hostTabs, essentials, pageFactsGateway, activeChatGateway }) => {
		const tab = heldTabOf(hostTabs, id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		if (to.kind === "list") {
			return isKnownList(hostTabs.now(), to.list, activeChatGateway.now().id)
				? hostTabs.place(id, listPlaceOf(to))
				: refuse(UNKNOWN_LIST.replace("{list}", to.list));
		}

		if (to.kind === "window") {
			return openInOwnWindow(tab, hostTabs, pageFactsGateway);
		}

		const essentialId = essentials.add(essentialFaceOf(tab, hostTabs.now().tabs, pageFactsGateway.pages()), to.at);
		hostTabs.makeEssential(id, essentialId);
	});

export const MoveTabToListCommandHandler = handler(MoveTabToListCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id, list }, { hostTabs, activeChatGateway }) => {
		if (!heldTabOf(hostTabs, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		if (!isKnownList(hostTabs.now(), list, activeChatGateway.now().id)) {
			return refuse(UNKNOWN_LIST.replace("{list}", list));
		}

		hostTabs.place(id, {
			chatId: list,
			groupId: null,
			before: null,
		});
	});

interface ApartShowing {
	readonly hostTabs: HostTabs;
	readonly paneTabsGateway: PaneTabsGateway;
	readonly pageFactsGateway: PageFactsGateway;
}

function isShownApart(tab: HostTab, { hostTabs, paneTabsGateway, pageFactsGateway }: ApartShowing): boolean {
	if (paneTabsGateway.tabIdsInPanes().includes(tab.id)) {
		paneTabsGateway.reveal(tab.id);
		return true;
	}

	const ownWindowPage = ownWindowPageOf(tab, hostTabs, pageFactsGateway);

	if (ownWindowPage === null) {
		return false;
	}

	pageFactsGateway.focusPageWindow(ownWindowPage);
	return true;
}

function ownWindowPageOf(tab: HostTab, hostTabs: HostTabs, pageFactsGateway: PageFactsGateway): string | null {
	const pageId = tabPageOf(hostTabs, pageFactsGateway, tab.id)?.pageId ?? null;
	const isInOwnWindow = pageFactsGateway.pages().some((page) => page.pageId === pageId && page.isInOwnWindow);
	return isInOwnWindow ? pageId : null;
}

function openInOwnWindow(
	tab: HostTab,
	hostTabs: HostTabs,
	pageFactsGateway: PageFactsGateway,
): ReturnType<typeof refuse> | undefined {
	const pageId = tabPageOf(hostTabs, pageFactsGateway, tab.id)?.pageId ?? null;

	if (tab.app !== "browser" || pageId === null) {
		return refuse(NO_OWN_WINDOW.replace("{id}", tab.id));
	}

	pageFactsGateway.openPageInOwnWindow(pageId);
	return undefined;
}

function heldTabOf(hostTabs: HostTabs, id: string): HostTab | undefined {
	return hostTabs.now().tabs.find((tab) => tab.id === id);
}
