import { app } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { CommandMenuModule } from "../packages/domain/command-menu/module.ts";
import { MemoryEssentialsGateway } from "../packages/domain/app-host/gateways/essentials/memory.gateway.ts";
import { MemoryHostTabsGateway } from "../packages/domain/app-host/gateways/host-tabs/memory.gateway.ts";
import { NoPaneFlashGateway } from "../packages/domain/app-host/gateways/pane-flash/none.gateway.ts";
import { MemoryShownViewGateway } from "../packages/domain/app-host/gateways/shown-view/memory.gateway.ts";
import { MemoryTabsColumnGateway } from "../packages/domain/app-host/gateways/tabs-column/memory.gateway.ts";
import type { KeptEssentials } from "../packages/domain/app-host/shared/schema/essential.schema.ts";
import type { KeptTabs } from "../packages/domain/app-host/shared/schema/tabs-session.schema.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import type { BrowserTab } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { ShowChatInPaneCommand } from "../packages/state/layout/generated/contract.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { OpenChatCommand } from "../packages/domain/app-host/generated/contract.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import type { WorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";

export const EXACT_WORKSPACE = "Exact tabs";
export const EXACT_COLUMN_PX = 240;
export const TEAR_OFF_ASKED: string[] = [];

const RELEASE_CHAT = "chat-release";

interface BoardChat {
	readonly id: string;
	readonly title: string;
}

const CHATS: readonly BoardChat[] = [
	{
		id: "chat-release",
		title: "Release plan",
	},
	{
		id: "chat-translator",
		title: "Translator",
	},
];

interface BoardPage {
	readonly id: string;
	readonly title: string;
	readonly url: string;
}

const PAGES: readonly BoardPage[] = [
	{ id: "page-2", title: "Release plan.md", url: "https://files.local/notes/Release%20plan.md" },
	{ id: "page-3", title: "widget.tsx", url: "https://files.local/src/widget.tsx" },
	{ id: "page-4", title: "ginetik/widgetarium", url: "https://github.com/ginetik/widgetarium" },
	{ id: "page-5", title: "Material 3 Expressive", url: "https://m3.material.io/" },
	{ id: "page-7", title: "Invoices.csv", url: "https://files.local/Invoices.csv" },
	{ id: "page-8", title: "MON-1445 Translation gadget", url: "https://jira.local/browse/MON-1445" },
	{ id: "page-10", title: "Phrasebook.md", url: "https://files.local/Phrasebook.md" },
	{ id: "page-11", title: "DeepL API docs", url: "https://developers.deepl.com/" },
];

const SITE_ESSENTIALS: readonly (readonly [string, string])[] = [
	["GitHub", "https://github.com/"],
	["Files", "https://files.local/"],
	["Routines", "https://routines.local/"],
	["Mail", "https://mail.google.com/"],
	["Calendar", "https://calendar.google.com/"],
	["Figma", "https://figma.com/"],
	["Jira", "https://jira.local/"],
];

const KEPT_ESSENTIALS: KeptEssentials = {
	essentials: [
		{ id: "essential-1", app: "canvas", address: null, title: "Canvas", favicon: null },
		...SITE_ESSENTIALS.map(([title, address], at) => ({
			id: `essential-${at + 2}`,
			app: "browser" as const,
			address,
			title,
			favicon: null,
		})),
	],
	minted: 8,
};

const KEPT_TABS: KeptTabs = {
	tabs: [
		{
			id: "tab-1",
			app: "canvas",
			pageId: null,
			label: null,
			essentialId: "essential-1",
			lastAddress: null,
			lastTitle: null,
			lastFavicon: null,
		},
		browserTab("tab-2", "page-2"),
		browserTab("tab-3", "page-3"),
		browserTab("tab-4", "page-4"),
		browserTab("tab-5", "page-5"),
		{
			id: "tab-6",
			app: "canvas",
			pageId: null,
			label: "Canvas · Release board",
			essentialId: null,
			lastAddress: null,
			lastTitle: null,
			lastFavicon: null,
		},
		browserTab("tab-7", "page-7"),
		browserTab("tab-8", "page-8"),
		{
			id: "tab-9",
			app: "canvas",
			pageId: null,
			label: "Translator",
			essentialId: null,
			lastAddress: null,
			lastTitle: null,
			lastFavicon: null,
		},
		browserTab("tab-10", "page-10"),
		browserTab("tab-11", "page-11"),
	],
	lists: {
		"chat-release": [
			{ kind: "group", id: "group-12" },
			{ kind: "group", id: "group-13" },
			{ kind: "tab", id: "tab-7" },
			{ kind: "tab", id: "tab-8" },
		],
		"chat-translator": [
			{ kind: "tab", id: "tab-9" },
			{ kind: "tab", id: "tab-10" },
			{ kind: "tab", id: "tab-11" },
		],
	},
	groups: [
		{ id: "group-12", name: "Ship", hue: null, isOpen: true, tabIds: ["tab-2", "tab-3", "tab-4"] },
		{ id: "group-13", name: "Research", hue: "blue", isOpen: true, tabIds: ["tab-5", "tab-6"] },
	],
	shownId: "tab-2",
	lastShown: { "chat-release": "tab-2" },
	minted: 13,
	closed: [],
};

