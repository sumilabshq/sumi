import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { SiteIconQuery } from "@widgetarium/browser";
import { FaviconImage } from "./favicon-image.js";
import type { TabArtSize } from "./tab-art.js";

export interface KnownSiteIconProps {
	readonly origin: string;
	readonly size: TabArtSize;
	readonly fallback: ReactElement;
}

export function KnownSiteIcon({ origin, size, fallback }: KnownSiteIconProps): ReactElement {
	const icon = useOptionalQuery(SiteIconQuery, { origin }).data?.icon ?? null;

	if (icon === null) {
		return fallback;
	}

	return <FaviconImage src={icon} size={size} fallback={fallback} />;
}
