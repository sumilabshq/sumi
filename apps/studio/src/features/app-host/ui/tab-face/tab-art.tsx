import { createElement as h, useId, useState } from "react";
import type { ReactElement } from "react";
import { MASK_KEEP, TAB_ART_SHAPES } from "../../lib/tab-art/tab-art-shapes.js";
import type { ArtShape } from "../../lib/tab-art/tab-art-shapes.js";
import { siteLetterOf } from "../../lib/tab-art/site-letter.js";
import type { TabArt as TabArtName } from "@widgetarium/app-host";
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
	const idOfMask = useId();
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
	const shapes = TAB_ART_SHAPES[icon];
	const cuts = shapes.filter((shape) => shape.isCut === true);
	const maskId = `tab-art-cut${idOfMask.replace(/\W/g, "")}`;
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true" width={px} height={px} className={ART} data-tab-art={icon}>
			{cuts.length === 0 ? null : (
				<mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
					<rect width="20" height="20" fill={MASK_KEEP} />
					{cuts.map(drawnShapeOf)}
				</mask>
			)}
			<g mask={cuts.length === 0 ? undefined : `url(#${maskId})`}>
				{shapes.filter((shape) => shape.isCut !== true).map(drawnShapeOf)}
			</g>
		</svg>
	);
}

function drawnShapeOf({ tag, attrs, text }: ArtShape, at: number): ReactElement {
	return h(tag, { key: at, ...attrs }, text);
}
