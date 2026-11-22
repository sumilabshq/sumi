import { createElement as h } from "react";
import type { ReactElement } from "react";
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
	"cv:mx-px cv:inline-flex cv:flex-none cv:items-center cv:justify-center cv:bg-(--sumi-text-2) cv:font-semibold cv:leading-none cv:text-(--sumi-plate)";

export function SiteLetter({ letter, size, px }: SiteLetterProps): ReactElement {
	return (
		<span
			aria-hidden="true"
			className={`${LETTER} ${LETTER_TYPE[size]}`}
			style={{
				width: px,
				height: px,
			}}
			data-tab-art="site"
		>
			{letter}
		</span>
	);
}
