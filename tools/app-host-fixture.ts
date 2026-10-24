import { app } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { MemoryEssentialsGateway } from "../packages/domain/app-host/gateways/essentials/memory.gateway.ts";
import { MemoryHostTabsGateway } from "../packages/domain/app-host/gateways/host-tabs/memory.gateway.ts";
import type { HostTabsGateway } from "../packages/domain/app-host/gateways/host-tabs/host-tabs.gateway.ts";
import { PaneFlashGateway } from "../packages/domain/app-host/gateways/pane-flash/pane-flash.gateway.ts";
import { MemoryShownViewGateway } from "../packages/domain/app-host/gateways/shown-view/memory.gateway.ts";
import { MemoryTabsColumnGateway } from "../packages/domain/app-host/gateways/tabs-column/memory.gateway.ts";
import { COLUMN_OPENED_ON } from "../packages/domain/app-host/shared/lib/tabs-column/column-look.ts";
import type { KeptEssentials } from "../packages/domain/app-host/shared/schema/essential.schema.ts";
import type { StudioView } from "../packages/domain/app-host/shared/schema/studio-view.schema.ts";
import type { KeptTabs } from "../packages/domain/app-host/shared/schema/tabs-session.schema.ts";
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

export const HOST_CHAT = "chat-1";

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

	override tearOff(tabId = ""): void {
		this.calls.push(`tear off ${tabId}`);
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
	readonly hostTabs: HostTabsGateway;
	readonly essentials: MemoryEssentialsGateway;
	readonly tabsColumn: MemoryTabsColumnGateway;
	readonly shownView: MemoryShownViewGateway;
	readonly paneFlash: RecordedPaneFlash;
}

export interface StudioFakes {
	readonly appHost: AppHostFakes;
	readonly pages: RecordedPagesGateway;
	readonly layout: LayoutParts;
	readonly studioApp: StartedApp;
}

export interface StudioSeed {
	readonly tabs?: KeptTabs | null;
	readonly hostTabs?: HostTabsGateway;
	readonly essentials?: KeptEssentials | null;
	readonly view?: StudioView;
	readonly pages?: readonly string[];
	readonly isBrowserAvailable?: boolean;
	readonly tree?: PaneTree;
	readonly chatTitle?: string;
}

export function appHostFakesOf({
	tabs = null,
	hostTabs,
	essentials = null,
	view = "browser",
}: StudioSeed): AppHostFakes {
	return {
		hostTabs: hostTabs ?? new MemoryHostTabsGateway(tabs),
		essentials: new MemoryEssentialsGateway(essentials),
		tabsColumn: new MemoryTabsColumnGateway(COLUMN_OPENED_ON),
		shownView: new MemoryShownViewGateway(view),
		paneFlash: new RecordedPaneFlash(),
	};
}

export function studioFakesOf(seed: StudioSeed = {}): StudioFakes {
	const appHost = appHostFakesOf(seed);
	const pages = new RecordedPagesGateway(seed.pages ?? [], seed.isBrowserAvailable ?? true);
	const layout = seed.tree === undefined ? partsOf() : partsOf(seed.tree);
	const studioApp = app()
		.modules(
			AppHostModule.with({ ...appHost }),
			BrowserModule.with(fakeBrowser(pages).parts),
			LayoutModule.with({ ...layout }),
			WorkspacesModule.with(workspacesOf(seed.chatTitle ?? null)),
			CommandMenuModule,
		)
		.start({ platform: "browser", scope: { workspaceId: "workspace-1" } });
	return {
		appHost,
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
					isPinned: false,
					createdAt: 1,
					lastAt: 1,
				},
			],
			activeId: HOST_CHAT,
		},
		marks: {},
	});
}
