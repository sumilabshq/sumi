import { handler, refuse } from "@widgetarium/core/requests";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { PageFactsGateway } from "../../gateways/page-facts/page-facts.gateway.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import type { HostTab } from "../../shared/lib/host-tabs/host-tabs.js";
import {
	AppTabsQuery,
	CloseOtherTabsCommand,
	CloseShownTabCommand,
	CloseTabCommand,
	DuplicateTabCommand,
	MoveTabCommand,
	OpenTabBelowCommand,
	OpenTabCommand,
	PinTabCommand,
	ReloadTabCommand,
	RenameTabCommand,
	ReopenClosedTabCommand,
	ShowTabCommand,
} from "./contract.js";
import { AppHostClientModule } from "../../module.js";
import { closeTab } from "./lib/close-tab.js";
import { newTabPageOf } from "./lib/new-tab-page.js";
import { showTab } from "./lib/show-tab.js";
import { pagesOfTabs } from "./lib/tab-pages.js";
import { APP_CHOICES, shownTabIdOf, tabRowsOf } from "./lib/tab-rows.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NO_PAGE = 'the tab "{id}" shows no browser page';
const NOTHING_CLOSED = "no closed tab is left to reopen";
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
		canReopen: hostTabs.now().closed.length > 0,
		canOpenBrowser: !("refusal" in newTabPageOf("browser", hostTabs.now().tabs, pageFactsGateway.pages())),
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
		const page = newTabPageOf(app, hostTabs.now().tabs, showing.pageFactsGateway.pages());

		if ("refusal" in page) {
			return refuse(page.refusal);
		}

		const tab = hostTabs.open({
			app,
			pageId: page.pageId,
			isPinned: false,
		});
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const OpenTabBelowCommandHandler = handler(OpenTabBelowCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		if (!heldTabOf(hostTabs, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const page = newTabPageOf("browser", hostTabs.now().tabs, showing.pageFactsGateway.pages());

		if ("refusal" in page) {
			return refuse(page.refusal);
		}

		const tab = hostTabs.openAfter(id, {
			app: "browser",
			pageId: page.pageId,
		});
		showTab(tab, hostTabs.now().tabs, showing);
	});

export const DuplicateTabCommandHandler = handler(DuplicateTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		const source = heldTabOf(hostTabs, id);

		if (!source) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const pages = showing.pageFactsGateway.pages();
		const page = newTabPageOf(source.app, hostTabs.now().tabs, pages);

		if ("refusal" in page) {
			return refuse(page.refusal);
		}

		const address = pagesOfTabs(hostTabs.now().tabs, pages).get(id)?.url ?? "";
		const tab = hostTabs.openAfter(id, {
			app: source.app,
			pageId: page.pageId,
		});
		showTab(tab, hostTabs.now().tabs, showing);

		if (page.pageId !== null && address !== "") {
			showing.pageFactsGateway.openAddress(page.pageId, address);
		}
	});

export const ReloadTabCommandHandler = handler(ReloadTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, pageFactsGateway }) => {
		const page = pagesOfTabs(hostTabs.now().tabs, pageFactsGateway.pages()).get(id);

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
	.handle(({ id }, { hostTabs, ...showing }) => {
		const kept = heldTabOf(hostTabs, id);

		if (!kept) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const shownId = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp());
		hostTabs.closeOthers(id);

		if (shownId !== null && !heldTabOf(hostTabs, shownId)) {
			showTab(kept, hostTabs.now().tabs, showing);
		}
	});

export const ReopenClosedTabCommandHandler = handler(ReopenClosedTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle((_input, { hostTabs, ...showing }) => {
		const tab = hostTabs.reopenClosed();

		if (!tab) {
			return refuse(NOTHING_CLOSED);
		}

		showTab(tab, hostTabs.now().tabs, showing);
	});

export const CloseTabCommandHandler = handler(CloseTabCommand, AppHostClientModule)
	.inject(TABS)
	.handle(({ id }, { hostTabs, ...showing }) => {
		if (!heldTabOf(hostTabs, id)) {
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
		if (!heldTabOf(hostTabs, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		hostTabs.pin(id, isPinned);
	});

function heldTabOf(hostTabs: HostTabs, id: string): HostTab | undefined {
	return hostTabs.now().tabs.find((tab) => tab.id === id);
}

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
