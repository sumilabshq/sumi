import { ONE_CHAT } from "@widgetarium/core/engine/active-chat-port.js";
import type { ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { Essentials } from "../../shared/lib/essentials/essentials.js";
import { shownTabIdOf } from "../../shared/lib/tab-showing/show-tab.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import { COLUMN_OPENED_ON } from "../../shared/lib/tabs-column/column-look.js";
import { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import type { AppKind } from "../../shared/schema/app-tab.schema.js";
import { PortActiveChatGateway } from "../active-chat/port.gateway.js";
import { StudioStateAppTabsGateway } from "../app-tabs/studio-state.gateway.js";
import type { EssentialsGateway } from "../essentials/essentials.gateway.js";
import { LocalStorageEssentialsGateway } from "../essentials/local-storage.gateway.js";
import { NoPageFactsGateway } from "../page-facts/none.gateway.js";
import type { PageFactsGateway } from "../page-facts/page-facts.gateway.js";
import { NoPaneTabsGateway } from "../pane-tabs/none.gateway.js";
import type { PaneTabsGateway } from "../pane-tabs/pane-tabs.gateway.js";
import { LocalStorageTabsColumnGateway } from "../tabs-column/local-storage.gateway.js";
import type { TabsColumnGateway } from "../tabs-column/tabs-column.gateway.js";
import { NoTabsSessionGateway } from "../tabs-session/none.gateway.js";
import type { TabsSessionGateway } from "../tabs-session/tabs-session.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export interface StudioAppHost {
	readonly studioState: StudioState;
	readonly workspace: string;
	readonly pageFactsGateway?: PageFactsGateway;
	readonly tabsColumnGateway?: TabsColumnGateway;
	readonly tabsSessionGateway?: TabsSessionGateway;
	readonly essentialsGateway?: EssentialsGateway;
	readonly activeChat?: ActiveChatPort;
	readonly paneTabsGateway?: PaneTabsGateway;
}

interface StudioGateways {
	readonly appTabsGateway: StudioStateAppTabsGateway;
	readonly pageFactsGateway: PageFactsGateway;
	readonly tabsColumnGateway: TabsColumnGateway;
	readonly tabsSessionGateway: TabsSessionGateway;
	readonly essentialsGateway: EssentialsGateway;
	readonly activeChat: ActiveChatPort;
}

export function studioAppHostParts(host: StudioAppHost): AppHostParts {
	const gateways = studioGatewaysOf(host);
	const hostTabs = keptHostTabsOf(gateways.tabsSessionGateway, gateways.activeChat.now().id);
	const essentials = keptEssentialsOf(gateways.essentialsGateway);
	showsFirstTab(hostTabs, essentials, gateways.appTabsGateway.shownApp());
	return {
		appTabsGateway: gateways.appTabsGateway,
		pageFactsGateway: gateways.pageFactsGateway,
		tabsColumnGateway: gateways.tabsColumnGateway,
		hostTabs,
		essentials,
		activeChatGateway: new PortActiveChatGateway(gateways.activeChat),
		tabsColumnStore: new TabsColumnStore(gateways.tabsColumnGateway.kept() ?? COLUMN_OPENED_ON),
		paneTabsGateway: host.paneTabsGateway ?? new NoPaneTabsGateway(),
	};
}

function studioGatewaysOf(host: StudioAppHost): StudioGateways {
	return {
		appTabsGateway: new StudioStateAppTabsGateway(host.studioState),
		pageFactsGateway: host.pageFactsGateway ?? new NoPageFactsGateway(),
		tabsColumnGateway: host.tabsColumnGateway ?? new LocalStorageTabsColumnGateway(host.workspace),
		tabsSessionGateway: host.tabsSessionGateway ?? new NoTabsSessionGateway(),
		essentialsGateway: host.essentialsGateway ?? new LocalStorageEssentialsGateway(),
		activeChat: host.activeChat ?? ONE_CHAT,
	};
}

function keptHostTabsOf(gateway: TabsSessionGateway, chatId: string): HostTabs {
	const hostTabs = new HostTabs(gateway.kept(), chatId);
	hostTabs.watch(() => gateway.keep(hostTabs.now()));
	return hostTabs;
}

function keptEssentialsOf(gateway: EssentialsGateway): Essentials {
	const essentials = new Essentials(gateway.kept());
	essentials.watch(() => gateway.keep(essentials.now()));
	return essentials;
}

function showsFirstTab(hostTabs: HostTabs, essentials: Essentials, shownApp: AppKind | null): void {
	const shownId = shownTabIdOf(hostTabs.now(), shownApp);

	if (shownId !== null) {
		hostTabs.show(shownId);
		return;
	}

	const essential = essentials.now().essentials.find((one) => one.app === shownApp);

	if (essential) {
		hostTabs.openEssential(essential.id, {
			app: essential.app,
			pageId: null,
		});
	}
}
