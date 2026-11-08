import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { recentSitesChanged } from "../../gateways/recent-sites/recent-sites.events.js";
import { onceAllowancesChanged } from "../../gateways/once-allowances/once-allowances.events.js";
import { inkActivityChanged } from "../../gateways/ink-activity/ink-activity.events.js";
import { pagesChanged } from "../../gateways/browser-pages/browser-pages.events.js";
import { grantsChanged } from "../../gateways/browser-grant-reads/browser-grant-reads.events.js";
import { z } from "zod";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { decideBrowserAccess, refuseUrlShape } from "../../shared/lib/decide-browser-access.js";
import { effectiveGrants } from "../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../shared/lib/sensitive-sites.js";
import { urlOf } from "../../shared/lib/site-key.js";
import { isSameSites, visitOf, withVisit } from "../../shared/lib/recent-sites.js";
import {
	BrowserTabsSchema,
	BrowserViewSchema,
	OpenAddressSchema,
	PagesHostSchema,
	OpenPageSchema,
	TabIdSchema,
} from "../../shared/schema/browser-tab.schema.js";
import type { BrowserTab, RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { askInkPromptOf } from "./lib/ask-ink-prompt.js";
import { nearMatchOf } from "./lib/near-match.js";
import { isPagesHost, webAddressOf } from "./lib/web-address.js";
import { GhostLaySchema, GhostShownSchema, GhostWornSchema } from "../../shared/schema/tear-off-ghost.schema.js";
import { TabWindowSchema } from "../../shared/schema/tab-window.schema.js";

const NOT_OPENED = "the browser opens only web pages: {reason}";
const SCHEME_NOT_ALLOWED = "scheme-not-allowed";
const NO_TAB = "the browser holds no such tab";
const NO_OWN_WINDOWS = "this host cannot open a page in its own window";
const NOT_A_HOST = "the browser draws its pages only into an element";

const NO_GHOST_HOST = "this host opens no windows of its own, so a dragged tab has no ghost outside it";

export const noteVisits = subscriber(pagesChanged).handle((_input, { recentSites, browserPages }) => {
	const was = recentSites.recentSites();
	const visited = browserPages
		.tabs()
		.map(visitOf)
		.reduce((sites, visit) => (visit === null ? sites : withVisit(sites, visit)), was);

	if (isSameSites(was, visited)) {
		return;
	}

	recentSites.saveRecentSites(visited);
	console.debug(
		`[widgetarium] browser recent sites ${was.map(({ host }) => host).join(",")} → ${visited.map(({ host }) => host).join(",")} (a tab finished loading)`,
	);
});

export const browserTabs = query()
	.public()
	.input(BrowserViewSchema)
	.output(BrowserTabsSchema)
	.settlesNow()
	.handle(({ heldTabId }, { browserPages, browserGrantReads, onceAllowances, inkActivity, recentSites, clock }) => {
		const shownId = heldTabId ?? browserPages.shownId();
		const sites = recentSites.recentSites();
		const grants = effectiveGrants(browserGrantReads.grants(), onceAllowances.onceAllowances(), clock.now());
		return {
			isAvailable: browserPages.isAvailable(),
			canOpenOwnWindow: browserPages.canOpenOwnWindow(),
			tabs: browserPages.tabs().map((tab) => ({
				...tab,
				isShown: tab.id === shownId,
				isInOwnWindow: browserPages.isPoppedOut(tab.id),
				access: hasNoPage(tab)
					? null
					: decideBrowserAccess({ address: tab.url, tabId: tab.id }, grants, SENSITIVE_SITES),
				nearMatch: nearMatchFor(tab, sites),
			})),
			inkReading: inkActivity.inkActivity().reading,
			recentSites: sites,
		};
	});

export const askInkPrompt = query()
	.public()
	.input(TabIdSchema)
	.output(z.string())
	.settlesNow()
	.handle(({ tabId }, { browserPages }) => {
		const tab = browserPages.tabs().find(({ id }) => id === tabId);
		return tab === undefined ? refuse(NO_TAB) : askInkPromptOf(tab);
	});

export const openAddress = command()
	.public()
	.input(OpenAddressSchema)
	.idempotencyKey(PerCall)
	.handle(({ tabId, address, heldTabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		const url = urlOf(webAddressOf(address));
		const refusal = refuseUrlShape(url);

		if (url === null || (refusal !== null && refusal !== SCHEME_NOT_ALLOWED)) {
			return refuse(NOT_OPENED.replace("{reason}", refusal ?? "not-a-url"));
		}

		if (heldTabId === null) {
			browserPages.show(tabId);
		}

		if (refusal === SCHEME_NOT_ALLOWED) {
			browserPages.showRefused(tabId, address.trim());
			console.info(`[widgetarium] browser tab ${tabId} refused ${url.protocol} (open address)`);
			return;
		}

		browserPages.open(tabId, url.href);
	});

export const openTabInOwnWindow = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		const refusal = refuseOwnWindow(browserPages, tabId);
		return refusal === null ? browserPages.openInOwnWindow(tabId) : refuse(refusal);
	});

