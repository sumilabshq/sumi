import { EssentialsGateway } from "../packages/app-host/gateways/essentials/essentials.gateway.ts";
import { TabsSessionGateway } from "../packages/app-host/gateways/tabs-session/tabs-session.gateway.ts";
import type { KeptEssentials } from "../packages/app-host/shared/schema/essential.schema.ts";
import type { KeptTabs } from "../packages/app-host/shared/schema/tabs-session.schema.ts";
import { MemoryBrowserAuditGateway } from "../packages/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/browser/gateways/browser-grants/memory.gateway.ts";
import { browserPartsOf } from "../packages/browser/gateways/browser-parts/browser-parts.gateway.ts";
import type { BrowserParts } from "../packages/browser/gateways/browser-parts/browser-parts.gateway.ts";
import { NoChatComposerGateway } from "../packages/browser/gateways/chat-composer/none.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/browser/gateways/recent-sites/memory.gateway.ts";
import type { BrowserTab } from "../packages/browser/shared/schema/browser-tab.schema.ts";
import type { ActiveChatPort } from "../packages/core/src/engine/active-chat-port.ts";
import type { AssistantPort } from "../packages/core/src/engine/assistant-port.ts";
import { NO_STUDIO_HOST } from "../packages/core/src/engine/studio-host.ts";
import type { StudioStart } from "../apps/studio/src/legacy/widgetarium-studio.ts";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.ts";
import { startedAppHostParts } from "../apps/studio/src/tabs/studio-app-host.ts";
import { webLayoutParts } from "../packages/layout/gateways/layout-parts/web.gateway.ts";
import { FakeBrowserPagesGateway, HurriedClockGateway } from "./browser-fakes.ts";

export const TAURI_WORKSPACE = "Untitled workspace";
const CHAT_ID = "chat-new";
const BROWSER_FIRST_PAGE = "tab-1";
const NO_PAGE = 'the browser holds no tab "{tabId}"';

const NEW_CHAT: ActiveChatPort = {
	now: () => ({
		id: CHAT_ID,
		title: "New chat",
	}),
	watch: () => () => undefined,
};

const KEPT_ESSENTIALS: KeptEssentials = {
	essentials: [{ id: "essential-1", app: "canvas", address: null, title: "Canvas", favicon: null }],
	minted: 2,
};

const KEPT_TABS: KeptTabs = {
	tabs: [
		{ id: "tab-8", app: "browser", pageId: "page-restarted-a", label: null, essentialId: null },
		{ id: "tab-10", app: "browser", pageId: "page-restarted-b", label: null, essentialId: null },
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

class KeptTabsGateway extends TabsSessionGateway {
	kept(): KeptTabs {
		return KEPT_TABS;
	}

	keep(): void {}
}

class KeptEssentialsGateway extends EssentialsGateway {
	kept(): KeptEssentials {
		return KEPT_ESSENTIALS;
	}

	keep(): void {}
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
	};
}

function restartedBrowserParts(): BrowserParts {
	const pages = new RestartedPagesGateway();
	Object.assign(window, {
		__BROWSER_SHOWN__: () => pages.shownId(),
		__BROWSER_ADDRESSES__: () => Object.fromEntries(pages.tabs().map((page) => [page.id, page.url])),
	});
	return browserPartsOf({
		browserPagesGateway: pages,
		browserGrantsGateway: new MemoryBrowserGrantsGateway(),
		browserAuditGateway: new MemoryBrowserAuditGateway(),
		clockGateway: new HurriedClockGateway(),
		recentSitesGateway: new MemoryRecentSitesGateway(),
		chatComposerGateway: new NoChatComposerGateway(),
	});
}

export function tauriLikeStudioStart(assistant: AssistantPort): StudioStart {
	const state = createStudioState();
	const browser = restartedBrowserParts();
	const layout = webLayoutParts(TAURI_WORKSPACE);
	Object.assign(window, {
		__PLACE_TAB_IN_PANE__: (tabId: string) =>
			layout.paneTreeStore.place({ kind: "app", tabId }, { targetId: "pane-app", side: "right" }),
	});
	state.show("canvas");
	return {
		assistant,
		state,
		appId: TAURI_WORKSPACE,
		browser,
		activeChat: NEW_CHAT,
		layout,
		appHost: startedAppHostParts({
			state,
			browser,
			layout,
			workspace: TAURI_WORKSPACE,
			studio: NO_STUDIO_HOST,
			kept: {
				tabsSessionGateway: new KeptTabsGateway(),
				essentialsGateway: new KeptEssentialsGateway(),
				activeChat: NEW_CHAT,
			},
		}),
	};
}
