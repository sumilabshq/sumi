import type { ConfigFacts, Platform } from "@widgetarium/data-framework";
import type { BrowserConfig } from "../../shared/host/browser.host.js";
import type { AccessAsksGateway } from "../access-asks/access-asks.gateway.js";
import type { BrowserAuditGateway } from "../browser-audit/browser-audit.gateway.js";
import type { BrowserGrantReadsGateway } from "../browser-grant-reads/browser-grant-reads.gateway.js";
import type { BrowserGrantsGateway } from "../browser-grants/browser-grants.gateway.js";
import type { BrowserPagesGateway } from "../browser-pages/browser-pages.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import type { InkActivityGateway } from "../ink-activity/ink-activity.gateway.js";
import type { OnceAllowancesGateway } from "../once-allowances/once-allowances.gateway.js";
import type { RecentSitesGateway } from "../recent-sites/recent-sites.gateway.js";
import type { SiteFilesGateway } from "../site-files/site-files.gateway.js";
import type { SiteIconsGateway } from "../site-icons/site-icons.gateway.js";
import { electronRemoteOfWindow, electronBrowserParts } from "./electron.gateway.js";
import { tauriBrowserParts } from "./tauri.gateway.js";
import { webBrowserParts } from "./web.gateway.js";

export type KeptBrowserParts = {
	readonly browserPages: BrowserPagesGateway;
	readonly browserGrants: BrowserGrantsGateway;
	readonly browserAudit: BrowserAuditGateway;
	readonly recentSites: RecentSitesGateway;
};

export type SiteIconParts = {
	readonly siteIcons: SiteIconsGateway;
	readonly siteFiles: SiteFilesGateway;
};

export type BrowserParts = KeptBrowserParts &
	SiteIconParts & {
		readonly browserGrantReads: BrowserGrantReadsGateway;
		readonly clock: ClockGateway;
		readonly onceAllowances: OnceAllowancesGateway;
		readonly accessAsks: AccessAsksGateway;
		readonly inkActivity: InkActivityGateway;
	};

const UNHOSTED_PARTS_ON: Readonly<Record<Platform, () => BrowserParts>> = {
	browser: () => startedOrOff(browserWindowParts),
	tauri: webBrowserParts,
	server: webBrowserParts,
};

export function browserPartsOn({ platform, config }: ConfigFacts<BrowserConfig>): BrowserParts {
	const { tauri } = config;

	if (tauri !== undefined) {
		return startedOrOff(() => tauriBrowserParts(tauri.ipc));
	}

	return UNHOSTED_PARTS_ON[platform]();
}

function browserWindowParts(): BrowserParts {
	const remote = electronRemoteOfWindow();
	return remote === null ? webBrowserParts() : electronBrowserParts(remote);
}

function startedOrOff(start: () => BrowserParts): BrowserParts {
	try {
		return start();
	} catch (failure) {
		console.error("[widgetarium] the browser could not start and stays off", failure);
		return webBrowserParts();
	}
}
