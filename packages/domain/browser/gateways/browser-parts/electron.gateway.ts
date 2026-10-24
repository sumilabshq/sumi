import { DEFAULT_BROWSER_PROFILE } from "../../shared/lib/browser-profile.js";
import { LocalStorageBrowserAuditGateway } from "../browser-audit/local-storage.gateway.js";
import { LocalStorageBrowserGrantsGateway } from "../browser-grants/local-storage.gateway.js";
import { ElectronBrowserPagesGateway } from "../browser-pages/electron/electron.gateway.js";
import { LocalStorageRecentSitesGateway } from "../recent-sites/local-storage.gateway.js";
import type { BrowserParts } from "./browser-parts.gateway.js";
import { browserPartsOf } from "./memory.gateway.js";

const REMOTE_MODULE = "@electron/remote";

// TRADE-OFF: Obsidian desktop reaches its Electron through window.require; the facts name only "browser"
export function electronRemoteOfWindow(): unknown {
	const loadModule: unknown = Reflect.get(globalThis, "require");

	if (typeof loadModule !== "function") {
		return null;
	}

	return Reflect.apply(loadModule, globalThis, [REMOTE_MODULE]);
}

export function electronBrowserParts(remote: unknown): BrowserParts {
	const machineStorage = globalThis.localStorage;
	return browserPartsOf({
		browserPages: new ElectronBrowserPagesGateway(remote, DEFAULT_BROWSER_PROFILE),
		browserGrants: new LocalStorageBrowserGrantsGateway(machineStorage, DEFAULT_BROWSER_PROFILE),
		browserAudit: new LocalStorageBrowserAuditGateway(machineStorage, DEFAULT_BROWSER_PROFILE),
		recentSites: new LocalStorageRecentSitesGateway(machineStorage, DEFAULT_BROWSER_PROFILE),
	});
}
