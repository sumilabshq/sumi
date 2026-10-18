import type { BrowserTab, RecentSite } from "../schema/browser-tab.schema.js";
import { urlOf } from "./site-key.js";

export const RECENT_SITES_KEPT = 8;

const WEB_PAGE = /^https?:$/;

export function visitOf(tab: BrowserTab): RecentSite | null {
	const url = urlOf(tab.url);

	if (tab.isLoading || tab.failure !== null || url === null || !WEB_PAGE.test(url.protocol)) {
		return null;
	}

	return {
		host: url.hostname,
		address: `${url.origin}/`,
		favicon: tab.favicon,
	};
}

export function withVisit(sites: readonly RecentSite[], visit: RecentSite): readonly RecentSite[] {
	return [visit, ...sites.filter((site) => site.host !== visit.host)].slice(0, RECENT_SITES_KEPT);
}

export function isSameSites(sites: readonly RecentSite[], other: readonly RecentSite[]): boolean {
	return sites.length === other.length && sites.every((site, at) => isSameSite(site, other[at]));
}

function isSameSite(site: RecentSite, other: RecentSite | undefined): boolean {
	return site.host === other?.host && site.address === other.address && site.favicon === other.favicon;
}
