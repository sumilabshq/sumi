import { MemoryEssentialsGateway } from "../packages/domain/app-host/gateways/essentials/memory.gateway.ts";
import { MemoryStudioWindowGateway } from "../packages/domain/app-host/gateways/studio-window/memory.gateway.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { placedTabsOf } from "./places-fixture.ts";
import type { SeededTabs } from "./places-fixture.ts";
import { NoPaneFlashGateway } from "../packages/domain/app-host/gateways/pane-flash/none.gateway.ts";
import { MemoryShownViewGateway } from "../packages/domain/app-host/gateways/shown-view/memory.gateway.ts";
import { MemoryTabsColumnGateway } from "../packages/domain/app-host/gateways/tabs-column/memory.gateway.ts";
import { COLUMN_OPENED_ON } from "../packages/domain/app-host/shared/lib/tabs-column/column-look.ts";
import type { KeptEssentials } from "../packages/domain/app-host/shared/schema/essential.schema.ts";
import { MemoryBrowserAuditGateway } from "../packages/domain/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/memory.gateway.ts";
import { browserPartsOf } from "../packages/domain/browser/gateways/browser-parts/memory.gateway.ts";
import type { BrowserParts } from "../packages/domain/browser/gateways/browser-parts/browser-parts.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/domain/browser/gateways/recent-sites/memory.gateway.ts";
import type { BrowserTab } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import type { AssistantPort } from "../packages/shared/core/src/engine/assistant-port.ts";
import type { StudioStart } from "../apps/studio/src/legacy/widgetarium-studio.ts";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.ts";
import { restoreTabs } from "../apps/studio/src/tabs/studio-app.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { PlacePaneCommand } from "../packages/state/layout/generated/contract.ts";
import type { PaneSide, PaneView } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";
import { CreateChatCommand, RenameChatCommand } from "../packages/domain/workspaces/generated/contract.ts";
import { FakeBrowserPagesGateway, HurriedClockGateway } from "./browser-fakes.ts";
import { studioAppOf } from "./studio-app-fixture.ts";

export const TAURI_WORKSPACE = "Untitled workspace";
const CHAT_ID = "chat-new";
const BROWSER_FIRST_PAGE = "tab-1";
const NO_PAGE = 'the browser holds no tab "{tabId}"';

const KEPT_ESSENTIALS: KeptEssentials = {
	essentials: [{ id: "essential-1", app: "canvas", address: null, title: "Canvas", favicon: null }],
	minted: 2,
};

const KEPT_TABS: SeededTabs = {
	tabs: [
		{
			id: "tab-8",
			app: "browser",
			pageId: "page-restarted-a",
			label: null,
			essentialId: null,
			lastAddress: null,
			lastTitle: null,
			lastFavicon: null,
		},
		{
			id: "tab-10",
			app: "browser",
			pageId: "page-restarted-b",
			label: null,
			essentialId: null,
			lastAddress: null,
			lastTitle: null,
			lastFavicon: null,
		},
	],
	lists: {
		[CHAT_ID]: [
			{ kind: "group", id: "group-9" },
			{ kind: "tab", id: "tab-10" },
		],
	},
	groups: [{ id: "group-9", name: "Test group", hue: null, isOpen: true, tabIds: ["tab-8"] }],
	shownId: "tab-8",
	lastShown: { [CHAT_ID]: "tab-8" },
	minted: 10,
	closed: [],
};

export function tauriLikeStudioStart(assistant: AssistantPort): StudioStart {
	const studioApp = studioAppOf({
		browser: restartedBrowserParts(),
		appHost: {
			studioWindow: new MemoryStudioWindowGateway(),
			essentials: new MemoryEssentialsGateway(KEPT_ESSENTIALS),
			tabsColumn: new MemoryTabsColumnGateway(COLUMN_OPENED_ON),
			shownView: new MemoryShownViewGateway("canvas"),
			paneFlash: new NoPaneFlashGateway(),
		},
		workspaces: newChatWorkspaces(),
		workspaceId: TAURI_WORKSPACE,
		places: new MemoryTabsGateway(placedTabsOf(KEPT_TABS, [CHAT_ID])),
	});
	void restoreTabs(studioApp);
	Object.assign(window, {
		__PLACE_TAB_IN_PANE__: (tabId: string) =>
			studioApp.send(PlacePaneCommand, {
				view: { kind: "app", tabId },
				targetId: "pane-app",
				side: "right",
			}),
		__PLACE_PANE__: (view: PaneView, targetId: string | null, side: PaneSide) =>
			studioApp.send(PlacePaneCommand, { view, targetId, side }),
		__CREATE_CHAT__: () => studioApp.send(CreateChatCommand, { title: null }),
		__RENAME_CHAT__: (id: string, title: string) => studioApp.send(RenameChatCommand, { id, title }),
	});
	return {
		assistant,
		state: createStudioState(studioApp),
		appId: TAURI_WORKSPACE,
		studioApp,
	};
}

function newChatWorkspaces(): ReturnType<typeof memoryWorkspacesParts> {
	return memoryWorkspacesParts({
		workspaces: [
			{
				id: TAURI_WORKSPACE,
				name: TAURI_WORKSPACE,
				icon: null,
			},
		],
		currentId: TAURI_WORKSPACE,
		chats: {
			chats: [
				{
					id: CHAT_ID,
					title: null,
					isPinned: false,
					createdAt: 1,
					lastAt: 1,
				},
			],
			openOnStartId: CHAT_ID,
		},
		marks: {},
	});
}

function pageOf(id: string): BrowserTab {
	return {
		id,
		url: "",
		title: "New tab",
		favicon: null,
		isLoading: false,
		canGoBack: false,
		canGoForward: false,
		failure: null,
		window: null,
	};
}

function restartedBrowserParts(): BrowserParts {
	const pages = new RestartedPagesGateway();
	Object.assign(window, {
		__BROWSER_SHOWN__: () => pages.shownId(),
		__BROWSER_ADDRESSES__: () => Object.fromEntries(pages.tabs().map((page) => [page.id, page.url])),
	});
	return browserPartsOf(
		{
			browserPages: pages,
			browserGrants: new MemoryBrowserGrantsGateway(),
			browserAudit: new MemoryBrowserAuditGateway(),

			recentSites: new MemoryRecentSitesGateway(),
		},
		new HurriedClockGateway(),
	);
}

class RestartedPagesGateway extends FakeBrowserPagesGateway {
	private held: readonly BrowserTab[] = [pageOf(BROWSER_FIRST_PAGE)];
	private shown: string | null = BROWSER_FIRST_PAGE;

	override tabs(): readonly BrowserTab[] {
		return this.held;
	}

	override shownId(): string | null {
		return this.shown;
	}

	override create(tabId: string): void {
		if (this.held.some((page) => page.id === tabId)) {
			return;
		}

		this.held = [...this.held, pageOf(tabId)];
		this.told();
	}

	override show(tabId: string): void {
		this.heldPageOf(tabId);
		this.shown = tabId;
		this.told();
	}

	override open(tabId: string, url: string): void {
		this.heldPageOf(tabId);
		this.held = this.held.map((page) => (page.id === tabId ? { ...page, url, title: url } : page));
		this.told();
	}

	override freeze(tabId: string): void {
		this.heldPageOf(tabId);
	}

	override thaw(tabId: string): void {
		this.heldPageOf(tabId);
	}

	private heldPageOf(tabId: string): BrowserTab {
		const page = this.held.find((one) => one.id === tabId);

		if (!page) {
			throw new Error(NO_PAGE.replace("{tabId}", tabId));
		}

		return page;
	}
}
