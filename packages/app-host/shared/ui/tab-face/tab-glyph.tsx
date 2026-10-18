import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AppTab } from "../../schema/app-tab.schema.js";

export interface TabGlyphProps {
	readonly tab: AppTab;
	readonly px?: number;
	readonly faviconPx?: number;
}

const FAVICON = "cv:flex-none cv:rounded-sm";

export function TabGlyph({ tab, px = 16, faviconPx = px }: TabGlyphProps): ReactElement {
	const [failedFavicon, setFailedFavicon] = useState<string | null>(null);

	if (tab.favicon === null || tab.favicon === failedFavicon) {
		return <Icon name={tab.icon} size={px} className="cv:flex-none" />;
	}

	return (
		<img
			src={tab.favicon}
			alt=""
			width={faviconPx}
			height={faviconPx}
			className={FAVICON}
			onError={() => setFailedFavicon(tab.favicon)}
			data-host-tab-favicon=""
		/>
	);
}
