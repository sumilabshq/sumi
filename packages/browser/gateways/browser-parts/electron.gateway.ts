import { DEFAULT_BROWSER_PROFILE } from "../../shared/lib/browser-profile.js";
import { LocalStorageBrowserAuditGateway } from "../browser-audit/local-storage.gateway.js";
import { LocalStorageBrowserGrantsGateway } from "../browser-grants/local-storage.gateway.js";
import { ElectronBrowserPagesGateway } from "../browser-pages/electron/electron.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { browserPartsOf } from "./browser-parts.gateway.js";
import type { BrowserParts } from "./browser-parts.gateway.js";

export interface ElectronBrowserHold {
	readonly remote: unknown;
	readonly machineStorage: Storage;
	readonly profileId?: string;
}

export function electronBrowserParts({
	remote,
	machineStorage,
	profileId = DEFAULT_BROWSER_PROFILE,
}: ElectronBrowserHold): BrowserParts {
	return browserPartsOf({
		browserPagesGateway: new ElectronBrowserPagesGateway(remote, profileId),
		browserGrantsGateway: new LocalStorageBrowserGrantsGateway(machineStorage, profileId),
		browserAuditGateway: new LocalStorageBrowserAuditGateway(machineStorage, profileId),
		clockGateway: new SystemClockGateway(),
	});
}
