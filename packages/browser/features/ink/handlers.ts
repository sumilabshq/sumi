import { guard, handler } from "@widgetarium/core/requests";
import { BrowserAuditGateway } from "../../gateways/browser-audit/browser-audit.gateway.js";
import { BrowserGrantReadsGateway } from "../../gateways/browser-grant-reads/browser-grant-reads.gateway.js";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { BrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import { InkActivityStore } from "../../shared/lib/ink-activity-store.js";
import { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { BrowserClientModule } from "../../module.js";
import { CapturePageCommand, InkOpenAddressCommand, ReadPageContentCommand, SearchWebCommand } from "./contract.js";
import { InkGate } from "./lib/ink-gate.js";
import { fadeReading } from "./lib/ink-turn.js";

const GATE = {
	browserPagesGateway: BrowserPagesGateway,
	browserGrantReadsGateway: BrowserGrantReadsGateway,
	browserAuditGateway: BrowserAuditGateway,
	clockGateway: ClockGateway,
	onceAllowancesStore: OnceAllowancesStore,
	browserAsksStore: BrowserAsksStore,
	inkActivityStore: InkActivityStore,
};
const CONTENT_READ = "ink read the page content";

export const BrowserReadGuard = guard()
	.inject(GATE)
	.handle(async ({ request }, parts) => ({
		browserRead: await new InkGate(parts).readAllowed(request === CapturePageCommand.name ? "screenshot" : "content"),
	}));

export const BrowserNavigationGuard = guard<{ readonly url: string }>()
	.inject(GATE)
	.handle(async ({ input }, parts) => ({ browserNavigation: await new InkGate(parts).navigationAllowed(input.url) }));

export const ReadPageContentCommandHandler = handler(ReadPageContentCommand, BrowserClientModule)
	.guard(BrowserReadGuard)
	.inject(GATE)
	.handle(async (_input, parts) => {
		const { browserPagesGateway, inkActivityStore, clockGateway, browserRead } = parts;

		try {
			const content = await browserPagesGateway.content(browserRead.tabId);
			new InkGate(parts).stillAllowed(browserRead);
			inkActivityStore.change({ contentReadAt: clockGateway.now() }, CONTENT_READ);
			return content;
		} finally {
			fadeReading(inkActivityStore, clockGateway);
		}
	});

export const CapturePageCommandHandler = handler(CapturePageCommand, BrowserClientModule)
	.guard(BrowserReadGuard)
	.inject(GATE)
	.handle(async ({ region }, parts) => {
		const { browserPagesGateway, inkActivityStore, clockGateway, browserRead } = parts;

		try {
			const shot = await browserPagesGateway.capture(browserRead.tabId, region);
			new InkGate(parts).stillAllowed(browserRead);
			inkActivityStore.change({ contentReadAt: clockGateway.now() }, CONTENT_READ);
			return shot;
		} finally {
			fadeReading(inkActivityStore, clockGateway);
		}
	});

export const InkOpenAddressCommandHandler = handler(InkOpenAddressCommand, BrowserClientModule)
	.guard(BrowserNavigationGuard)
	.inject(GATE)
	.handle(async (_input, parts) => {
		const { browserPagesGateway, inkActivityStore, clockGateway, browserNavigation } = parts;
		const { tabId, url } = browserNavigation;
		browserPagesGateway.show(tabId);
		inkActivityStore.change(
			{
				reading: {
					tabId,
					kind: "navigate",
				},
			},
			"ink opens an address",
		);

		try {
			browserPagesGateway.open(tabId, url);
			await browserPagesGateway.settled(tabId);
			return {
				tabId,
				url: await new InkGate(parts).arrivalAllowed(browserNavigation),
			};
		} finally {
			fadeReading(inkActivityStore, clockGateway);
		}
	});

export const SearchWebCommandHandler = handler(SearchWebCommand, BrowserClientModule)
	.guard(BrowserNavigationGuard)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.handle((_input, { browserPagesGateway, browserNavigation }) =>
		browserPagesGateway.open(browserNavigation.tabId, browserNavigation.url),
	);
