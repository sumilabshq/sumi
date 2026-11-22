import { createElement as h, useId } from "react";
import type { ReactElement } from "react";
import { ART_VIEW_BOX, MASK_KEEP, TAB_ART_SHAPES } from "../../lib/tab-art/tab-art-shapes.js";
import type { ArtShape } from "../../lib/tab-art/tab-art-shapes.js";
import { siteLetterOf } from "../../lib/tab-art/site-letter.js";
import { webOriginOf } from "../../lib/tab-art/site-origin.js";
import type { TabArt as TabArtName } from "@widgetarium/app-host/contract";
import { FaviconImage } from "./favicon-image.js";
import { KnownSiteIcon } from "./known-site-icon.js";
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
	row: 16,
	tile: 20,
};
const LETTER_PX: Readonly<Record<TabArtSize, number>> = {
	row: 16,
	tile: 18,
};
const ART = "cv:mx-px cv:block cv:flex-none";
const ART_TINT: Readonly<Record<Exclude<TabArtName, "site">, string | undefined>> = {
	canvas: "var(--hue-purple)",
	tasks: "var(--hue-teal)",
	browser: "var(--hue-blue)",
	git: "var(--hue-orange)",
	files: "var(--hue-blue)",
	routines: "var(--hue-green)",
	settings: "var(--hue-slate)",
	note: "var(--hue-amber)",
	table: "var(--hue-green)",
	image: "var(--hue-pink)",
	"built-app": "var(--hue-purple)",
	"code-css": "var(--hue-blue)",
	"code-js": "var(--hue-amber)",
	"code-py": "var(--hue-teal)",
	"code-ts": "var(--hue-blue)",
	chat: undefined,
};

export function TabArt({ icon, favicon, title, address, size }: TabArtProps): ReactElement {
	const idOfMask = useId();

	if (icon === "site") {
		return siteArtOf({ favicon, title, address, size });
	}

	const art = shapeArtOf(icon, size, `tab-art-cut${idOfMask.replace(/\W/g, "")}`);
	return favicon === null ? art : <FaviconImage src={favicon} size={size} fallback={art} />;
}

function shapeArtOf(icon: Exclude<TabArtName, "site">, size: TabArtSize, maskId: string): ReactElement {
	const px = ART_PX[size];
	const shapes = TAB_ART_SHAPES[icon];
	const cuts = shapes.filter((shape) => shape.isCut === true);
	return (
		<svg
			viewBox={ART_VIEW_BOX}
			aria-hidden="true"
			width={px}
			height={px}
			className={ART}
			style={{ color: ART_TINT[icon] }}
			data-tab-art={icon}
		>
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

function siteArtOf({ favicon, title, address, size }: Omit<TabArtProps, "icon">): ReactElement {
	const letter = <SiteLetter letter={siteLetterOf(title, address)} size={size} px={LETTER_PX[size]} />;

	if (favicon !== null) {
		return <FaviconImage src={favicon} size={size} fallback={letter} />;
	}

	const origin = webOriginOf(address);
	return origin === null ? letter : <KnownSiteIcon origin={origin} size={size} fallback={letter} />;
}

function drawnShapeOf({ tag, attrs, text }: ArtShape, at: number): ReactElement {
	return h(tag, { key: at, ...attrs }, text);
}
