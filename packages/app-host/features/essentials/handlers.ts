import { handler, refuse } from "@widgetarium/core/requests";
import { ActiveChatGateway } from "../../gateways/active-chat/active-chat.gateway.js";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { PageFactsGateway } from "../../gateways/page-facts/page-facts.gateway.js";
import { Essentials } from "../../shared/lib/essentials/essentials.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import type { HostTab, OpenedTab } from "../../shared/lib/host-tabs/host-tabs.js";
import { listPlaceOf } from "../../shared/lib/host-tabs/tab-lists.js";
import { closeTabs } from "../../shared/lib/tab-showing/close-tab.js";
import { newTabPageOf } from "../../shared/lib/tab-showing/new-tab-page.js";
import { openTabPage, showTab } from "../../shared/lib/tab-showing/show-tab.js";
import type { Essential } from "../../shared/schema/essential.schema.js";
import type { TabDrop } from "../../shared/schema/tab-drop.schema.js";
import {
	CloseEssentialCommand,
	PlaceEssentialCommand,
	RemoveEssentialCommand,
	ShowEssentialCommand,
} from "./contract.js";
import { AppHostClientModule } from "../../module.js";

const NO_ESSENTIAL = 'no essential "{id}"';
const NOT_OPEN = 'the essential "{id}" is not open';
const ESSENTIALS = {
	appTabsGateway: AppTabsGateway,
	pageFactsGateway: PageFactsGateway,
	hostTabs: HostTabs,
	essentials: Essentials,
	activeChatGateway: ActiveChatGateway,
};

export const ShowEssentialCommandHandler = handler(ShowEssentialCommand, AppHostClientModule)
	.inject(ESSENTIALS)
	.handle(({ id }, parts) => {
		const essential = findEssential(parts.essentials, id);

		if (!essential) {
			return refuse(NO_ESSENTIAL.replace("{id}", id));
		}

		const live = liveTabOf(parts.hostTabs, id);

		if (live) {
			parts.hostTabs.show(live.id);
			showTab(live, parts.hostTabs.now().tabs, parts);
			return;
		}

		showOpened(parts.hostTabs.openEssential(id, freshTabOf(essential, parts.pageFactsGateway)), essential, parts);
	});

export const RemoveEssentialCommandHandler = handler(RemoveEssentialCommand, AppHostClientModule)
	.inject(ESSENTIALS)
	.handle(({ id }, parts) => {
		if (!findEssential(parts.essentials, id)) {
			return refuse(NO_ESSENTIAL.replace("{id}", id));
		}

		releaseEssential(
			id,
			{
				kind: "list",
				groupId: null,
				before: null,
			},
			parts,
		);
	});

export const CloseEssentialCommandHandler = handler(CloseEssentialCommand, AppHostClientModule)
	.inject(ESSENTIALS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		const live = liveTabOf(hostTabs, id);

		if (!live) {
			return refuse(NOT_OPEN.replace("{id}", id));
		}

		closeTabs([live.id], hostTabs, showing, `close essential ${id}`);
	});

export const PlaceEssentialCommandHandler = handler(PlaceEssentialCommand, AppHostClientModule)
	.inject(ESSENTIALS)
	.handle(({ id, to }, parts) => {
		if (!findEssential(parts.essentials, id)) {
			return refuse(NO_ESSENTIAL.replace("{id}", id));
		}

		if (to.kind === "essentials") {
			parts.essentials.move(id, to.at);
			return;
		}

		releaseEssential(id, to, parts);
	});

interface EssentialParts {
	readonly hostTabs: HostTabs;
	readonly essentials: Essentials;
	readonly activeChatGateway: ActiveChatGateway;
	readonly pageFactsGateway: PageFactsGateway;
	readonly appTabsGateway: AppTabsGateway;
}

function releaseEssential(id: string, to: Extract<TabDrop, { kind: "list" }>, parts: EssentialParts): void {
	const essential = parts.essentials.heldEssentialOf(id);
	const place = listPlaceOf(to, parts.activeChatGateway.now().id);
	const live = liveTabOf(parts.hostTabs, id);
	parts.essentials.remove(id);

	if (live) {
		parts.hostTabs.place(live.id, place);
		return;
	}

	showOpened(parts.hostTabs.open(freshTabOf(essential, parts.pageFactsGateway), place), essential, parts);
}

function freshTabOf(essential: Essential, pageFactsGateway: PageFactsGateway): OpenedTab {
	return {
		app: essential.app,
		pageId: newTabPageOf(essential.app, pageFactsGateway.isAvailable()),
	};
}

function showOpened(opened: HostTab, essential: Essential, parts: EssentialParts): void {
	openTabPage(opened, essential.address ?? "", parts);
	showTab(opened, parts.hostTabs.now().tabs, parts);
}

function findEssential(essentials: Essentials, id: string): Essential | undefined {
	return essentials.now().essentials.find((one) => one.id === id);
}

function liveTabOf(hostTabs: HostTabs, essentialId: string): HostTab | undefined {
	return hostTabs.now().tabs.find((tab) => tab.essentialId === essentialId);
}
