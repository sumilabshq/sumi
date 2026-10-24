import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { RecentSiteSchema } from "../../shared/schema/browser-tab.schema.js";
import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

export const KeptRecentSitesSchema = z.looseObject({
	sites: z.array(RecentSiteSchema).catch([]),
});

export type KeptRecentSites = z.infer<typeof KeptRecentSitesSchema>;

const VISITED = "a tab finished loading a page";

export function keptRecentSitesKind(file: string): DocKind<KeptRecentSites> {
	return {
		file,
		v: 1,
		schema: KeptRecentSitesSchema,
	};
}

export class TauriRecentSitesGateway extends RecentSitesGateway {
	constructor(private readonly kept: HeldDoc<KeptRecentSites>) {
		super();
	}

	recentSites(): readonly RecentSite[] {
		return this.kept.now().sites;
	}

	recentSitesChanged(listener: () => void): () => void {
		return this.kept.watch(listener);
	}

	saveRecentSites(sites: readonly RecentSite[]): void {
		this.kept.change({ sites: [...sites] }, VISITED);
	}
}
