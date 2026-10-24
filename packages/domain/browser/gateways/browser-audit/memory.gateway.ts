import type { AccessLogEntry } from "../../shared/schema/site-access.schema.js";
import { BrowserAuditGateway } from "./browser-audit.gateway.js";

export class MemoryBrowserAuditGateway extends BrowserAuditGateway {
	readonly access: AccessLogEntry[] = [];

	appendAccess(entry: AccessLogEntry): void {
		this.access.push(entry);
	}

	recentAccess(): readonly AccessLogEntry[] {
		return this.access;
	}
}
