import { MemoryBrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import type { BrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import { MemoryInkActivityStore } from "../../shared/lib/ink-activity-store.js";
import type { InkActivityStore } from "../../shared/lib/ink-activity-store.js";
import { MemoryOnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import type { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { onceKeptOnTabs } from "../../shared/lib/once-grants.js";
import { isSameSites, visitOf, withVisit } from "../../shared/lib/recent-sites.js";
import type { BrowserAuditGateway } from "../browser-audit/browser-audit.gateway.js";
import type { BrowserGrantReadsGateway } from "../browser-grant-reads/browser-grant-reads.gateway.js";
import type { BrowserGrantsGateway } from "../browser-grants/browser-grants.gateway.js";
import type { BrowserPagesGateway } from "../browser-pages/browser-pages.gateway.js";
import { PaneBrowserPagesGateway } from "../browser-pages/pane.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import type { ChatComposerGateway } from "../chat-composer/chat-composer.gateway.js";
import type { RecentSitesGateway } from "../recent-sites/recent-sites.gateway.js";

export interface BrowserGateways {
	readonly browserPagesGateway: BrowserPagesGateway;
	readonly browserGrantsGateway: BrowserGrantsGateway;
	readonly browserAuditGateway: BrowserAuditGateway;
	readonly clockGateway: ClockGateway;
	readonly recentSitesGateway: RecentSitesGateway;
	readonly chatComposerGateway: ChatComposerGateway;
}

export interface BrowserParts extends BrowserGateways {
	readonly browserGrantReadsGateway: BrowserGrantReadsGateway;
	readonly onceAllowancesStore: OnceAllowancesStore;
	readonly browserAsksStore: BrowserAsksStore;
	readonly inkActivityStore: InkActivityStore;
}

const ENDED_AWAY = "the tab left the host it was allowed once on";
const VISITED = "a tab finished loading a page";

export function browserPartsOf(gateways: BrowserGateways): BrowserParts {
	const { browserPagesGateway, browserGrantsGateway, clockGateway } = gateways;
	const onceAllowancesStore = new MemoryOnceAllowancesStore();
	browserPagesGateway.watch(() =>
		onceAllowancesStore.keep(
			onceKeptOnTabs(onceAllowancesStore.allowances(), browserPagesGateway.tabs(), clockGateway.now()),
			ENDED_AWAY,
		),
	);
	browserPagesGateway.watch(() => noteVisits(browserPagesGateway, gateways.recentSitesGateway));
	return {
		...gateways,
		browserGrantReadsGateway: browserGrantsGateway,
		onceAllowancesStore,
		browserAsksStore: new MemoryBrowserAsksStore(),
		inkActivityStore: new MemoryInkActivityStore(),
	};
}

export function paneBrowserParts(parts: BrowserParts, tabId: string): BrowserParts {
	return {
		...parts,
		browserPagesGateway: new PaneBrowserPagesGateway(parts.browserPagesGateway, tabId),
	};
}

function noteVisits(browserPagesGateway: BrowserPagesGateway, recentSitesGateway: RecentSitesGateway): void {
	const kept = recentSitesGateway.sites();
	const visited = browserPagesGateway
		.tabs()
		.map(visitOf)
		.reduce((sites, visit) => (visit === null ? sites : withVisit(sites, visit)), kept);

	if (isSameSites(kept, visited)) {
		return;
	}

	recentSitesGateway.keep(visited, VISITED);
}
