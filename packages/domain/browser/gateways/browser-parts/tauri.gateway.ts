import { DEFAULT_BROWSER_PROFILE } from "../../shared/lib/browser-profile.js";
import { LocalStorageBrowserAuditGateway } from "../browser-audit/local-storage.gateway.js";
import { LocalStorageBrowserGrantsGateway } from "../browser-grants/local-storage.gateway.js";
import { tauriPagesBridge } from "../browser-pages/tauri/pages-bridge.js";
import type { BrowserPagesIpc } from "../browser-pages/tauri/pages-bridge.js";
import { TauriBrowserPagesGateway } from "../browser-pages/tauri/tauri.gateway.js";
import { NoChatComposerGateway } from "../chat-composer/none.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { LocalStorageRecentSitesGateway } from "../recent-sites/local-storage.gateway.js";
import { browserPartsOf } from "./browser-parts.gateway.js";
import type { BrowserGateways, BrowserParts } from "./browser-parts.gateway.js";

export interface TauriBrowserHold {
	readonly ipc: BrowserPagesIpc;
	readonly machineStorage: Storage;
	readonly profileId?: string;
	readonly profileGateways?: Pick<
		BrowserGateways,
		"browserGrantsGateway" | "browserAuditGateway" | "recentSitesGateway"
	>;
}

export function tauriBrowserParts({
	ipc,
	machineStorage,
	profileId = DEFAULT_BROWSER_PROFILE,
	profileGateways,
}: TauriBrowserHold): BrowserParts {
	return browserPartsOf({
		browserPagesGateway: new TauriBrowserPagesGateway(tauriPagesBridge(ipc), profileId),
		browserGrantsGateway: new LocalStorageBrowserGrantsGateway(machineStorage, profileId),
		browserAuditGateway: new LocalStorageBrowserAuditGateway(machineStorage, profileId),
		clockGateway: new SystemClockGateway(),
		chatComposerGateway: new NoChatComposerGateway(),
		recentSitesGateway: new LocalStorageRecentSitesGateway(machineStorage, profileId),
		...profileGateways,
	});
}
