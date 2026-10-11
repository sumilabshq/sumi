export type Size = number | "full" | "auto" | undefined;
export type TokenLength = number | { readonly token: string };
export type AlignWord = "start" | "center" | "end" | "stretch" | "baseline";
export type JustifyWord = "start" | "center" | "end" | "between" | "around" | "evenly";
export type Weight = 400 | 500 | 600 | 700;
export type FamilyWord = "sans" | "serif" | "mono";

export interface Sides {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface PaintStyle {
	bg?: string;
	border?: string;
	text?: string;
}

export interface ClassStyle {
	display: "none" | "column" | "row";
	reverse: boolean;
	wrap: boolean;
	gapRow: number;
	gapColumn: number;
	padding: Sides;
	margin: Partial<Record<keyof Sides, number | "auto">>;
	width: Size;
	height: Size;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	grow: number;
	shrink: number;
	basis?: number;
	items?: AlignWord;
	self?: AlignWord;
	justify?: JustifyWord;
	borderWidth: Sides;
	radius: TokenLength;
	clip: boolean;
	paint: PaintStyle;
	hover: PaintStyle;
	active: PaintStyle;
	transitionMs: number;
	fontSize?: TokenLength;
	lineHeight?: number;
	weight?: Weight;
	family?: FamilyWord;
	tracking?: number;
	tabular?: boolean;
	truncate: boolean;
	align?: "left" | "center" | "right";
}

export const RADIUS_WORDS: Readonly<Record<string, TokenLength>> = {
	none: 0,
	"": 4,
	sm: { token: "radius-sm" },
	md: { token: "radius-md" },
	lg: { token: "radius-lg" },
	xl: { token: "radius-xl" },
	"2xl": 16,
	"3xl": 24,
	full: 9999,
	plate: { token: "radius-plate" },
	item: { token: "radius-item" },
	pill: { token: "radius-pill" },
};

export const TEXT_SIZE_WORDS: Readonly<Record<string, TokenLength>> = {
	xs: { token: "text-xs" },
	sm: { token: "text-sm" },
	base: { token: "text-base" },
	lg: { token: "text-lg" },
	h6: { token: "text-h6" },
	h5: { token: "text-h5" },
	h4: { token: "text-h4" },
	h3: { token: "text-h3" },
	h2: { token: "text-h2" },
	h1: { token: "text-h1" },
};

export const WEIGHT_WORDS: Readonly<Record<string, Weight>> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
export const TRACKING_WORDS: Readonly<Record<string, number>> = {
	tighter: -0.05,
	tight: -0.025,
	normal: 0,
	wide: 0.025,
};
export const ALIGN_WORDS: ReadonlySet<string> = new Set(["start", "center", "end", "stretch", "baseline"]);
export const JUSTIFY_WORDS: ReadonlySet<string> = new Set(["start", "center", "end", "between", "around", "evenly"]);

export function emptyStyle(): ClassStyle {
	return {
		display: "column",
		reverse: false,
		wrap: false,
		gapRow: 0,
		gapColumn: 0,
		padding: { top: 0, right: 0, bottom: 0, left: 0 },
		margin: {},
		width: undefined,
		height: undefined,
		grow: 0,
		shrink: 1,
		borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
		radius: 0,
		clip: false,
		paint: {},
		hover: {},
		active: {},
		transitionMs: 0,
		truncate: false,
	};
}

export function pxOf(length: TokenLength, lengths: Readonly<Record<string, number>>): number {
	if (typeof length === "number") return length;
	return lengths[length.token] ?? 0;
}

export function lengthOf(word: string): number | undefined {
	const arbitrary = /^\[(-?\d+(?:\.\d+)?)px\]$/.exec(word);
	if (arbitrary) return Number(arbitrary[1]);
	if (word === "px") return 1;
	if (/^\d+(\.\d+)?$/.test(word)) return Number(word) * 4;
	return undefined;
}

export function sizeOf(word: string): Size {
	if (word === "full" || word === "auto") return word;
	return lengthOf(word);
}
