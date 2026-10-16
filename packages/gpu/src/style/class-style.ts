export type Size = number | "full" | "auto" | undefined;
export type TokenLength = number | { readonly token: string };
const ALIGN_WORD_LIST = ["start", "center", "end", "stretch", "baseline"] as const;
const JUSTIFY_WORD_LIST = ["start", "center", "end", "between", "around", "evenly"] as const;
const TEXT_ALIGN_LIST = ["left", "center", "right"] as const;
const TEXT_TRANSFORM_LIST = ["none", "uppercase", "lowercase", "capitalize"] as const;
export type AlignWord = (typeof ALIGN_WORD_LIST)[number];
export type JustifyWord = (typeof JUSTIFY_WORD_LIST)[number];
export type TextAlignWord = (typeof TEXT_ALIGN_LIST)[number];
export type TextTransform = (typeof TEXT_TRANSFORM_LIST)[number];
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
	displaySet: boolean;
	inline: boolean;
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
	align?: TextAlignWord;
	textTransform?: TextTransform;
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
export const WEIGHTS: readonly Weight[] = [...new Set(Object.values(WEIGHT_WORDS))];
const ALIGN_WORDS: ReadonlySet<string> = new Set(ALIGN_WORD_LIST);
const JUSTIFY_WORDS: ReadonlySet<string> = new Set(JUSTIFY_WORD_LIST);
const TEXT_ALIGN_WORDS: ReadonlySet<string> = new Set(TEXT_ALIGN_LIST);
const TEXT_TRANSFORMS: ReadonlySet<string> = new Set(TEXT_TRANSFORM_LIST);

export function isAlignWord(word: string): word is AlignWord {
	return ALIGN_WORDS.has(word);
}

export function isJustifyWord(word: string): word is JustifyWord {
	return JUSTIFY_WORDS.has(word);
}

export function isTextAlignWord(word: string): word is TextAlignWord {
	return TEXT_ALIGN_WORDS.has(word);
}

export function isTextTransform(word: string): word is TextTransform {
	return TEXT_TRANSFORMS.has(word);
}

export function emptyStyle(): ClassStyle {
	return {
		display: "column",
		displaySet: false,
		inline: false,
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

export function copyStyle(style: ClassStyle): ClassStyle {
	return {
		...style,
		padding: { ...style.padding },
		margin: { ...style.margin },
		borderWidth: { ...style.borderWidth },
		paint: { ...style.paint },
		hover: { ...style.hover },
		active: { ...style.active },
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
