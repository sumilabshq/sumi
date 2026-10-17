import { z } from "zod";
import { GrantChangeSchema, SiteGrantSchema } from "../../shared/schema/site-access.schema.js";
import type { GrantChange, SiteGrant } from "../../shared/schema/site-access.schema.js";
import { storageKeyOfProfile } from "../../shared/lib/browser-profile.js";
import { BrowserGrantsGateway } from "./browser-grants.gateway.js";

const GrantsSchema = z.array(SiteGrantSchema);
const ChangesSchema = z.array(GrantChangeSchema);

// TRADE-OFF: oldest changes dropped past this; a file log would keep all
const KEPT_CHANGES = 2000;

// TODO: H1, any vault widget can rewrite these grants in localStorage
export class LocalStorageBrowserGrantsGateway extends BrowserGrantsGateway {
	private readonly grantsKey: string;
	private readonly changesKey: string;
	private readonly watchers = new Set<() => void>();

	constructor(
		private readonly storage: Storage,
		profileId: string,
	) {
		super();
		this.grantsKey = storageKeyOfProfile("grants", profileId);
		this.changesKey = storageKeyOfProfile("grant-changes", profileId);
	}

	readGrants(): readonly SiteGrant[] {
		return this.parsed(this.grantsKey, GrantsSchema);
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	writeGrantChange(grants: readonly SiteGrant[], change: GrantChange): void {
		const before = this.storage.getItem(this.grantsKey);
		const changes = [...this.parsed(this.changesKey, ChangesSchema), change].slice(-KEPT_CHANGES);
		this.storage.setItem(this.grantsKey, JSON.stringify(grants));

		try {
			this.storage.setItem(this.changesKey, JSON.stringify(changes));
		} catch (failure) {
			this.restoreGrants(before);
			throw failure;
		}

		for (const changed of [...this.watchers]) {
			changed();
		}
	}

	private restoreGrants(before: string | null): void {
		if (before === null) {
			this.storage.removeItem(this.grantsKey);
			return;
		}

		this.storage.setItem(this.grantsKey, before);
	}

	private parsed<T>(key: string, schema: z.ZodType<T[]>): readonly T[] {
		const parsed = schema.safeParse(jsonOf(this.storage.getItem(key) ?? "[]"));

		if (!parsed.success) {
			console.error(`[widgetarium] browser site access ${key} is unreadable and was ignored`, parsed.error);
			return [];
		}

		return parsed.data;
	}
}

function jsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
