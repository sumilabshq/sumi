import { PageFactsGateway } from "@widgetarium/app-host/gateways";
import type { PageFacts } from "@widgetarium/app-host";
import {
	AccessAsksQuery,
	BrowserTabsQuery,
	ClosePageCommand,
	FocusOwnWindowCommand,
	OpenAddressCommand,
	OpenPageCommand,
	ReloadPageCommand,
	ShowTabCommand,
	OpenTabInOwnWindowCommand,
	TearOffCommand,
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
	private readonly isBrowserAvailable: boolean;
	private readonly opensOwnWindows: boolean;
	private sends: Promise<void> = Promise.resolve();
	private facts: readonly PageFacts[] = [];
	private latestRead = 0;

	constructor(parts: BrowserParts) {
		super();
		this.browserApp = app().modules(BrowserClientModule.with(parts)).start();
		this.isBrowserAvailable = parts.browserPagesGateway.isAvailable();
		this.opensOwnWindows = parts.browserPagesGateway.canOpenOwnWindow();
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

	isAvailable(): boolean {
		return this.isBrowserAvailable;
	}

	pages(): readonly PageFacts[] {
		return this.facts;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	openPage(pageId: string): void {
		this.sendInOrder("open", pageId, () => this.browserApp.send(OpenPageCommand, { tabId: pageId }));
	}

	closePage(pageId: string): void {
		this.sendInOrder("close", pageId, () => this.browserApp.send(ClosePageCommand, { tabId: pageId }));
	}

	showPage(pageId: string): void {
		this.sendInOrder("hold", pageId, () => this.browserApp.send(OpenPageCommand, { tabId: pageId }));
		this.sendInOrder("show", pageId, () => this.browserApp.send(ShowTabCommand, { tabId: pageId }));
	}

	openAddress(pageId: string, address: string): void {
		this.sendInOrder("open an address in", pageId, () =>
			this.browserApp.send(OpenAddressCommand, {
				tabId: pageId,
				address,
			}),
		);
	}

	reloadPage(pageId: string): void {
		this.sendInOrder("reload", pageId, () => this.browserApp.send(ReloadPageCommand, { tabId: pageId }));
	}

	canOpenOwnWindow(): boolean {
		return this.opensOwnWindows;
	}

	openPageInOwnWindow(pageId: string): void {
		this.sendInOrder("open in its own window", pageId, () =>
			this.browserApp.send(OpenTabInOwnWindowCommand, { tabId: pageId }),
		);
	}

	tearOffPage(pageId: string): void {
		this.sendInOrder("tear off", pageId, () => this.browserApp.send(TearOffCommand, { tabId: pageId }));
	}

	focusPageWindow(pageId: string): void {
		this.sendInOrder("focus the window of", pageId, () =>
			this.browserApp.send(FocusOwnWindowCommand, { tabId: pageId }),
		);
	}

	stop(): void {
		this.stops.forEach((stop) => stop());
	}

	private sendInOrder(what: string, pageId: string, send: () => Promise<{ readonly ok: boolean }>): void {
		this.sends = this.sends.then(() => this.sent(what, pageId, send()));
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
		isInOwnWindow: tab.isInOwnWindow,
	};
}
