import { PageFactsGateway } from "@widgetarium/app-host/gateways";
import type { PageFacts } from "@widgetarium/app-host";
import {
	AccessAsksQuery,
	BrowserTabsQuery,
	OpenAddressCommand,
	ReloadPageCommand,
	ShowTabCommand,
} from "@widgetarium/browser";
import type { AccessAsk, BrowserTabState, InkReading } from "@widgetarium/browser";
import { BrowserClientModule } from "@widgetarium/browser/module";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import { app } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";

export class BrowserAppPageFactsGateway extends PageFactsGateway {
	private readonly watchers = new Set<() => void>();
	private readonly browserApp: StartedApp;
	private readonly stops: readonly (() => void)[];
	private facts: readonly PageFacts[] = [];
	private latestRead = 0;

	constructor(parts: BrowserParts) {
		super();
		this.browserApp = app({ modules: [BrowserClientModule.with(parts)] });
		const refresh = (): void => void this.refresh();
		this.stops = [
			parts.browserPagesGateway.watch(refresh),
			parts.browserGrantReadsGateway.watch(refresh),
			parts.onceAllowancesStore.watch(refresh),
			parts.browserAsksStore.watch(refresh),
			parts.inkActivityStore.watch(refresh),
		];
		refresh();
	}

	pages(): readonly PageFacts[] {
		return this.facts;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	showPage(pageId: string): void {
		void this.browserApp.send(ShowTabCommand, { tabId: pageId });
	}

	openAddress(pageId: string, address: string): void {
		void this.sent("open an address in", pageId, this.browserApp.send(OpenAddressCommand, { tabId: pageId, address }));
	}

	reloadPage(pageId: string): void {
		void this.sent("reload", pageId, this.browserApp.send(ReloadPageCommand, { tabId: pageId }));
	}

	stop(): void {
		this.stops.forEach((stop) => stop());
	}

	private async sent(what: string, pageId: string, answer: Promise<{ readonly ok: boolean }>): Promise<void> {
		const answered = await answer;

		if (!answered.ok) {
			console.error(`[widgetarium] the host tabs could not ${what} the browser page ${pageId}`, answered);
		}
	}

	private async refresh(): Promise<void> {
		const asked = (this.latestRead += 1);
		const [tabs, asks] = await Promise.all([
			this.browserApp.send(BrowserTabsQuery),
			this.browserApp.send(AccessAsksQuery),
		]);

		if (asked !== this.latestRead) {
			return;
		}

		if (!tabs.ok || !asks.ok) {
			console.error("[widgetarium] the host tabs could not read the browser pages", tabs, asks);
			return;
		}

		this.facts = tabs.output.tabs.map((tab) => factsOf(tab, tabs.output.inkReading, asks.output));
		for (const changed of this.watchers) {
			changed();
		}
	}
}

function factsOf(tab: BrowserTabState, inkReading: InkReading | null, asks: readonly AccessAsk[]): PageFacts {
	return {
		pageId: tab.id,
		title: tab.title,
		url: tab.url,
		favicon: tab.favicon,
		isInkReading: inkReading?.tabId === tab.id,
		isAskWaiting: asks.some((ask) => ask.tabId === tab.id),
		isClosedToInk: tab.access?.decision === "deny",
	};
}
