import type { KeptSiteIcon } from "../../shared/schema/site-icon.schema.js";

export abstract class SiteIconsGateway {
	abstract siteIcons(): readonly KeptSiteIcon[];
	abstract saveSiteIcons(icons: readonly KeptSiteIcon[], reason: string): void;
}
