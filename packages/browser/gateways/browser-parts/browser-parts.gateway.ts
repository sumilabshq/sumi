import { MemoryBrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import type { BrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import { MemoryInkActivityStore } from "../../shared/lib/ink-activity-store.js";
import type { InkActivityStore } from "../../shared/lib/ink-activity-store.js";
import { MemoryOnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import type { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { onceKeptOnTabs } from "../../shared/lib/once-grants.js";
import type { BrowserAuditGateway } from "../browser-audit/browser-audit.gateway.js";
import type { BrowserGrantReadsGateway } from "../browser-grant-reads/browser-grant-reads.gateway.js";
import type { BrowserGrantsGateway } from "../browser-grants/browser-grants.gateway.js";
import type { BrowserPagesGateway } from "../browser-pages/browser-pages.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";

export interface BrowserGateways {
	readonly browserPagesGateway: BrowserPagesGateway;
	readonly browserGrantsGateway: BrowserGrantsGateway;
	readonly browserAuditGateway: BrowserAuditGateway;
	readonly clockGateway: ClockGateway;
}

export interface BrowserParts extends BrowserGateways {
	readonly browserGrantReadsGateway: BrowserGrantReadsGateway;
	readonly onceAllowancesStore: OnceAllowancesStore;
	readonly browserAsksStore: BrowserAsksStore;
	readonly inkActivityStore: InkActivityStore;
}

const ENDED_AWAY = "the tab left the host it was allowed once on";

export function browserPartsOf(gateways: BrowserGateways): BrowserParts {
	const { browserPagesGateway, browserGrantsGateway, clockGateway } = gateways;
	const onceAllowancesStore = new MemoryOnceAllowancesStore();
	browserPagesGateway.watch(() =>
		onceAllowancesStore.keep(
			onceKeptOnTabs(onceAllowancesStore.allowances(), browserPagesGateway.tabs(), clockGateway.now()),
			ENDED_AWAY,
		),
	);
	return {
		...gateways,
		browserGrantReadsGateway: browserGrantsGateway,
		onceAllowancesStore,
		browserAsksStore: new MemoryBrowserAsksStore(),
		inkActivityStore: new MemoryInkActivityStore(),
	};
}
