import { MemoryAccessAsksGateway } from "../access-asks/memory.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { MemoryInkActivityGateway } from "../ink-activity/memory.gateway.js";
import { MemoryOnceAllowancesGateway } from "../once-allowances/memory.gateway.js";
import { MemorySiteFilesGateway } from "../site-files/memory.gateway.js";
import { MemorySiteIconsGateway } from "../site-icons/memory.gateway.js";
import type { BrowserParts, KeptBrowserParts, SiteIconParts } from "./browser-parts.gateway.js";

export function browserPartsOf(
	kept: KeptBrowserParts & Partial<SiteIconParts>,
	clock: ClockGateway = new SystemClockGateway(),
): BrowserParts {
	return {
		siteIcons: new MemorySiteIconsGateway(),
		siteFiles: new MemorySiteFilesGateway(),
		...kept,
		browserGrantReads: kept.browserGrants,
		clock,
		onceAllowances: new MemoryOnceAllowancesGateway(),
		accessAsks: new MemoryAccessAsksGateway(),
		inkActivity: new MemoryInkActivityGateway(),
	};
}
