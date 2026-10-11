import {
	ALIGN_WORDS,
	JUSTIFY_WORDS,
	RADIUS_WORDS,
	TEXT_SIZE_WORDS,
	TRACKING_WORDS,
	WEIGHT_WORDS,
	emptyStyle,
	lengthOf,
	sizeOf,
} from "./class-style.js";
import type { AlignWord, ClassStyle, JustifyWord, PaintStyle, Sides } from "./class-style.js";
import { isColourWord } from "./gpu-tokens.js";

type WordReader = (style: ClassStyle, word: string) => boolean;

const PARSED = new Map<string, ClassStyle>();
const UNKNOWN_WORDS = new Set<string>();
const TRANSITION_MS = 160;

const FLAG_WORDS: Readonly<Record<string, (style: ClassStyle) => void>> = {
	flex: (style) => (style.display = "row"),
	"flex-row": (style) => (style.display = "row"),
	"flex-col": (style) => (style.display = "column"),
	"flex-row-reverse": (style) => Object.assign(style, { display: "row", reverse: true }),
	"flex-col-reverse": (style) => Object.assign(style, { display: "column", reverse: true }),
	hidden: (style) => (style.display = "none"),
	"flex-wrap": (style) => (style.wrap = true),
	"flex-1": (style) => Object.assign(style, { grow: 1, shrink: 1, basis: 0 }),
	grow: (style) => (style.grow = 1),
	"shrink-0": (style) => (style.shrink = 0),
	"overflow-hidden": (style) => (style.clip = true),
	truncate: (style) => Object.assign(style, { truncate: true, clip: true }),
	"tabular-nums": (style) => (style.tabular = true),
	"font-sans": (style) => (style.family = "sans"),
	"font-serif": (style) => (style.family = "serif"),
	"font-mono": (style) => (style.family = "mono"),
	transition: (style) => (style.transitionMs ||= TRANSITION_MS),
	"transition-colors": (style) => (style.transitionMs ||= TRANSITION_MS),
};

const READERS: readonly WordReader[] = [
	readState,
	readColour,
	readFlag,
	readTypeWord,
	readBoxWord,
	readBorder,
	readGap,
	readSpacing,
	readDimension,
	readSquare,
];

export function styleOfClassName(className: string | undefined): ClassStyle {
	const key = className ?? "";
	const cached = PARSED.get(key);
	if (cached) return cached;
	const style = emptyStyle();
	for (const word of key.split(/\s+/).filter(Boolean)) {
		if (READERS.some((read) => read(style, word))) continue;
		if (!UNKNOWN_WORDS.has(word)) console.warn(`gpu canvas: class "${word}" is not in the supported subset`);
		UNKNOWN_WORDS.add(word);
	}
	PARSED.set(key, style);
	return style;
}

export function unknownClassWords(): string[] {
	return [...UNKNOWN_WORDS];
}

function readState(style: ClassStyle, word: string): boolean {
	if (word.startsWith("hover:")) return readColourInto(style.hover, word.slice("hover:".length));
	if (word.startsWith("active:")) return readColourInto(style.active, word.slice("active:".length));
	return false;
}

function readColour(style: ClassStyle, word: string): boolean {
	return readColourInto(style.paint, word);
}

function readColourInto(target: PaintStyle, word: string): boolean {
	const match = /^(bg|text|border)-(.+)$/.exec(word);
	const [, part, colour] = match ?? [];
	if (!colour || !isColourWord(colour)) return false;
	target[part === "bg" ? "bg" : part === "text" ? "text" : "border"] = colour;
	return true;
}

function readFlag(style: ClassStyle, word: string): boolean {
	const apply = FLAG_WORDS[word];
	if (!apply) return false;
	apply(style);
	return true;
}

