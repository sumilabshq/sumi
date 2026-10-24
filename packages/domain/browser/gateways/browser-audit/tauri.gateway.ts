import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { AccessLogEntry } from "../../shared/schema/site-access.schema.js";
import { BrowserAuditGateway } from "./browser-audit.gateway.js";

export class TauriBrowserAuditGateway extends BrowserAuditGateway {
	constructor(
		private readonly store: StoreClient,
		private readonly file: string,
	) {
		super();
	}

	appendAccess(entry: AccessLogEntry): void {
		const line = {
			...entry,
			id: crypto.randomUUID(),
		};
		this.store.appendLine(GLOBAL_ROOT, this.file, line).catch((failure: unknown) => {
			console.error(`[widgetarium] ${this.file} lost a line`, failure);
		});
	}
}
