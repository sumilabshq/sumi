import { handler, refuse } from "@widgetarium/core/requests";
import { ActiveChatGateway } from "../../gateways/active-chat/active-chat.gateway.js";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { PageFactsGateway } from "../../gateways/page-facts/page-facts.gateway.js";
import { essentialFaceOf } from "../../shared/lib/essentials/essential-face.js";
import { Essentials } from "../../shared/lib/essentials/essentials.js";
import { HostTabs, chatOfTab } from "../../shared/lib/host-tabs/host-tabs.js";
import type { HostTab } from "../../shared/lib/host-tabs/host-tabs.js";
import { listPlaceOf } from "../../shared/lib/host-tabs/tab-lists.js";
import { showChatTab } from "../../shared/lib/tab-showing/chat-tabs.js";
import { closeTabs } from "../../shared/lib/tab-showing/close-tab.js";
import { newTabPageOf } from "../../shared/lib/tab-showing/new-tab-page.js";
import { openTabPage, showTab, shownTabIdOf } from "../../shared/lib/tab-showing/show-tab.js";
import { tabPagesOf } from "../../shared/lib/tab-showing/tab-pages.js";
import { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import {
	AppTabsQuery,
	CloseOtherTabsCommand,
	CloseShownTabCommand,
	CloseTabCommand,
	DuplicateTabCommand,
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
import { chatTabRowsOf, sidebarOf } from "./lib/tab-rows.js";
import { watchTabs } from "./lib/watch-tabs.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NO_PAGE = 'the tab "{id}" shows no browser page';
const NOTHING_CLOSED = "no closed tab is left to reopen";
const TABS = {
	appTabsGateway: AppTabsGateway,
	pageFactsGateway: PageFactsGateway,
	hostTabs: HostTabs,
	essentials: Essentials,
	activeChatGateway: ActiveChatGateway,
	tabsColumnStore: TabsColumnStore,
};

export const AppTabsQueryHandler = handler(AppTabsQuery, AppHostClientModule)
	.inject(TABS)
	.watch((_input, parts, changed) => watchTabs(parts, changed))
	.handle((_input, { appTabsGateway, pageFactsGateway, hostTabs, activeChatGateway }) => ({
		tabs: chatTabRowsOf(
			hostTabs.now(),
			pageFactsGateway.pages(),
			appTabsGateway.shownApp(),
			activeChatGateway.now().id,
		),
		canReopen: hostTabs.now().closed.length > 0,
	}));

export const TabsSidebarQueryHandler = handler(TabsSidebarQuery, AppHostClientModule)
	.inject(TABS)
	.watch((_input, parts, changed) => watchTabs(parts, changed))
	.handle((_input, { appTabsGateway, pageFactsGateway, hostTabs, essentials, activeChatGateway, tabsColumnStore }) => {
		const chat = activeChatGateway.now();
		return sidebarOf({
			moment: hostTabs.now(),
			essentials: essentials.now().essentials,
			pages: pageFactsGateway.pages(),
			shownApp: appTabsGateway.shownApp(),
			chat: {
				id: chat.id,
				title: chat.title,
			},
			isListOpen: tabsColumnStore.now().isListOpen,
		});
	});

export const ShowTabCommandHandler = handler(ShowTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		const tab = heldTabOf(hostTabs, id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
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
	.handle(({ app }, { hostTabs, activeChatGateway, ...showing }) => {
		const tab = hostTabs.open(
			{
				app,
				pageId: newTabPageOf(app, showing.pageFactsGateway.isAvailable()),
			},
			{
				chatId: activeChatGateway.now().id,
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

		const address = tabPagesOf(hostTabs.now().tabs, showing.pageFactsGateway.pages()).get(id)?.address ?? "";
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
		const page = tabPagesOf(hostTabs.now().tabs, pageFactsGateway.pages()).get(id);

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
	.handle(({ id }, { hostTabs, activeChatGateway, ...showing }) => {
		const kept = heldTabOf(hostTabs, id);

		if (!kept) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const chatId = chatOfTab(hostTabs.now(), id) ?? activeChatGateway.now().id;
		const others = chatTabRowsOf(hostTabs.now(), [], null, chatId)
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
	.handle(({ id, to }, { hostTabs, essentials, activeChatGateway, pageFactsGateway }) => {
		const tab = heldTabOf(hostTabs, id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		if (to.kind === "list") {
			hostTabs.place(id, listPlaceOf(to, activeChatGateway.now().id));
			return;
		}

		const essentialId = essentials.add(essentialFaceOf(tab, hostTabs.now().tabs, pageFactsGateway.pages()), to.at);
		hostTabs.makeEssential(id, essentialId);
	});

function heldTabOf(hostTabs: HostTabs, id: string): HostTab | undefined {
	return hostTabs.now().tabs.find((tab) => tab.id === id);
}
