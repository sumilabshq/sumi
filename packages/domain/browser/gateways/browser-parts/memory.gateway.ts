import { MemoryAccessAsksGateway } from "../access-asks/memory.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { MemoryInkActivityGateway } from "../ink-activity/memory.gateway.js";
import { MemoryOnceAllowancesGateway } from "../once-allowances/memory.gateway.js";
import type { BrowserParts, KeptBrowserParts } from "./browser-parts.gateway.js";

export function browserPartsOf(kept: KeptBrowserParts, clock: ClockGateway = new SystemClockGateway()): BrowserParts {
	return {
		...kept,
		browserGrantReads: kept.browserGrants,
		clock,
		onceAllowances: new MemoryOnceAllowancesGateway(),
		accessAsks: new MemoryAccessAsksGateway(),
		inkActivity: new MemoryInkActivityGateway(),
	};
}
