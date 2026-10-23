import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { TAB_ART_SHAPES } from "../../lib/tab-art/tab-art-shapes.js";
import { siteLetterOf } from "../../lib/tab-art/tab-art-of.js";
import type { TabArt as TabArtName } from "../../schema/app-tab.schema.js";
import { SiteLetter } from "./site-letter.js";

export type TabArtSize = "row" | "tile";

export interface TabArtProps {
	readonly icon: TabArtName;
	readonly favicon: string | null;
	readonly title: string;
	readonly address: string | null;
	readonly size: TabArtSize;
}

const ART_PX: Readonly<Record<TabArtSize, number>> = {
	row: 18,
	tile: 20,
};
const LETTER_PX: Readonly<Record<TabArtSize, number>> = {
	row: 16,
	tile: 18,
};
const ART = "cv:block cv:flex-none";

export function TabArt({ icon, favicon, title, address, size }: TabArtProps): ReactElement {
	const [failed, setFailed] = useState<string | null>(null);
	const letterPx = LETTER_PX[size];

	if (favicon !== null && favicon !== failed) {
		return (
			<img
				src={favicon}
				alt=""
				width={letterPx}
				height={letterPx}
				className="cv:mx-px cv:flex-none cv:rounded-[4px]"
				onError={() => setFailed(favicon)}
				data-host-tab-favicon=""
			/>
		);
	}

	if (icon === "site") {
		return <SiteLetter letter={siteLetterOf(title, address)} size={size} px={letterPx} />;
	}

	const px = ART_PX[size];
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true" width={px} height={px} className={ART} data-tab-art={icon}>
			{TAB_ART_SHAPES[icon].map(({ tag, attrs, text }, at) => h(tag, { key: at, ...attrs }, text))}
		</svg>
	);
}
