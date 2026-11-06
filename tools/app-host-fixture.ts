import { app } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { MemoryEssentialsGateway } from "../packages/domain/app-host/gateways/essentials/memory.gateway.ts";
import { MemoryStudioWindowGateway } from "../packages/domain/app-host/gateways/studio-window/memory.gateway.ts";
import type { StudioWindowGateway } from "../packages/domain/app-host/gateways/studio-window/studio-window.gateway.ts";
import { PaneFlashGateway } from "../packages/domain/app-host/gateways/pane-flash/pane-flash.gateway.ts";
import { NoCoreChangesGateway } from "../packages/domain/app-host/gateways/core-changes/none.gateway.ts";
import { MemoryShownViewGateway } from "../packages/domain/app-host/gateways/shown-view/memory.gateway.ts";
import type { KeptEssentials } from "../packages/domain/app-host/shared/schema/essential.schema.ts";
import type { StudioView } from "../packages/domain/app-host/shared/schema/studio-view.schema.ts";
import { PlacesModule } from "../packages/state/places/generated/contract.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { placedTabsOf, placesLinkOf } from "./places-fixture.ts";
import type { SeededTabs } from "./places-fixture.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { CommandMenuModule } from "../packages/domain/command-menu/module.ts";
import type { BrowserTab } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import type { PaneTree } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { partsOf } from "./layout-rules-checks.ts";
import { FIRST_PANES } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import { treeShowingChat } from "../packages/state/layout/shared/lib/pane-trees.ts";

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

	override openChatWindow(chatId = ""): void {
		this.calls.push(`chat window ${chatId}`);
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
	readonly essentials: MemoryEssentialsGateway;
	readonly shownView: MemoryShownViewGateway;
	readonly paneFlash: RecordedPaneFlash;
	readonly coreChanges: NoCoreChangesGateway;
}

export interface StudioFakes {
	readonly appHost: AppHostFakes;
	readonly places: MemoryTabsGateway;
	readonly pages: RecordedPagesGateway;
	readonly layout: LayoutParts;
	readonly studioApp: StartedApp;
}

export interface StudioSeed {
	readonly tabs?: SeededTabs | null;
	readonly places?: MemoryTabsGateway;
	readonly studioWindow?: StudioWindowGateway;
	readonly essentials?: KeptEssentials | null;
	readonly view?: StudioView;
	readonly pages?: readonly string[];
	readonly isBrowserAvailable?: boolean;
	readonly tree?: PaneTree;
	readonly chatTitle?: string;
}

export function appHostFakesOf({ studioWindow, essentials = null, view = "browser" }: StudioSeed): AppHostFakes {
	return {
		studioWindow: studioWindow ?? new MemoryStudioWindowGateway(),
		essentials: new MemoryEssentialsGateway(essentials),
		shownView: new MemoryShownViewGateway(view),
		paneFlash: new RecordedPaneFlash(),
		coreChanges: new NoCoreChangesGateway(),
	};
}

export function studioFakesOf(seed: StudioSeed = {}): StudioFakes {
	const appHost = appHostFakesOf(seed);
	const places = seed.places ?? new MemoryTabsGateway(placedTabsOf(seed.tabs ?? NO_TABS, [HOST_CHAT]));
	const pages = new RecordedPagesGateway(seed.pages ?? [], seed.isBrowserAvailable ?? true);
	const layout = partsOf(seed.tree ?? treeShowingChat(FIRST_PANES, HOST_CHAT, null));
	const studioApp = app()
		.modules(
			AppHostModule.with({ ...appHost }),
			BrowserModule.with(fakeBrowser(pages).parts),
			LayoutModule.with({ ...layout }),
			WorkspacesModule.with(workspacesOf(seed.chatTitle ?? null)),
			CommandMenuModule,
		)
		.imports(PlacesModule.over(placesLinkOf(places)))
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
			},
		],
		currentId: "home",
		chats: {
			chats: [
				{
					id: HOST_CHAT,
					title,
					createdAt: 1,
					lastAt: 1,
				},
			],
			openOnStartId: HOST_CHAT,
		},
	});
}
