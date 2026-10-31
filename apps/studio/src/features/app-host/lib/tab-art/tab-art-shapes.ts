import type { TabArt } from "@widgetarium/app-host";

export interface ArtShape {
	readonly tag: "path" | "rect" | "circle" | "text";
	readonly attrs: Readonly<Record<string, string>>;
	readonly text?: string;
	readonly isCut?: boolean;
}

export const CUT_INK = "#000000";

export const MASK_KEEP = "#FFFFFF";

const CUT = true;

const PAGE = "M5 2h7l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z";
const FOLD = "M12 2v3a1 1 0 0 0 1 1h3z";

function codeOf(fill: string, letters: string, ink: string | typeof CUT): readonly ArtShape[] {
	return [codeBadgeOf(fill), codeLettersOf(letters, ink)];
}

function codeBadgeOf(fill: string): ArtShape {
	return {
		tag: "rect",
		attrs: {
			x: "2",
			y: "2",
			width: "16",
			height: "16",
			rx: "3.5",
			fill,
		},
	};
}

function codeLettersOf(letters: string, ink: string | typeof CUT): ArtShape {
	return {
		tag: "text",
		isCut: ink === CUT,
		attrs: {
			x: "16",
			y: "15.4",
			"text-anchor": "end",
			"font-family": "Inter, Arial, sans-serif",
			"font-size": letters.length > 2 ? "6.2" : "7.6",
			"font-weight": "700",
			fill: ink === CUT ? CUT_INK : ink,
		},
		text: letters,
	};
}

