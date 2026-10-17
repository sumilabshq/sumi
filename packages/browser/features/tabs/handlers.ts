import { handler, refuse } from "@widgetarium/core/requests";
import { BrowserGrantReadsGateway } from "../../gateways/browser-grant-reads/browser-grant-reads.gateway.js";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { InkActivityStore } from "../../shared/lib/ink-activity-store.js";
import { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { effectiveGrants } from "../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../shared/lib/sensitive-sites.js";
import { decideBrowserAccess, refuseUrlShape } from "../../shared/lib/decide-browser-access.js";
import { urlOf } from "../../shared/lib/site-key.js";
import { BrowserClientModule } from "../../module.js";
import {
	AttachPagesCommand,
	BrowserTabsQuery,
	DetachPagesCommand,
	GoBackCommand,
	GoForwardCommand,
	OpenAddressCommand,
	ReloadPageCommand,
	ShowTabCommand,
} from "./contract.js";

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const LOOKS_LIKE_A_HOST = /^[^\s/]+\.[^\s/]+(\/.*)?$|^localhost(:\d+)?(\/.*)?$/i;
const SEARCH_AT = "https://duckduckgo.com/?q=";
const NOT_OPENED = "the browser opens only web pages: {reason}";

export const BrowserTabsQueryHandler = handler(BrowserTabsQuery, BrowserClientModule)
	.inject({
		browserPagesGateway: BrowserPagesGateway,
		browserGrantReadsGateway: BrowserGrantReadsGateway,
		onceAllowancesStore: OnceAllowancesStore,
		inkActivityStore: InkActivityStore,
		clockGateway: ClockGateway,
	})
	.watch(
		(_input, { browserPagesGateway, browserGrantReadsGateway, onceAllowancesStore, inkActivityStore }, changed) => {
			const stops = [
				browserPagesGateway.watch(changed),
				browserGrantReadsGateway.watch(changed),
				onceAllowancesStore.watch(changed),
				inkActivityStore.watch(changed),
			];
			return () => stops.forEach((stop) => stop());
		},
	)
	.handle((_input, parts) => {
		const { browserPagesGateway, browserGrantReadsGateway, onceAllowancesStore, inkActivityStore, clockGateway } =
			parts;
		const shownId = browserPagesGateway.shownId();
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
				access:
					tab.url === "" ? null : decideBrowserAccess({ address: tab.url, tabId: tab.id }, grants, SENSITIVE_SITES),
			})),
			inkReading: inkActivityStore.now().reading,
		};
	});

export const OpenAddressCommandHandler = handler(OpenAddressCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId, address }, { browserPagesGateway }) => {
		const url = urlOf(webAddressOf(address));
		const refusal = refuseUrlShape(url);

		if (url === null || refusal !== null) {
			return refuse(NOT_OPENED.replace("{reason}", refusal ?? "not-a-url"));
		}

		browserPagesGateway.show(tabId);
		browserPagesGateway.open(tabId, url.href);
	});

export const ShowTabCommandHandler = handler(ShowTabCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.show(tabId));

export const GoBackCommandHandler = handler(GoBackCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.back(tabId));

export const GoForwardCommandHandler = handler(GoForwardCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.forward(tabId));

export const ReloadPageCommandHandler = handler(ReloadPageCommand, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle(({ tabId }, { browserPagesGateway }) => browserPagesGateway.reload(tabId));

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

	return `${SEARCH_AT}${encodeURIComponent(address)}`;
}
