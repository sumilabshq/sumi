import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { RecentSitesChangedEvent } from "../../gateways/recent-sites/recent-sites.events.js";
import { OnceAllowancesChangedEvent } from "../../gateways/once-allowances/once-allowances.events.js";
import { InkActivityChangedEvent } from "../../gateways/ink-activity/ink-activity.events.js";
import { PagesChangedEvent } from "../../gateways/browser-pages/browser-pages.events.js";
import { GrantsChangedEvent } from "../../gateways/browser-grant-reads/browser-grant-reads.events.js";
import { z } from "zod";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { decideBrowserAccess, refuseUrlShape } from "../../shared/lib/decide-browser-access.js";
import { effectiveGrants } from "../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../shared/lib/sensitive-sites.js";
import { urlOf } from "../../shared/lib/site-key.js";
import { isSameSites, visitOf, withVisit } from "../../shared/lib/recent-sites.js";
import { BrowserTabsSchema, BrowserViewSchema, OpenAddressSchema, PagesHostSchema, OpenPageSchema, TabIdSchema } from "../../shared/schema/browser-tab.schema.js";
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

export const NoteVisitsSubscriber = subscriber(PagesChangedEvent)
	.handle((_input, { recentSites, browserPages }) => {
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

export const BrowserTabsQuery = query("browser-tabs")
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

export const AskInkPromptQuery = query("ask-ink-prompt")
	.public()
	.input(TabIdSchema)
	.output(z.string())
	.settlesNow()
	.handle(({ tabId }, { browserPages }) => {
		const tab = browserPages.tabs().find(({ id }) => id === tabId);
		return tab === undefined ? refuse(NO_TAB) : askInkPromptOf(tab);
	});

export const OpenAddressCommand = command("open-address")
	.public()
	.input(OpenAddressSchema)
	.idempotencyKey(PerCall)
	.handle(({ tabId, address, heldTabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
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

export const OpenTabInOwnWindowCommand = command("open-tab-in-own-window")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		const refusal = refuseOwnWindow(browserPages, tabId);
		return refusal === null ? browserPages.openInOwnWindow(tabId) : refuse(refusal);
	});

export const FocusOwnWindowCommand = command("focus-own-window")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages }) => browserPages.focusOwnWindow(tabId));

export const FocusStudioWindowCommand = command("focus-studio-window")
	.public()
	.input(z.object({ window: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.handle(({ window }, { browserPages }) => browserPages.focusStudioWindow(window));

export const OpenTabWindowCommand = command("open-tab-window")
	.public()
	.input(TabWindowSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, view }, { browserPages }) =>
		browserPages.canOpenOwnWindow() ? browserPages.openTabWindow(tabId, view) : refuse(NO_OWN_WINDOWS),
	);

export const TearOffCommand = command("tear-off")
	.public()
	.input(TabIdSchema.extend({ openWith: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ tabId, openWith }, { browserPages }) => {
		const refusal = refuseOwnWindow(browserPages, tabId);
		return refusal === null ? browserPages.tearOff(tabId, openWith) : refuse(refusal);
	});

export const LayTearOffGhostCommand = command("lay-tear-off-ghost")
	.public()
	.input(GhostLaySchema)
	.idempotencyKey(Repeatable)
	.handle((lay, { browserPages }) =>
		browserPages.canOpenOwnWindow() ? browserPages.layTearOffGhost(lay) : refuse(NO_GHOST_HOST),
	);

export const WearTearOffGhostCommand = command("wear-tear-off-ghost")
	.public()
	.input(GhostWornSchema)
	.idempotencyKey(Repeatable)
	.handle((worn, { browserPages }) => browserPages.wearTearOffGhost(worn));

export const ShowTearOffGhostCommand = command("show-tear-off-ghost")
	.public()
	.input(GhostShownSchema)
	.idempotencyKey(Repeatable)
	.handle(({ shown }, { browserPages }) => browserPages.showTearOffGhost(shown));

export const ShowTabCommand = command("show-tab")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		browserPages.show(tabId);
		browserPages.thaw(tabId);

		for (const hidden of browserPages.tabs().filter(({ id }) => id !== tabId)) {
			browserPages.freeze(hidden.id);
		}
	});

export const OpenPageCommand = command("open-page")
	.public()
	.input(OpenPageSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, profileId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		return browserPages.create(tabId, profileId ?? null);
	});

export const ClosePageCommand = command("close-page")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, accessAsks, invalidate }) => {
		invalidate(BrowserTabsQuery);
		for (const ask of accessAsks.accessAsks().filter((asked) => asked.tabId === tabId)) {
			accessAsks.saveAnswer(ask.id, "unanswered");
			console.info(`[widgetarium] browser ask ${ask.id} waiting → unanswered (tab ${tabId} closed)`);
		}

		browserPages.close(tabId);
	});

export const GoBackCommand = command("go-back")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		return browserPages.back(tabId);
	});

export const GoForwardCommand = command("go-forward")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		return browserPages.forward(tabId);
	});

export const ReloadPageCommand = command("reload-page")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		return browserPages.reload(tabId);
	});

export const LeaveFailureCommand = command("leave-failure")
	.public()
	.input(TabIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		const tab = browserPages.tabs().find(({ id }) => id === tabId);

		if (tab?.failure?.kind !== "scheme" && tab?.canGoBack === true) {
			browserPages.back(tabId);
			return;
		}

		browserPages.dismissFailure(tabId);
	});

export const AttachPagesCommand = command("attach-pages")
	.public()
	.input(PagesHostSchema)
	.idempotencyKey(Repeatable)
	.handle(({ host, heldTabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		if (!isPagesHost(host)) {
			return refuse(NOT_A_HOST);
		}

		if (heldTabId === null) {
			browserPages.attach(host);
			return;
		}

		browserPages.attachInPane(heldTabId, host);
	});

export const DetachPagesCommand = command("detach-pages")
	.public()
	.input(PagesHostSchema)
	.idempotencyKey(Repeatable)
	.handle(({ host, heldTabId }, { browserPages, invalidate }) => {
		invalidate(BrowserTabsQuery);
		if (!isPagesHost(host)) {
			return refuse(NOT_A_HOST);
		}

		if (heldTabId === null) {
			browserPages.detach(host);
			return;
		}

		browserPages.detachFromPane(heldTabId, host);
	});

export const RereadBrowserTabsSubscriber = subscriber(PagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(BrowserTabsQuery);
	invalidate(AskInkPromptQuery);
});

export const RereadBrowserTabsForGrantsSubscriber = subscriber(GrantsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(BrowserTabsQuery);
});

export const RereadBrowserTabsForOnceAllowancesSubscriber = subscriber(OnceAllowancesChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(BrowserTabsQuery);
	},
);

export const RereadBrowserTabsForInkSubscriber = subscriber(InkActivityChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(BrowserTabsQuery);
	},
);

export const RereadBrowserTabsForRecentSitesSubscriber = subscriber(RecentSitesChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(BrowserTabsQuery);
	},
);

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