// TRADE-OFF: the icon set is artwork with its own fixed colours, the same in both themes, as the board draws it
export const TAB_ART_SHAPES: Readonly<Record<Exclude<TabArt, "site">, readonly ArtShape[]>> = {
	canvas: [
		{ tag: "rect", attrs: { x: "7.5", y: "7.5", width: "10", height: "10", rx: "3", fill: "#7C5CFF" } },
		{ tag: "circle", attrs: { cx: "7", cy: "7", r: "5", fill: "#FFB020", "fill-opacity": ".92" } },
	],
	terminal: [
		{ tag: "rect", attrs: { x: "2", y: "3", width: "16", height: "14", rx: "3.5", fill: "#2B2B2E" } },
		{
			tag: "path",
			isCut: CUT,
			attrs: {
				d: "M5.5 7.5l2.8 2.5-2.8 2.5M10 13h4.5",
				stroke: CUT_INK,
				"stroke-width": "1.6",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				fill: "none",
			},
		},
	],
	tasks: [
		{ tag: "rect", attrs: { x: "2", y: "2", width: "16", height: "16", rx: "4", fill: "#E5484D" } },
		{
			tag: "path",
			isCut: CUT,
			attrs: {
				d: "M5.4 7.2l1.3 1.3 2.2-2.4M5.4 12.6l1.3 1.3 2.2-2.4M11 7.4h3.6M11 12.8h3.6",
				stroke: CUT_INK,
				"stroke-width": "1.5",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				fill: "none",
			},
		},
	],
	browser: [
		{ tag: "circle", attrs: { cx: "10", cy: "10", r: "8", fill: "#3D8EF0" } },
		{
			tag: "path",
			isCut: CUT,
			attrs: {
				d: "M2.6 10h14.8M10 2.2c2.2 2.1 3.2 4.7 3.2 7.8s-1 5.7-3.2 7.8M10 2.2C7.8 4.3 6.8 6.9 6.8 10s1 5.7 3.2 7.8",
				stroke: CUT_INK,
				"stroke-width": "1.4",
				fill: "none",
			},
		},
	],
	git: [
		{
			tag: "path",
			attrs: {
				d: "M6 6v8M14 9.2v.8a4 4 0 0 1-4 4H8.2",
				stroke: "#F05A28",
				"stroke-width": "2",
				"stroke-linecap": "round",
				fill: "none",
			},
		},
		{ tag: "circle", attrs: { cx: "6", cy: "4.2", r: "2.4", fill: "#F05A28" } },
		{ tag: "circle", attrs: { cx: "6", cy: "15.8", r: "2.4", fill: "#F05A28" } },
		{ tag: "circle", attrs: { cx: "14", cy: "7", r: "2.4", fill: "#F59E0B" } },
	],
	files: [
		{
			tag: "path",
			attrs: {
				d: "M2 5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h7A1.5 1.5 0 0 1 18 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15.5z",
				fill: "#3D8EF0",
			},
		},
		{ tag: "path", attrs: { d: "M2 8.2h16v7.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15.5z", fill: "#7DBBFF" } },
	],
	routines: [
		{ tag: "circle", attrs: { cx: "10", cy: "10", r: "8", fill: "#12A594" } },
		{ tag: "path", isCut: CUT, attrs: { d: "M11 4.8 6.6 11h3.2l-.8 4.2L13.4 9h-3.2z", fill: CUT_INK } },
	],
	settings: [
		{ tag: "circle", attrs: { cx: "10", cy: "10", r: "8", fill: "#8E8E93" } },
		{
			tag: "circle",
			isCut: CUT,
			attrs: {
				cx: "10",
				cy: "10",
				r: "4.2",
				fill: "none",
				stroke: CUT_INK,
				"stroke-width": "1.8",
				"stroke-dasharray": "2.2 1.1",
			},
		},
		{ tag: "circle", isCut: CUT, attrs: { cx: "10", cy: "10", r: "1.6", fill: CUT_INK } },
	],
	note: [
		{ tag: "path", attrs: { d: PAGE, fill: "#F2B544" } },
		{ tag: "path", attrs: { d: FOLD, fill: "#C98A1B" } },
		{
			tag: "path",
			isCut: CUT,
			attrs: { d: "M7 10h6M7 13h4", stroke: CUT_INK, "stroke-width": "1.6", "stroke-linecap": "round", fill: "none" },
		},
	],
	table: [
		{ tag: "path", attrs: { d: PAGE, fill: "#2FA35B" } },
		{ tag: "path", attrs: { d: FOLD, fill: "#1E7A41" } },
		{
			tag: "path",
			isCut: CUT,
			attrs: { d: "M7 9h6v6H7zM7 12h6M10 9v6", stroke: CUT_INK, "stroke-width": "1.3", fill: "none" },
		},
	],
	"code-ts": codeOf("#3178C6", "TS", CUT),
	"code-js": codeOf("#F7DF1E", "JS", "#1D1D1F"),
	"code-py": codeOf("#3776AB", "PY", "#FFD43B"),
	"code-css": codeOf("#663399", "CSS", CUT),
	image: [
		{ tag: "rect", attrs: { x: "2", y: "3", width: "16", height: "14", rx: "3", fill: "#FCD9E6" } },
		{ tag: "circle", attrs: { cx: "13.5", cy: "7.5", r: "1.8", fill: "#F7B500" } },
		{ tag: "path", attrs: { d: "M2 14.5l4.5-5 4 4.2 2-2L18 15v-1 2a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3z", fill: "#E0457B" } },
	],
	// TRADE-OFF: a chat's art is the mascot drawn by ChatTabIcon; an empty entry keeps TabArt total over TabArt names
	chat: [],
	"built-app": [
		{
			tag: "path",
			attrs: {
				d: "m4.5 6.8 5 5M3.7 11.8l5-5 1.7-2.5M2 4.3h10M6 2h.8M18 18l-4.2-8.4L9.6 18M11.3 14.8h5",
				stroke: "#DC2626",
				"stroke-width": "1.8",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				fill: "none",
			},
		},
	],
};

export const SITE_TILE_FILLS: readonly string[] = [
	"#C5221F",
	"#1A73E8",
	"#A259FF",
	"#1D4ED8",
	"#0E7490",
	"#24292F",
	"#6750A4",
	"#0F2B46",
];
