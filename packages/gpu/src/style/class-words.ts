import {
	RADIUS_WORDS,
	TEXT_SIZE_WORDS,
	TRACKING_WORDS,
	WEIGHT_WORDS,
	emptyStyle,
	isAlignWord,
	isJustifyWord,
	isTextAlignWord,
	lengthOf,
	sizeOf,
} from "./class-style.js";
import type { ClassStyle, PaintStyle, Sides } from "./class-style.js";
import { isColourWord } from "./gpu-tokens.js";
import { FLAG_WORDS } from "./flag-words.js";
import { readKitWord } from "./kit-class-words.js";

type WordReader = (style: ClassStyle, word: string) => boolean;

export interface ParsedWords {
	readonly style: ClassStyle;
	readonly unknown: readonly string[];
}

const PARSED = new Map<string, ParsedWords>();
const UNKNOWN_WORDS = new Set<string>();
const WARNED_WORDS = new Set<string>();
const IMPORTANT = /^!(.+)$|^(.+)!$/;

const READERS: readonly WordReader[] = [
	readKit,
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

export function parsedClassWords(words: string): ParsedWords {
	const cached = PARSED.get(words);
	if (cached) return cached;
	const style = emptyStyle();
	const unknown = importantLast(words.split(/\s+/).filter(Boolean)).filter((word) => !applyWord(style, word));
	for (const word of unknown) UNKNOWN_WORDS.add(word);
	const parsed = { style, unknown };
	PARSED.set(words, parsed);
	return parsed;
}

export function unknownClassWords(): string[] {
	return [...UNKNOWN_WORDS];
}

export function warnUnsupported(words: readonly string[]): void {
	for (const word of words) {
		if (WARNED_WORDS.has(word)) continue;
		WARNED_WORDS.add(word);
		console.warn(`gpu canvas: class "${word}" is not in the supported subset`);
	}
}

function importantLast(words: readonly string[]): string[] {
	const plain: string[] = [];
	const important: string[] = [];
	for (const word of words) {
		const match = IMPORTANT.exec(word);
		if (match) important.push(match[1] ?? match[2] ?? "");
		else plain.push(word);
	}
	return [...plain, ...important];
}

function applyWord(style: ClassStyle, word: string): boolean {
	return READERS.some((read) => read(style, word));
}

function readKit(style: ClassStyle, word: string): boolean {
	return readKitWord(style, word, applyWord);
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
	if (head === "text" && isTextAlignWord(rest)) return ((style.align = rest), true);
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
