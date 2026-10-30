import type { KeptSiteIcon } from "../../shared/schema/site-icon.schema.js";

export type SiteIconChanged = (origin: string) => void;

export abstract class SiteIconsGateway {
	private readonly listeners = new Set<SiteIconChanged>();

	abstract siteIcons(): readonly KeptSiteIcon[];

	protected abstract writeSiteIcons(icons: readonly KeptSiteIcon[], reason: string): void;

	saveSiteIcons(icons: readonly KeptSiteIcon[], origin: string, reason: string): void {
		this.writeSiteIcons(icons, reason);

		for (const changed of [...this.listeners]) {
			changed(origin);
		}
	}

	siteIconChanged(listener: SiteIconChanged): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
