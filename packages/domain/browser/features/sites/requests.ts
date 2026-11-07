import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { OnceAllowancesChangedEvent } from "../../gateways/once-allowances/once-allowances.events.js";
import { PagesChangedEvent } from "../../gateways/browser-pages/browser-pages.events.js";
import { GrantsChangedEvent } from "../../gateways/browser-grant-reads/browser-grant-reads.events.js";
import { decideBrowserAccess, isKeptOut } from "../../shared/lib/decide-browser-access.js";
import { refuseSiteKey, siteLevelToWrite } from "../../shared/lib/grant-changes.js";
import { effectiveGrants, isSameAllowances, onceKeptOnTabs } from "../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../shared/lib/sensitive-sites.js";
import { BrowserViewSchema } from "../../shared/schema/browser-tab.schema.js";
import { SiteAccessSchema, SiteLevelSchema } from "../../shared/schema/site-access.schema.js";
import type { SiteGrant, SiteRow } from "../../shared/schema/site-access.schema.js";

const SET_IN_SITE_ACCESS = "set in site access";

export const KeepOnceOnTabsSubscriber = subscriber(PagesChangedEvent)
	.handle((_input, { onceAllowances, browserPages, clock }) => {
		const was = onceAllowances.onceAllowances();
		const kept = onceKeptOnTabs(was, browserPages.tabs(), clock.now());

		if (isSameAllowances(was, kept)) {
			return;
		}

		onceAllowances.saveOnceAllowances(kept);
		console.debug(`[widgetarium] browser once allowances ${was.length} → ${kept.length} (a tab left the allowed host)`);
	});

export const SiteAccessQuery = query("site-access")
	.public()
	.input(BrowserViewSchema)
	.output(SiteAccessSchema)
	.settlesNow()
	.handle(({ heldTabId }, { browserGrantReads, onceAllowances, browserPages, clock }) => {
		const kept = browserGrantReads.grants();
		const shownId = heldTabId ?? browserPages.shownId();
		const shownTab = browserPages.tabs().find((tab) => tab.id === shownId);
		const shownUrl = shownTab?.failure === null ? shownTab.url : "";
		const grants = effectiveGrants(kept, onceAllowances.onceAllowances(), clock.now());
		const shown =
			shownUrl === "" ? null : decideBrowserAccess({ address: shownUrl, tabId: shownId }, grants, SENSITIVE_SITES);
		return {
			shown,
			isKeptOut: isKeptOut(shown),
			rows: rowsOf(kept),
		};
	});

export const SetSiteLevelCommand = command("set-site-level")
	.public()
	.input(SiteLevelSchema)
	.idempotencyKey(Repeatable)
	.handle(({ siteKey, level }, { browserGrants, clock, invalidate }) => {
		invalidate(SiteAccessQuery);
		const refusal = refuseSiteKey(siteKey);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const written = siteLevelToWrite(browserGrants.grants(), {
			siteKey,
			level,
			by: "person",
			reason: SET_IN_SITE_ACCESS,
			at: clock.now(),
		});

		if (written === null) {
			console.info(`[widgetarium] site ${siteKey} level ${level} skipped: already set`);
			return;
		}

		browserGrants.saveGrants(written.grants, written.change);
		console.info(`[widgetarium] site ${siteKey} ${written.change.was ?? "none"} → ${level} (${SET_IN_SITE_ACCESS})`);
	});

export const RereadSiteAccessSubscriber = subscriber(GrantsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(SiteAccessQuery);
});

export const RereadSiteAccessForOnceAllowancesSubscriber = subscriber(OnceAllowancesChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(SiteAccessQuery);
	},
);

export const RereadSiteAccessForPagesSubscriber = subscriber(PagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(SiteAccessQuery);
});

function rowsOf(grants: readonly SiteGrant[]): readonly SiteRow[] {
	return grants.map((grant) => ({
		siteKey: grant.siteKey,
		level: grant.level,
		source: grant.source,
		since: grant.grantedAt,
	}));
}