function readTypeWord(style: ClassStyle, word: string): boolean {
	const [head = "", ...restParts] = word.split("-");
	const rest = restParts.join("-");
	const weight = WEIGHT_WORDS[rest];
	const tracking = TRACKING_WORDS[rest];
	const size = TEXT_SIZE_WORDS[rest] ?? lengthOf(rest);
	if (head === "font" && weight !== undefined) return ((style.weight = weight), true);
	if (head === "tracking" && tracking !== undefined) return ((style.tracking = tracking), true);
	if (head === "text" && (rest === "left" || rest === "center" || rest === "right"))
		return ((style.align = rest), true);
	if (head === "text" && size !== undefined) return ((style.fontSize = size), true);
	const leading = lengthOf(rest);
	if (head === "leading" && leading !== undefined) return ((style.lineHeight = leading), true);
	return false;
}

function readBoxWord(style: ClassStyle, word: string): boolean {
	const [head = "", ...restParts] = word.split("-");
	const rest = restParts.join("-");
	const radius = RADIUS_WORDS[rest];
	if (head === "rounded" && radius !== undefined) return ((style.radius = radius), true);
	if (head === "duration" && /^\d+$/.test(rest)) return ((style.transitionMs = Number(rest)), true);
	if (head === "items" && isAlignWord(rest)) return ((style.items = rest), true);
	if (head === "self" && isAlignWord(rest)) return ((style.self = rest), true);
	if (head === "justify" && isJustifyWord(rest)) return ((style.justify = rest), true);
	return false;
}

function readBorder(style: ClassStyle, word: string): boolean {
	const sideWidth = /^border(?:-(t|r|b|l|x|y))?(?:-(\d+))?$/.exec(word);
	if (!sideWidth) return false;
	applySides(style.borderWidth, sideWidth[1] ?? "", sideWidth[2] ? Number(sideWidth[2]) : 1);
	style.paint.border ??= "border";
	return true;
}

function readGap(style: ClassStyle, word: string): boolean {
	const gap = /^gap(?:-(x|y))?-(.+)$/.exec(word);
	const px = lengthOf(gap?.[2] ?? "");
	if (!gap || px === undefined) return false;
	if (gap[1] !== "y") style.gapColumn = px;
	if (gap[1] !== "x") style.gapRow = px;
	return true;
}

function readSpacing(style: ClassStyle, word: string): boolean {
	const spacing = /^(p|m)(x|y|t|r|b|l)?-(.+)$/.exec(word);
	if (!spacing) return false;
	const value = spacing[1] === "m" && spacing[3] === "auto" ? "auto" : lengthOf(spacing[3] ?? "");
	if (value === undefined) return false;
	if (spacing[1] === "p" && value !== "auto") applySides(style.padding, spacing[2] ?? "", value);
	if (spacing[1] === "m") applySides(style.margin, spacing[2] ?? "", value);
	return true;
}

function readDimension(style: ClassStyle, word: string): boolean {
	const dimension = /^(w|h|min-w|min-h|max-w|basis)-(.+)$/.exec(word);
	const size = sizeOf(dimension?.[2] ?? "");
	if (!dimension || size === undefined) return false;
	if (dimension[1] === "w") style.width = size;
	if (dimension[1] === "h") style.height = size;
	if (typeof size !== "number") return true;
	if (dimension[1] === "min-w") style.minWidth = size;
	if (dimension[1] === "min-h") style.minHeight = size;
	if (dimension[1] === "max-w") style.maxWidth = size;
	if (dimension[1] === "basis") style.basis = size;
	return true;
}

function readSquare(style: ClassStyle, word: string): boolean {
	const square = /^size-(.+)$/.exec(word);
	const px = sizeOf(square?.[1] ?? "");
	if (px === undefined) return false;
	style.width = px;
	style.height = px;
	return true;
}

function applySides(sides: Sides | ClassStyle["margin"], axis: string, value: number | "auto"): void {
	const written: Partial<Record<keyof Sides, number | "auto">> = sides;
	if (axis === "" || axis === "x" || axis === "l") written.left = value;
	if (axis === "" || axis === "x" || axis === "r") written.right = value;
	if (axis === "" || axis === "y" || axis === "t") written.top = value;
	if (axis === "" || axis === "y" || axis === "b") written.bottom = value;
}

function isAlignWord(word: string): word is AlignWord {
	return ALIGN_WORDS.has(word);
}

function isJustifyWord(word: string): word is JustifyWord {
	return JUSTIFY_WORDS.has(word);
}
