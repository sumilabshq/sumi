import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { KeptSiteIconsSchema } from "../../shared/schema/site-icon.schema.js";
import type { KeptSiteIcon, KeptSiteIcons } from "../../shared/schema/site-icon.schema.js";
import { SiteIconsGateway } from "./site-icons.gateway.js";

export function keptSiteIconsKind(file: string): DocKind<KeptSiteIcons> {
	return {
		file,
		v: 1,
		schema: KeptSiteIconsSchema,
	};
}

export class TauriSiteIconsGateway extends SiteIconsGateway {
	constructor(private readonly kept: HeldDoc<KeptSiteIcons>) {
		super();
	}

	siteIcons(): readonly KeptSiteIcon[] {
		return this.kept.now().icons;
	}

	protected writeSiteIcons(icons: readonly KeptSiteIcon[], reason: string): void {
		this.kept.change({ icons: [...icons] }, reason);
	}
}
