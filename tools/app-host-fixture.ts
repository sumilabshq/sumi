import { PluginAppsModule } from "./plugin-apps-fixture.ts";
import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime, StartableModule } from "../packages/shared/data-framework/src/index.ts";
import { appHost as appHostModule } from "../plugins/tabs/navigation/data/app-host/generated/module.ts";
import { MemoryStudioWindowGateway } from "../plugins/tabs/navigation/data/app-host/gateways/studio-window/memory.gateway.ts";
import type { StudioWindowGateway } from "../plugins/tabs/navigation/data/app-host/gateways/studio-window/studio-window.gateway.ts";
import { PaneFlashGateway } from "../plugins/tabs/navigation/data/app-host/gateways/pane-flash/pane-flash.gateway.ts";
import { NoCoreChangesGateway } from "../plugins/tabs/navigation/data/app-host/gateways/core-changes/none.gateway.ts";
import { MemorySidePeeksGateway } from "../plugins/tabs/navigation/data/app-host/gateways/side-peeks/memory.gateway.ts";
import type { StudioView } from "../plugins/tabs/navigation/data/app-host/shared/schema/studio-view.schema.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { tabGroups } from "../plugins/tabs/tab-groups/data/tab-groups/generated/contract.ts";
import { navigation as placesContract } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { apps as appsContract } from "../plugins/apps/data/apps/generated/contract.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { placedTabsOf, placesLinkOf, withWindowView } from "./places-fixture.ts";
import type { SeededTabs } from "./places-fixture.ts";
import { browser } from "../packages/domain/browser/generated/module.ts";
import { PLUGIN_WINDOW_MODULES } from "./command-menu-fixture.ts";
import type { BrowserTab } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import { layout as layoutModule } from "../packages/state/layout/generated/module.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import { serverLayoutParts } from "../packages/state/layout/gateways/layout-parts/server.gateway.ts";
import type { PaneTree } from "../plugins/tabs/navigation/data/navigation/shared/schema/pane-tree.schema.ts";
import { workspaces } from "../packages/domain/workspaces/generated/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { placedWithTree } from "./pane-harness.ts";
import { FIRST_PANES } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import { treeShowingChat } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/pane-trees.ts";

export const HOST_CHAT = "chat-1";

const NO_TABS: SeededTabs = {
	tabs: [],
	shownId: null,
	minted: 0,
	closed: [],
};

export class RecordedPagesGateway extends FakeBrowserPagesGateway {
	readonly calls: string[] = [];

	constructor(
		private held: readonly string[],
		private readonly isBrowserAvailable = true,
	) {
		super();
	}

	override isAvailable(): boolean {
		return this.isBrowserAvailable;
	}

	override tabs(): readonly BrowserTab[] {
		return this.held.map((id) => ({
			...this.tab,
			id,
			url: "",
			title: "",
		}));
	}

	override create(tabId: string): void {
		if (this.held.includes(tabId)) {
			return;
		}

		this.calls.push(`open ${tabId}`);
		this.held = [...this.held, tabId];
		this.told();
	}

	override close(tabId: string): void {
		this.calls.push(`close ${tabId}`);
		this.held = this.held.filter((id) => id !== tabId);
		this.told();
	}

	override show(tabId: string): void {
		this.calls.push(`show ${tabId}`);
	}

	override openTabWindow(tabId = "", view = ""): void {
		this.calls.push(`${view} window ${tabId}`);
	}

	override tearOff(tabId = "", openWith = ""): void {
		this.calls.push(`tear off ${tabId} as ${openWith}`);
	}

	override openInOwnWindow(tabId: string): void {
		this.calls.push(`own window ${tabId}`);
		super.openInOwnWindow(tabId);
	}
}

export class RecordedPaneFlash extends PaneFlashGateway {
	readonly flashed: string[] = [];

	flashPane(paneId: string): void {
		this.flashed.push(paneId);
	}
}

export interface AppHostFakes {
	readonly studioWindow: StudioWindowGateway;
	readonly paneFlash: RecordedPaneFlash;
	readonly coreChanges: NoCoreChangesGateway;
	readonly sidePeeks: MemorySidePeeksGateway;
}

export interface StudioFakes {
	readonly appHost: AppHostFakes;
	readonly places: MemoryTabsGateway;
	readonly pages: RecordedPagesGateway;
	readonly layout: LayoutParts;
	readonly studioApp: Runtime;
}

export interface StudioSeed {
	readonly tabs?: SeededTabs | null;
	readonly places?: MemoryTabsGateway;
	readonly studioWindow?: StudioWindowGateway;
	readonly view?: StudioView;
	readonly pages?: readonly string[];
	readonly isBrowserAvailable?: boolean;
	readonly tree?: PaneTree;
	readonly chatTitle?: string;
	readonly isAppsInCore?: boolean;
	readonly extraModules?: readonly StartableModule[];
}

export function appHostFakesOf({ studioWindow }: StudioSeed): AppHostFakes {
	return {
		studioWindow: studioWindow ?? new MemoryStudioWindowGateway(),
		paneFlash: new RecordedPaneFlash(),
		coreChanges: new NoCoreChangesGateway(),
		sidePeeks: new MemorySidePeeksGateway(),
	};
}

export function studioFakesOf(seed: StudioSeed = {}): StudioFakes {
	const appHost = appHostFakesOf(seed);
	const places = seed.places ?? createSeededPlaces(seed, appHost.studioWindow.placesWindow());
	const pages = new RecordedPagesGateway(seed.pages ?? [], seed.isBrowserAvailable ?? true);
	const layout = serverLayoutParts();
	const isAppsInCore = seed.isAppsInCore === true;
	const core = placesLinkOf(places, isAppsInCore ? [PluginAppsModule] : []);
	const studioApp = runtime()
		.modules(
			appHostModule({ injects: { ...appHost } }),
			...(isAppsInCore ? [] : [PluginAppsModule]),
			browser({ injects: fakeBrowser(pages).parts }),
			layoutModule({ injects: { ...layout } }),
			workspaces({ injects: workspacesOf(seed.chatTitle ?? null) }),
			...PLUGIN_WINDOW_MODULES,
			...(seed.extraModules ?? []),
		)
		.imports(placesContract({ over: core }), tabGroups({ over: core }), chatFacts({ over: core }), ...(isAppsInCore ? [appsContract({ over: core })] : []))
		.start({ platform: "browser", scope: { workspaceId: "workspace-1" } });
	return {
		appHost,
		places,
		pages,
		layout,
		studioApp,
	};
}

function workspacesOf(title: string | null): ReturnType<typeof memoryWorkspacesParts> {
	return memoryWorkspacesParts({
		workspaces: [
			{
				id: "home",
				name: "Home",
				icon: null,
				ink: "yellow",
			},
		],
		currentId: "home",
		chats: {
			chats: [
				{
					id: HOST_CHAT,
					title,
					titleBy: "ask",
					createdAt: 1,
					lastAt: 1,
					archivedAt: null,
				},
			],
			openOnStartId: HOST_CHAT,
		},
	});
}

function createSeededPlaces({ tabs, view = "browser", tree }: StudioSeed, window: string): MemoryTabsGateway {
	const placed = withWindowView(placedTabsOf(tabs ?? NO_TABS, [HOST_CHAT]), view);
	return new MemoryTabsGateway(placedWithTree(placed, window, tree ?? treeShowingChat(FIRST_PANES, HOST_CHAT, null)));
}
