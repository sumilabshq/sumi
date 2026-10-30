import type { KeptSiteIcon } from "../../shared/schema/site-icon.schema.js";
import { SiteIconsGateway } from "./site-icons.gateway.js";

export class MemorySiteIconsGateway extends SiteIconsGateway {
	private kept: readonly KeptSiteIcon[] = [];

	siteIcons(): readonly KeptSiteIcon[] {
		return this.kept;
	}

	protected writeSiteIcons(icons: readonly KeptSiteIcon[]): void {
		this.kept = icons;
	}
}
