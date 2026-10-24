import { MemoryBrowserAuditGateway } from "../browser-audit/memory.gateway.js";
import { MemoryBrowserGrantsGateway } from "../browser-grants/memory.gateway.js";
import { WebBrowserPagesGateway } from "../browser-pages/web.gateway.js";
import { MemoryRecentSitesGateway } from "../recent-sites/memory.gateway.js";
import type { BrowserParts } from "./browser-parts.gateway.js";
import { browserPartsOf } from "./memory.gateway.js";

export function webBrowserParts(): BrowserParts {
	return browserPartsOf({
		browserPages: new WebBrowserPagesGateway(),
		browserGrants: new MemoryBrowserGrantsGateway(),
		browserAudit: new MemoryBrowserAuditGateway(),
		recentSites: new MemoryRecentSitesGateway(),
	});
}
