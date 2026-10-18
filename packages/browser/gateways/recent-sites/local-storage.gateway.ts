import { z } from "zod";
import { RecentSiteSchema } from "../../shared/schema/browser-tab.schema.js";
import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { storageKeyOfProfile } from "../../shared/lib/browser-profile.js";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

const RecentSitesSchema = z.array(RecentSiteSchema);

export class LocalStorageRecentSitesGateway extends RecentSitesGateway {
	private readonly key: string;
	private readonly watchers = new Set<() => void>();
	private kept: readonly RecentSite[];

	constructor(
		private readonly storage: Storage,
		profileId: string,
	) {
		super();
		this.key = storageKeyOfProfile("recent-sites", profileId);
		this.kept = this.read();
	}

	sites(): readonly RecentSite[] {
		return this.kept;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	keep(sites: readonly RecentSite[], reason: string): void {
		const was = this.kept.map(({ host }) => host);
		this.storage.setItem(this.key, JSON.stringify(sites));
		this.kept = sites;
		console.debug(
			`[widgetarium] browser recent sites ${was.join(",")} → ${sites.map(({ host }) => host).join(",")} (${reason})`,
		);
		for (const changed of [...this.watchers]) {
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

function jsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
