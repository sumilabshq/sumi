import type { AccessLogEntry } from "../../shared/schema/site-access.schema.js";

export abstract class BrowserAuditGateway {
	abstract appendAccess(entry: AccessLogEntry): void;
}
