import { studioWindowOf } from "@widgetarium/behaviors";
import { Channel, invoke } from "@tauri-apps/api/core";
import { GLOBAL_ROOT, HeldDoc, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { DEFAULT_BROWSER_PROFILE } from "../../shared/lib/browser-profile.js";
import { TauriBrowserAuditGateway } from "../browser-audit/tauri.gateway.js";
import { KeptGrantsSchema, TauriBrowserGrantsGateway, keptGrantsKind } from "../browser-grants/tauri.gateway.js";
import { TauriBrowserPagesGateway, tauriPagesBridge } from "../browser-pages/tauri/tauri.gateway.js";
import type { BrowserPagesIpc } from "../browser-pages/tauri/tauri.gateway.js";
import { KeptRecentSitesSchema, TauriRecentSitesGateway, keptRecentSitesKind } from "../recent-sites/tauri.gateway.js";
import type { BrowserParts } from "./browser-parts.gateway.js";
import { browserPartsOf } from "./memory.gateway.js";

export interface TauriProfileFiles {
	readonly grants: string;
	readonly grantChanges: string;
	readonly access: string;
	readonly recentSites: string;
}

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too, as in the layout module
const BROWSER_IPC: BrowserPagesIpc = {
	invoke: (command, args) => invoke(command, args),
	channel: (onMessage) => {
		const channel = new Channel<unknown>();
		channel.onmessage = onMessage;
		return channel;
	},
};

export function profileFilesOf(profileId: string): TauriProfileFiles {
	const at = (file: string): string => `profiles/${profileId}/${file}`;
	return {
		grants: at("grants.json"),
		grantChanges: at("grant-changes.jsonl"),
		access: at("access.jsonl"),
		recentSites: at("recent-sites.json"),
	};
}

export function tauriBrowserParts(ipc: BrowserPagesIpc = BROWSER_IPC): BrowserParts {
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
	return browserPartsOf({
		browserPages: new TauriBrowserPagesGateway(
			tauriPagesBridge(ipc),
			DEFAULT_BROWSER_PROFILE,
			studioWindowOf(location.search).label,
		),
		browserGrants: new TauriBrowserGrantsGateway(grants, store, files),
		browserAudit: new TauriBrowserAuditGateway(store, files.access),
		recentSites: new TauriRecentSitesGateway(recentSites),
	});
}