export const focusOwnWindow = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages }) => browserPages.focusOwnWindow(tabId));

export const focusStudioWindow = command()
	.public()
	.input(z.object({ window: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.handle(({ window }, { browserPages }) => browserPages.focusStudioWindow(window));

export const openTabWindow = command()
	.public()
	.input(TabWindowSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, view }, { browserPages }) =>
		browserPages.canOpenOwnWindow() ? browserPages.openTabWindow(tabId, view) : refuse(NO_OWN_WINDOWS),
	);

export const tearOff = command()
	.public()
	.input(TabIdSchema.extend({ openWith: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ tabId, openWith }, { browserPages }) => {
		const refusal = refuseOwnWindow(browserPages, tabId);
		return refusal === null ? browserPages.tearOff(tabId, openWith) : refuse(refusal);
	});

export const layTearOffGhost = command()
	.public()
	.input(GhostLaySchema)
	.idempotencyKey(Repeatable)
	.handle((lay, { browserPages }) =>
		browserPages.canOpenOwnWindow() ? browserPages.layTearOffGhost(lay) : refuse(NO_GHOST_HOST),
	);

export const wearTearOffGhost = command()
	.public()
	.input(GhostWornSchema)
	.idempotencyKey(Repeatable)
	.handle((worn, { browserPages }) => browserPages.wearTearOffGhost(worn));

export const showTearOffGhost = command()
	.public()
	.input(GhostShownSchema)
	.idempotencyKey(Repeatable)
	.handle(({ shown }, { browserPages }) => browserPages.showTearOffGhost(shown));

export const showTab = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		browserPages.show(tabId);
		browserPages.thaw(tabId);

		for (const hidden of browserPages.tabs().filter(({ id }) => id !== tabId)) {
			browserPages.freeze(hidden.id);
		}
	});

export const openPage = command()
	.public()
	.input(OpenPageSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, profileId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		return browserPages.create(tabId, profileId ?? null);
	});

export const closePage = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, accessAsks, invalidate }) => {
		invalidate(browserTabs);
		for (const ask of accessAsks.accessAsks().filter((asked) => asked.tabId === tabId)) {
			accessAsks.saveAnswer(ask.id, "unanswered");
			console.info(`[widgetarium] browser ask ${ask.id} waiting → unanswered (tab ${tabId} closed)`);
		}

		browserPages.close(tabId);
	});

export const goBack = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		return browserPages.back(tabId);
	});

export const goForward = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		return browserPages.forward(tabId);
	});

export const reloadPage = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		return browserPages.reload(tabId);
	});

export const leaveFailure = command()
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		const tab = browserPages.tabs().find(({ id }) => id === tabId);

		if (tab?.failure?.kind !== "scheme" && tab?.canGoBack === true) {
			browserPages.back(tabId);
			return;
		}

		browserPages.dismissFailure(tabId);
	});

export const attachPages = command()
	.public()
	.input(PagesHostSchema)
	.idempotencyKey(Repeatable)
	.handle(({ host, heldTabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		if (!isPagesHost(host)) {
			return refuse(NOT_A_HOST);
		}

		if (heldTabId === null) {
			browserPages.attach(host);
			return;
		}

		browserPages.attachInPane(heldTabId, host);
	});

export const detachPages = command()
	.public()
	.input(PagesHostSchema)
	.idempotencyKey(Repeatable)
	.handle(({ host, heldTabId }, { browserPages, invalidate }) => {
		invalidate(browserTabs);
		if (!isPagesHost(host)) {
			return refuse(NOT_A_HOST);
		}

		if (heldTabId === null) {
			browserPages.detach(host);
			return;
		}

		browserPages.detachFromPane(heldTabId, host);
	});

export const rereadBrowserTabs = subscriber(pagesChanged).handle((_input, { invalidate }) => {
	invalidate(browserTabs);
	invalidate(askInkPrompt);
});

export const rereadBrowserTabsForGrants = subscriber(grantsChanged).handle((_input, { invalidate }) => {
	invalidate(browserTabs);
});

export const rereadBrowserTabsForOnceAllowances = subscriber(onceAllowancesChanged).handle((_input, { invalidate }) => {
	invalidate(browserTabs);
});

export const rereadBrowserTabsForInk = subscriber(inkActivityChanged).handle((_input, { invalidate }) => {
	invalidate(browserTabs);
});

export const rereadBrowserTabsForRecentSites = subscriber(recentSitesChanged).handle((_input, { invalidate }) => {
	invalidate(browserTabs);
});

function refuseOwnWindow(browserPages: BrowserPagesGateway, tabId: string): string | null {
	if (!browserPages.canOpenOwnWindow()) {
		return NO_OWN_WINDOWS;
	}

	return browserPages.tabs().some(({ id }) => id === tabId) ? null : NO_TAB;
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
