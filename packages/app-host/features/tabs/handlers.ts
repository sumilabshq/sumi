import { handler, refuse } from "@widgetarium/core/requests";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { PageFactsGateway } from "../../gateways/page-facts/page-facts.gateway.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import {
	AppTabsQuery,
	CloseShownTabCommand,
	CloseTabCommand,
	MoveTabCommand,
	OpenTabCommand,
	PinTabCommand,
	ShowTabCommand,
} from "./contract.js";
import { AppHostClientModule } from "../../module.js";
import { closeTab } from "./lib/close-tab.js";
import { showTab } from "./lib/show-tab.js";
import { freePageOf } from "./lib/tab-pages.js";
import { APP_CHOICES, shownTabIdOf, tabRowsOf } from "./lib/tab-rows.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NO_FREE_PAGE = "every page the browser holds is shown by a browser tab already";
const TABS = {
	appTabsGateway: AppTabsGateway,
	pageFactsGateway: PageFactsGateway,
	hostTabs: HostTabs,
};

export const AppTabsQueryHandler = handler(AppTabsQuery, AppHostClientModule)
	.inject(TABS)
	.watch((_input, parts, changed) => watchTabs(parts, changed))
	.handle((_input, { appTabsGateway, pageFactsGateway, hostTabs }) => ({
		tabs: tabRowsOf(hostTabs.now(), pageFactsGateway.pages(), appTabsGateway.shownApp()),
		apps: APP_CHOICES,
		// TODO: the chat opens a preview here; nothing does yet
		preview: null,
	}));

export const ShowTabCommandHandler = handler(ShowTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		const tab = hostTabs.now().tabs.find((held) => held.id === id);

		if (!tab) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		hostTabs.show(id);
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const OpenTabCommandHandler = handler(OpenTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ app }, { hostTabs, ...showing }) => {
		const pages = showing.pageFactsGateway.pages();
		const page = app === "browser" ? freePageOf(hostTabs.now().tabs, pages) : null;

		if (app === "browser" && pages.length > 0 && page === null) {
			return refuse(NO_FREE_PAGE);
		}

		const tab = hostTabs.open({
			app,
			pageId: page?.pageId ?? null,
			isPinned: false,
		});
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const CloseTabCommandHandler = handler(CloseTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		if (!hostTabs.now().tabs.some((tab) => tab.id === id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		closeTab(id, hostTabs, showing);
	});

export const CloseShownTabCommandHandler = handler(CloseShownTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle((_input, { hostTabs, ...showing }) => {
		const shownId = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp());

		if (shownId === null) {
			return refuse("no tab is shown");
		}

		closeTab(shownId, hostTabs, showing);
	});

export const MoveTabCommandHandler = handler(MoveTabCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id, before, isPinned }, { hostTabs }) => {
		const held = new Set(hostTabs.now().tabs.map((tab) => tab.id));

		const missing = [id, before].find((asked) => asked !== null && !held.has(asked));

		if (missing !== undefined && missing !== null) {
			return refuse(NOT_HELD.replace("{id}", missing));
		}

		hostTabs.move(id, before, isPinned);
	});

export const PinTabCommandHandler = handler(PinTabCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id, isPinned }, { hostTabs }) => {
		if (!hostTabs.now().tabs.some((tab) => tab.id === id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		hostTabs.pin(id, isPinned);
	});

interface WatchedTabs {
	readonly appTabsGateway: AppTabsGateway;
	readonly pageFactsGateway: PageFactsGateway;
	readonly hostTabs: HostTabs;
}

function watchTabs({ appTabsGateway, pageFactsGateway, hostTabs }: WatchedTabs, changed: () => void): () => void {
	const settled = onceWritesSettle(changed);
	const stops = [appTabsGateway.watch(settled), pageFactsGateway.watch(settled), hostTabs.watch(settled)];
	return () => stops.forEach((stop) => stop());
}

// TRADE-OFF: one read per command, because a query read while one runs answers that run's stale result
function onceWritesSettle(changed: () => void): () => void {
	let isQueued = false;
	return () => {
		if (isQueued) {
			return;
		}

		isQueued = true;
		queueMicrotask(() => {
			isQueued = false;
			changed();
		});
	};
}
