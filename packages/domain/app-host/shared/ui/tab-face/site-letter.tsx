import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SITE_TILE_FILLS } from "../../lib/tab-art/tab-art-shapes.js";
import type { TabArtSize } from "./tab-art.js";

export interface SiteLetterProps {
	readonly letter: string;
	readonly size: TabArtSize;
	readonly px: number;
}

const LETTER_TYPE: Readonly<Record<TabArtSize, string>> = {
	row: "cv:text-[10px]",
	tile: "cv:text-[11px]",
};
const LETTER =
	"cv:mx-px cv:inline-flex cv:flex-none cv:items-center cv:justify-center cv:rounded-[4px] cv:font-bold cv:leading-none cv:text-white";

export function SiteLetter({ letter, size, px }: SiteLetterProps): ReactElement {
	return (
		<span
			aria-hidden="true"
			className={`${LETTER} ${LETTER_TYPE[size]}`}
			style={{
				width: px,
				height: px,
				background: SITE_TILE_FILLS[letter.charCodeAt(0) % SITE_TILE_FILLS.length],
			}}
			data-tab-art="site"
		>
			{letter}
		</span>
	);
}
