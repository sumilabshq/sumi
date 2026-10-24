import { z } from "zod";
import { AccessLogEntrySchema } from "../../shared/schema/site-access.schema.js";
import type { AccessLogEntry } from "../../shared/schema/site-access.schema.js";
import { storageKeyOfProfile } from "../../shared/lib/browser-profile.js";
import { jsonOf } from "../../shared/lib/json-of.js";
import { BrowserAuditGateway } from "./browser-audit.gateway.js";

// TRADE-OFF: oldest lines dropped past this; a file log would keep all
const KEPT_LINES = 2000;

export class LocalStorageBrowserAuditGateway extends BrowserAuditGateway {
	private readonly accessKey: string;

	constructor(
		private readonly storage: Storage,
		profileId: string,
	) {
		super();
		this.accessKey = storageKeyOfProfile("access-log", profileId);
	}

	appendAccess(entry: AccessLogEntry): void {
		this.append(this.accessKey, [...this.read(this.accessKey, z.array(AccessLogEntrySchema)), entry]);
	}

	private read<T>(key: string, schema: z.ZodType<T[]>): readonly T[] {
		const parsed = schema.safeParse(jsonOf(this.storage.getItem(key) ?? "[]"));

		if (!parsed.success) {
			console.error(`[widgetarium] the browser log ${key} is unreadable and starts again`, parsed.error);
			return [];
		}

		return parsed.data;
	}

	private append(key: string, lines: readonly unknown[]): void {
		this.storage.setItem(key, JSON.stringify(lines.slice(-KEPT_LINES)));
	}
}
