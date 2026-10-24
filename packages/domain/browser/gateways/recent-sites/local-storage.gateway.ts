import { z } from "zod";
import { RecentSiteSchema } from "../../shared/schema/browser-tab.schema.js";
import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { storageKeyOfProfile } from "../../shared/lib/browser-profile.js";
import { jsonOf } from "../../shared/lib/json-of.js";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

const RecentSitesSchema = z.array(RecentSiteSchema);

export class LocalStorageRecentSitesGateway extends RecentSitesGateway {
	private readonly key: string;
	private readonly listeners = new Set<() => void>();
	private kept: readonly RecentSite[];

	constructor(
		private readonly storage: Storage,
		profileId: string,
	) {
		super();
		this.key = storageKeyOfProfile("recent-sites", profileId);
		this.kept = this.read();
	}

	recentSites(): readonly RecentSite[] {
		return this.kept;
	}

	recentSitesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveRecentSites(sites: readonly RecentSite[]): void {
		this.storage.setItem(this.key, JSON.stringify(sites));
		this.kept = sites;
		for (const changed of [...this.listeners]) {
			changed();
		}
	}

	private read(): readonly RecentSite[] {
		const parsed = RecentSitesSchema.safeParse(jsonOf(this.storage.getItem(this.key) ?? "[]"));

		if (!parsed.success) {
			console.error(`[widgetarium] browser recent sites ${this.key} are unreadable and were ignored`, parsed.error);
			return [];
		}

		return parsed.data;
	}
}
