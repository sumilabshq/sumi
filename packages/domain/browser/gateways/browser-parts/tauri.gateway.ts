import { studioWindowOf } from "@widgetarium/behaviors";
import { GLOBAL_ROOT, HeldDoc, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { DEFAULT_BROWSER_PROFILE } from "../../shared/lib/browser-profile.js";
import { TauriBrowserAuditGateway } from "../browser-audit/tauri.gateway.js";
import { KeptGrantsSchema, TauriBrowserGrantsGateway, keptGrantsKind } from "../browser-grants/tauri.gateway.js";
import { TauriBrowserPagesGateway, tauriPagesBridge } from "../browser-pages/tauri/tauri.gateway.js";
import type { BrowserPagesIpc } from "../browser-pages/tauri/tauri.gateway.js";
import { KeptRecentSitesSchema, TauriRecentSitesGateway, keptRecentSitesKind } from "../recent-sites/tauri.gateway.js";
import { KeptSiteIconsSchema } from "../../shared/schema/site-icon.schema.js";
import { TauriSiteFilesGateway } from "../site-files/tauri/tauri.gateway.js";
import { TauriSiteIconsGateway, keptSiteIconsKind } from "../site-icons/tauri.gateway.js";
import type { BrowserParts } from "./browser-parts.gateway.js";
import { browserPartsOf } from "./memory.gateway.js";

export interface TauriProfileFiles {
	readonly grants: string;
	readonly grantChanges: string;
	readonly access: string;
	readonly recentSites: string;
	readonly siteIcons: string;
}

export function profileFilesOf(profileId: string): TauriProfileFiles {
	const at = (file: string): string => `profiles/${profileId}/${file}`;
	return {
		grants: at("grants.json"),
		grantChanges: at("grant-changes.jsonl"),
		access: at("access.jsonl"),
		recentSites: at("recent-sites.json"),
		siteIcons: at("site-icons.json"),
	};
}

export function tauriBrowserParts(ipc: BrowserPagesIpc): BrowserParts {
	const store = new StoreClient((command, args) => ipc.invoke(command, args));
	const files = profileFilesOf(DEFAULT_BROWSER_PROFILE);
	const grants = HeldDoc.reading({
		store,
		root: GLOBAL_ROOT,
		kind: keptGrantsKind(files),
		empty: KeptGrantsSchema.parse({}),
	});
	const recentSites = HeldDoc.reading({
		store,
		root: GLOBAL_ROOT,
		kind: keptRecentSitesKind(files.recentSites),
		empty: KeptRecentSitesSchema.parse({}),
	});
	const siteIcons = new TauriSiteIconsGateway(
		HeldDoc.reading({
			store,
			root: GLOBAL_ROOT,
			kind: keptSiteIconsKind(files.siteIcons),
			empty: KeptSiteIconsSchema.parse({}),
		}),
	);
	const siteFiles = new TauriSiteFilesGateway(ipc);
	return browserPartsOf({
		browserPages: new TauriBrowserPagesGateway(tauriPagesBridge(ipc), {
			profileId: DEFAULT_BROWSER_PROFILE,
			ownLabel: studioWindowOf(location.search).label,
			siteIcons,
			siteFiles,
		}),
		browserGrants: new TauriBrowserGrantsGateway(grants, store, files),
		browserAudit: new TauriBrowserAuditGateway(store, files.access),
		recentSites: new TauriRecentSitesGateway(recentSites),
		siteIcons,
		siteFiles,
	});
}
