import { handler } from "@widgetarium/core/requests";
import { BrowserGrantReadsGateway } from "../../gateways/browser-grant-reads/browser-grant-reads.gateway.js";
import { BrowserGrantsGateway } from "../../gateways/browser-grants/browser-grants.gateway.js";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { siteLevelToWrite } from "../../shared/lib/grant-changes.js";
import { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { effectiveGrants } from "../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../shared/lib/sensitive-sites.js";
import { decideBrowserAccess } from "../../shared/lib/decide-browser-access.js";
import type { SiteGrant, SiteRow } from "../../shared/schema/site-access.schema.js";
import { BrowserClientModule } from "../../module.js";
import { SetSiteLevelCommand, SiteAccessQuery } from "./contract.js";

const SET_IN_SITE_ACCESS = "set in site access";

export const SiteAccessQueryHandler = handler(SiteAccessQuery, BrowserClientModule)
	.inject({
		browserGrantReadsGateway: BrowserGrantReadsGateway,
		onceAllowancesStore: OnceAllowancesStore,
		browserPagesGateway: BrowserPagesGateway,
		clockGateway: ClockGateway,
	})
	.watch((_input, { browserGrantReadsGateway, onceAllowancesStore, browserPagesGateway }, changed) => {
		const stops = [
			browserGrantReadsGateway.watch(changed),
			onceAllowancesStore.watch(changed),
			browserPagesGateway.watch(changed),
		];
		return () => stops.forEach((stop) => stop());
	})
	.handle((_input, { browserGrantReadsGateway, onceAllowancesStore, browserPagesGateway, clockGateway }) => {
		const persisted = browserGrantReadsGateway.readGrants();
		const shownId = browserPagesGateway.shownId();
		const shownTab = browserPagesGateway.tabs().find((tab) => tab.id === shownId);
		const shownUrl = shownTab?.failure === null ? shownTab.url : "";
		const grants = effectiveGrants(persisted, onceAllowancesStore.allowances(), clockGateway.now());
		return {
			shown:
				shownUrl === "" ? null : decideBrowserAccess({ address: shownUrl, tabId: shownId }, grants, SENSITIVE_SITES),
			rows: rowsOf(persisted),
		};
	});

export const SetSiteLevelCommandHandler = handler(SetSiteLevelCommand, BrowserClientModule)
	.inject({
		browserGrantsGateway: BrowserGrantsGateway,
		clockGateway: ClockGateway,
	})
	.handle(({ siteKey, level }, { browserGrantsGateway, clockGateway }) => {
		const written = siteLevelToWrite(browserGrantsGateway.readGrants(), {
			siteKey,
			level,
			by: "person",
			reason: SET_IN_SITE_ACCESS,
			at: clockGateway.now(),
		});

		if (written === null) {
			return;
		}

		browserGrantsGateway.writeGrantChange(written.grants, written.change);
	});

function rowsOf(grants: readonly SiteGrant[]): readonly SiteRow[] {
	return grants.map((grant) => ({
		siteKey: grant.siteKey,
		level: grant.level,
		source: grant.source,
		since: grant.grantedAt,
	}));
}