export const NO_ESSENTIALS: KeptEssentials = { essentials: [], minted: 0 };

export interface ExactStudioAsk {
	readonly essentials?: KeptEssentials;
	readonly workspaces?: WorkspacesParts;
	readonly releaseChatId?: string;
}

export interface ExactStudio {
	readonly studioApp: StartedApp;
	readonly hostTabs: MemoryHostTabsGateway;
	readonly essentials: MemoryEssentialsGateway;
	readonly switchChat: (id: string) => void;
	readonly holdElsewhere: (pageId: string) => void;
}

export function exactStudio({
	essentials = KEPT_ESSENTIALS,
	workspaces = boardChats(),
	releaseChatId = RELEASE_CHAT,
}: ExactStudioAsk = {}): ExactStudio {
	const hostTabs = new MemoryHostTabsGateway(keptTabsIn(releaseChatId));
	const keptEssentials = new MemoryEssentialsGateway(essentials);
	const boardPages = new BoardPagesGateway();
	const studioApp = app()
		.modules(
			AppHostModule.with({
				hostTabs,
				essentials: keptEssentials,
				tabsColumn: new MemoryTabsColumnGateway({
					fullPx: EXACT_COLUMN_PX,
					side: "end",
					shutLists: [],
					hidesEmptyLists: false,
					hidesOwnWindowTabs: false,
				}),
				shownView: new MemoryShownViewGateway("browser"),
				paneFlash: new NoPaneFlashGateway(),
			}),
			BrowserModule.with(fakeBrowser(boardPages).parts),
			LayoutModule,
			WorkspacesModule.with(workspaces),
			CommandMenuModule,
		)
		.start({ platform: "browser", scope: { workspaceId: EXACT_WORKSPACE } });
	void studioApp.send(ShowChatInPaneCommand, { chatId: releaseChatId, paneId: null });
	return {
		studioApp,
		hostTabs,
		essentials: keptEssentials,
		switchChat: (id) => void studioApp.send(OpenChatCommand, { chatId: id, paneId: null }),
		holdElsewhere: (pageId) => boardPages.holdElsewhere(pageId),
	};
}

function keptTabsIn(releaseChatId: string): KeptTabs {
	const { [RELEASE_CHAT]: release = [], ...otherLists } = KEPT_TABS.lists ?? {};
	return {
		...KEPT_TABS,
		lists: {
			...otherLists,
			[releaseChatId]: release,
		},
		lastShown: { [releaseChatId]: "tab-2" },
	};
}

function boardChats(): WorkspacesParts {
	return memoryWorkspacesParts({
		workspaces: [
			{
				id: "exact",
				name: EXACT_WORKSPACE,
				icon: null,
			},
		],
		currentId: "exact",
		chats: {
			chats: CHATS.map((chat, at) => ({
				id: chat.id,
				title: chat.title,
				isPinned: false,
				createdAt: at + 1,
				lastAt: at + 1,
			})),
			openOnStartId: CHATS[0]?.id ?? "chat-release",
		},
		marks: {},
	});
}

class BoardPagesGateway extends FakeBrowserPagesGateway {
	private held: readonly BrowserTab[] = PAGES.map((page) => this.boardTabOf(page.id, page.title, page.url));

	override tabs(): readonly BrowserTab[] {
		return this.held;
	}

	override create(tabId: string): void {
		if (this.held.some((page) => page.id === tabId)) {
			return;
		}

		this.change([...this.held, this.boardTabOf(tabId, "New tab", "")]);
	}

	override close(tabId: string): void {
		this.change(this.held.filter((page) => page.id !== tabId));
	}

	override show(): void {}

	override tearOff(tabId = "", openWith = ""): void {
		TEAR_OFF_ASKED.push(`tear off ${tabId} as ${openWith}`);
	}

	override openInOwnWindow(tabId: string): void {
		super.openInOwnWindow(tabId);
		this.told();
	}

	override open(tabId: string, url: string): void {
		this.change(
			this.held.map((page) =>
				page.id === tabId
					? {
							...page,
							url,
							title: new URL(url).host,
						}
					: page,
			),
		);
	}

	holdElsewhere(pageId: string): void {
		this.openInOwnWindow(pageId);
	}

	private change(next: readonly BrowserTab[]): void {
		this.held = next;
		this.told();
	}

	private boardTabOf(id: string, title: string, url: string): BrowserTab {
		return {
			...this.tab,
			id,
			title,
			url,
			favicon: null,
			failure: null,
		};
	}
}

function browserTab(id: string, pageId: string): KeptTabs["tabs"][number] {
	return {
		id,
		app: "browser",
		pageId,
		label: null,
		essentialId: null,
		lastAddress: null,
		lastTitle: null,
		lastFavicon: null,
	};
}
