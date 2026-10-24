import { MemoryBrowserAuditGateway } from "../browser-audit/memory.gateway.js";
import { MemoryBrowserGrantsGateway } from "../browser-grants/memory.gateway.js";
import { WebBrowserPagesGateway } from "../browser-pages/web.gateway.js";
import { NoChatComposerGateway } from "../chat-composer/none.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { MemoryRecentSitesGateway } from "../recent-sites/memory.gateway.js";
import { browserPartsOf } from "./browser-parts.gateway.js";
import type { BrowserParts } from "./browser-parts.gateway.js";

export function webBrowserParts(): BrowserParts {
	return browserPartsOf({
		browserPagesGateway: new WebBrowserPagesGateway(),
		browserGrantsGateway: new MemoryBrowserGrantsGateway(),
		browserAuditGateway: new MemoryBrowserAuditGateway(),
		clockGateway: new SystemClockGateway(),
		chatComposerGateway: new NoChatComposerGateway(),
		recentSitesGateway: new MemoryRecentSitesGateway(),
	});
}
