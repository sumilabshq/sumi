import { handler, refuse } from "@widgetarium/core/requests";
import { BrowserGrantReadsGateway } from "../../gateways/browser-grant-reads/browser-grant-reads.gateway.js";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { ChatComposerGateway } from "../../gateways/chat-composer/chat-composer.gateway.js";
import { RecentSitesGateway } from "../../gateways/recent-sites/recent-sites.gateway.js";
import { BrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import { InkActivityStore } from "../../shared/lib/ink-activity-store.js";
import { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { effectiveGrants } from "../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../shared/lib/sensitive-sites.js";
import { decideBrowserAccess, refuseUrlShape } from "../../shared/lib/decide-browser-access.js";
import { urlOf } from "../../shared/lib/site-key.js";
import { askInkPromptOf } from "../../shared/lib/ask-ink-prompt.js";
import { nearMatchOf } from "../../shared/lib/near-match.js";
import { searchAddressOf } from "../../shared/lib/search-address.js";
import type { BrowserTab, RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { BrowserClientModule } from "../../module.js";
import {
	AskInkCommand,
	AttachPagesCommand,
	BrowserTabsQuery,
	ClosePageCommand,
	DetachPagesCommand,
	GoBackCommand,
	GoForwardCommand,
	LeaveFailureCommand,
	OpenAddressCommand,
	OpenPageCommand,
	ReloadPageCommand,
	ShowTabCommand,
	FocusOwnWindowCommand,
	OpenTabInOwnWindowCommand,
} from "./contract.js";

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const LOOKS_LIKE_A_HOST = /^[^\s/]+\.[^\s/]+(\/.*)?$|^localhost(:\d+)?(\/.*)?$/i;
const NOT_OPENED = "the browser opens only web pages: {reason}";
const SCHEME_NOT_ALLOWED = "scheme-not-allowed";
const NO_TAB = "the browser holds no such tab";
const NO_OWN_WINDOWS = "this host cannot open a page in its own window";

export const BrowserTabsQueryHandler = handler(BrowserTabsQuery, BrowserClientModule)
	.inject({
		browserPagesGateway: BrowserPagesGateway,
		browserGrantReadsGateway: BrowserGrantReadsGateway,
		onceAllowancesStore: OnceAllowancesStore,
		inkActivityStore: InkActivityStore,
		clockGateway: ClockGateway,
		recentSitesGateway: RecentSitesGateway,
	})
	.watch((_input, parts, changed) => {
		const stops = [
			parts.browserPagesGateway.watch(changed),
			parts.browserGrantReadsGateway.watch(changed),
			parts.onceAllowancesStore.watch(changed),
			parts.inkActivityStore.watch(changed),
			parts.recentSitesGateway.watch(changed),
		];
		return () => stops.forEach((stop) => stop());
	})
	.handle((_input, parts) => {
		const { browserPagesGateway, browserGrantReadsGateway, onceAllowancesStore, inkActivityStore, clockGateway } =
			parts;
		const shownId = browserPagesGateway.shownId();
		const recentSites = parts.recentSitesGateway.sites();
		const grants = effectiveGrants(
			browserGrantReadsGateway.readGrants(),
			onceAllowancesStore.allowances(),
			clockGateway.now(),
		);
		return {
			isAvailable: browserPagesGateway.isAvailable(),
			tabs: browserPagesGateway.tabs().map((tab) => ({
				...tab,
				isShown: tab.id === shownId,
				isInOwnWindow: browserPagesGateway.isInOwnWindow(tab.id),
				access: hasNoPage(tab)
					? null
					: decideBrowserAccess({ address: tab.url, tabId: tab.id }, grants, SENSITIVE_SITES),
				nearMatch: nearMatchFor(tab, recentSites),
			})),
			inkReading: inkActivityStore.now().reading,
			recentSites,
		};
	});

export const OpenAddressCommandHandler = handler(OpenAddressCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId, address }, { browserPagesGateway }) => {
		const url = urlOf(webAddressOf(address));
		const refusal = refuseUrlShape(url);

		if (refusal === SCHEME_NOT_ALLOWED) {
			browserPagesGateway.show(tabId);
			browserPagesGateway.showRefused(tabId, address.trim());
			return;
		}

		if (url === null || refusal !== null) {
			return refuse(NOT_OPENED.replace("{reason}", refusal ?? "not-a-url"));
		}

		browserPagesGateway.show(tabId);
		browserPagesGateway.open(tabId, url.href);
	});

export const AskInkCommandHandler = handler(AskInkCommand, BrowserClientModule)
	.inject({
		browserPagesGateway: BrowserPagesGateway,
		chatComposerGateway: ChatComposerGateway,
	})
	.handle(async ({ tabId }, { browserPagesGateway, chatComposerGateway }) => {
		const tab = browserPagesGateway.tabs().find(({ id }) => id === tabId);

		if (tab === undefined) {
			return refuse(NO_TAB);
		}

		await chatComposerGateway.prefill(askInkPromptOf(tab));
	});

export const LeaveFailureCommandHandler = handler(LeaveFailureCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => {
		const tab = browserPagesGateway.tabs().find(({ id }) => id === tabId);

		if (tab?.failure?.kind !== "scheme" && tab?.canGoBack === true) {
			browserPagesGateway.back(tabId);
			return;
		}

		browserPagesGateway.dismissFailure(tabId);
	});

export const ShowTabCommandHandler = handler(ShowTabCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => {
		browserPagesGateway.show(tabId);
		browserPagesGateway.thaw(tabId);

		for (const hidden of browserPagesGateway.tabs().filter(({ id }) => id !== tabId)) {
			browserPagesGateway.freeze(hidden.id);
		}
	});

export const OpenPageCommandHandler = handler(OpenPageCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.create(tabId));

export const ClosePageCommandHandler = handler(ClosePageCommand, BrowserClientModule)
	.inject({
		browserPagesGateway: BrowserPagesGateway,
		browserAsksStore: BrowserAsksStore,
	})
	.handle(({ tabId }, { browserPagesGateway, browserAsksStore }) => {
		for (const ask of browserAsksStore.asks().filter((asked) => asked.tabId === tabId)) {
			browserAsksStore.settle(ask.id, "unanswered");
		}

		browserPagesGateway.close(tabId);
	});

export const GoBackCommandHandler = handler(GoBackCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.back(tabId));

export const GoForwardCommandHandler = handler(GoForwardCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.forward(tabId));

export const ReloadPageCommandHandler = handler(ReloadPageCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.reload(tabId));

export const OpenTabInOwnWindowCommandHandler = handler(OpenTabInOwnWindowCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => {
		if (!browserPagesGateway.isAvailable()) {
			return refuse(NO_OWN_WINDOWS);
		}

		browserPagesGateway.openInOwnWindow(tabId);
	});

export const FocusOwnWindowCommandHandler = handler(FocusOwnWindowCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.focusOwnWindow(tabId));

export const AttachPagesCommandHandler = handler(AttachPagesCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ into }, { browserPagesGateway }) => browserPagesGateway.attach(into));

export const DetachPagesCommandHandler = handler(DetachPagesCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ from }, { browserPagesGateway }) => browserPagesGateway.detach(from));

export function webAddressOf(typed: string): string {
	const address = typed.trim();

	if (HAS_SCHEME.test(address) && !LOOKS_LIKE_A_HOST.test(address)) {
		return address;
	}

	if (LOOKS_LIKE_A_HOST.test(address)) {
		return `https://${address}`;
	}

	return searchAddressOf(address);
}

function hasNoPage(tab: BrowserTab): boolean {
	return tab.url === "" || tab.failure?.kind === "scheme";
}

function nearMatchFor(tab: BrowserTab, recentSites: readonly RecentSite[]): string | null {
	const host = tab.failure?.kind === "not-found" ? urlOf(tab.failure.address)?.hostname : undefined;

	if (host === undefined) {
		return null;
	}

	return nearMatchOf(
		host,
		recentSites.map((site) => site.host),
	);
}
