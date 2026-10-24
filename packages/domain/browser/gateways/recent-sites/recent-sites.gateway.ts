import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";

export abstract class RecentSitesGateway {
	abstract sites(): readonly RecentSite[];
	abstract watch(changed: () => void): () => void;
	abstract keep(sites: readonly RecentSite[], reason: string): void;
}
