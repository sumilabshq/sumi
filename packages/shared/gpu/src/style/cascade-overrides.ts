import { WEIGHTS, isAlignWord, isJustifyWord, isTextAlignWord, isTextTransform } from "./class-style.js";
import type { AlignWord, ClassStyle, JustifyWord, Sides, Size, TextAlignWord, Weight } from "./class-style.js";
import { rgbaOfCss } from "./gpu-tokens.js";

export type CssRead = (property: string) => string;
export type StyleOverride = (style: ClassStyle) => void;
type OverrideReader = (probed: CssRead, bare: CssRead) => StyleOverride | null;

interface FieldRead {
	readonly property: string;
	readonly overrideOf: (value: string) => StyleOverride | null;
}

const SIDES = ["top", "right", "bottom", "left"] as const;
const CLIPPING: ReadonlySet<string> = new Set(["hidden", "clip", "auto", "scroll"]);

const ALIGN_ALIASES: Readonly<Record<string, AlignWord>> = {
	"flex-start": "start",
	"self-start": "start",
	"flex-end": "end",
	"self-end": "end",
	normal: "stretch",
	"first baseline": "baseline",
};

const JUSTIFY_ALIASES: Readonly<Record<string, JustifyWord>> = {
	"flex-start": "start",
	normal: "start",
	left: "start",
	"flex-end": "end",
	right: "end",
	"space-between": "between",
	"space-around": "around",
	"space-evenly": "evenly",
};

const TEXT_ALIGN_ALIASES: Readonly<Record<string, TextAlignWord>> = {
	start: "left",
	end: "right",
};

const FIELDS: readonly FieldRead[] = [
	field("gapRow", "row-gap", (value) => pxIn(value) ?? 0),
	field("gapColumn", "column-gap", (value) => pxIn(value) ?? 0),
	field("width", "width", sizeIn),
	field("height", "height", sizeIn),
	field("minWidth", "min-width", pxIn),
	field("minHeight", "min-height", pxIn),
	field("maxWidth", "max-width", pxIn),
	field("grow", "flex-grow", (value) => numberIn(value) ?? 0),
	field("shrink", "flex-shrink", (value) => numberIn(value) ?? 0),
	field("basis", "flex-basis", (value) => (value === "0%" ? 0 : pxIn(value))),
	field("items", "align-items", alignIn),
	field("self", "align-self", alignIn),
	field("justify", "justify-content", (value) => (isJustifyWord(value) ? value : JUSTIFY_ALIASES[value])),
	field("radius", "border-top-left-radius", pxIn),
	field("fontSize", "font-size", pxIn),
	field("weight", "font-weight", nearestWeight),
	field("lineHeight", "line-height", pxIn),
	field("align", "text-align", (value) => (isTextAlignWord(value) ? value : TEXT_ALIGN_ALIASES[value])),
	field("textTransform", "text-transform", (value) => (isTextTransform(value) ? value : undefined)),
];

const OVERRIDE_READERS: readonly OverrideReader[] = [
	readFlexbox,
	readFields,
	sidesReader("padding", (style, side, value) => (style.padding[side] = pxIn(value) ?? 0)),
	sidesReader("margin", (style, side, value) => (style.margin[side] = value === "auto" ? "auto" : (pxIn(value) ?? 0))),
	sidesReader("border", (style, side, value) => (style.borderWidth[side] = pxIn(value) ?? 0), "-width"),
	readBorderColour,
	readOverflow,
	readColours,
];

export const CASCADE_COLOURS: readonly string[] = ["border-top-color", "background-color", "color"];

export const CASCADE_PROPERTIES: readonly string[] = [
	"display",
	"flex-direction",
	"flex-wrap",
	...SIDES.flatMap((side) => [`padding-${side}`, `margin-${side}`, `border-${side}-width`]),
	...FIELDS.map(({ property }) => property),
	"overflow-x",
	"overflow-y",
	...CASCADE_COLOURS,
];

export function overrideOfCascade(probed: CssRead, bare: CssRead): StyleOverride {
	const overrides = OVERRIDE_READERS.flatMap((read) => read(probed, bare) ?? []);
	return (style) => {
		for (const apply of overrides) apply(style);
	};
}

function readFlexbox(probed: CssRead, bare: CssRead): StyleOverride | null {
	const [display, direction, wrap] = [probed("display"), probed("flex-direction"), probed("flex-wrap")];
	if (differs(probed, bare, "display")) {
		const laid = displayOf(display, direction, wrap !== "nowrap");
		return (style) => Object.assign(style, laid);
	}
	const flexbox = {
		...(display.endsWith("flex") && differs(probed, bare, "flex-direction") ? directionOf(direction) : {}),
		...(differs(probed, bare, "flex-wrap") ? { wrap: wrap !== "nowrap" } : {}),
	};
	if (Object.keys(flexbox).length === 0) return null;
	return (style) => Object.assign(style, flexbox);
}

// TRADE-OFF: a grid is laid as a wrapping row; Yoga has no tracks, so columns of a grid are only as wide as their content
function displayOf(display: string, direction: string, wraps: boolean): Partial<ClassStyle> {
	if (display === "none") return { display: "none" };
	const inline = display.startsWith("inline");
	if (display.endsWith("grid")) return { display: "row", displaySet: true, inline, reverse: false, wrap: true };
	if (!display.endsWith("flex")) return { display: "column", displaySet: false, inline, reverse: false, wrap: false };
	return { ...directionOf(direction), inline, wrap: wraps };
}

function directionOf(direction: string): Partial<ClassStyle> {
	const display = direction.startsWith("row") ? "row" : "column";
	return { display, displaySet: true, reverse: direction.endsWith("reverse") };
}

function field<K extends keyof ClassStyle>(
	key: K,
	property: string,
	read: (value: string) => ClassStyle[K] | undefined,
): FieldRead {
	return {
		property,
		overrideOf: (value) => overrideWith(key, read(value)),
	};
}

function overrideWith<K extends keyof ClassStyle>(key: K, parsed: ClassStyle[K] | undefined): StyleOverride | null {
	if (parsed === undefined) {
		return null;
	}

	return (style) => {
		style[key] = parsed;
	};
}

function readFields(probed: CssRead, bare: CssRead): StyleOverride | null {
	const written = FIELDS.flatMap(({ property, overrideOf }) =>
		differs(probed, bare, property) ? (overrideOf(probed(property)) ?? []) : [],
	);
	if (written.length === 0) {
		return null;
	}

	return (style) => {
		for (const write of written) {
			write(style);
		}
	};
}

function sidesReader(
	prefix: string,
	write: (style: ClassStyle, side: keyof Sides, value: string) => void,
	suffix = "",
): OverrideReader {
	return (probed, bare) => {
		const written = SIDES.flatMap((side) => {
			const property = `${prefix}-${side}${suffix}`;
			return differs(probed, bare, property) ? [[side, probed(property)] as const] : [];
		});
		if (written.length === 0) return null;
		return (style) => {
			for (const [side, value] of written) write(style, side, value);
		};
	};
}

function readBorderColour(probed: CssRead, bare: CssRead): StyleOverride | null {
	const widths = SIDES.map((side) => `border-${side}-width`);
	const hasBorder = widths.some((property) => (pxIn(probed(property)) ?? 0) > 0);
	if (!hasBorder || !differs(probed, bare, "border-top-color", ...widths)) return null;
	const colour = probed("border-top-color");
	return (style) => (style.paint.border = colour);
}

function readOverflow(probed: CssRead, bare: CssRead): StyleOverride | null {
	if (!differs(probed, bare, "overflow-x", "overflow-y")) return null;
	const clip = CLIPPING.has(probed("overflow-x")) || CLIPPING.has(probed("overflow-y"));
	return (style) => (style.clip = clip);
}

function readColours(probed: CssRead, bare: CssRead): StyleOverride | null {
	const background = probed("background-color");
	const paintsBackground = differs(probed, bare, "background-color") && (rgbaOfCss(background)?.[3] ?? 0) > 0;
	const paint = {
		...(paintsBackground ? { bg: background } : {}),
		...(differs(probed, bare, "color") ? { text: probed("color") } : {}),
	};
	if (Object.keys(paint).length === 0) return null;
	return (style) => Object.assign(style.paint, paint);
}

function differs(probed: CssRead, bare: CssRead, ...properties: string[]): boolean {
	return properties.some((property) => probed(property) !== bare(property));
}

function pxIn(value: string): number | undefined {
	const px = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
	return px ? Number(px[1]) : undefined;
}

function sizeIn(value: string): Size {
	if (value === "100%") return "full";
	if (value === "auto") return "auto";
	return pxIn(value);
}

function numberIn(value: string): number | undefined {
	const number = Number(value);
	return Number.isFinite(number) ? number : undefined;
}

function alignIn(value: string): AlignWord | undefined {
	return isAlignWord(value) ? value : ALIGN_ALIASES[value];
}

function nearestWeight(value: string): Weight | undefined {
	const weight = numberIn(value);
	if (weight === undefined) {
		return undefined;
	}

	return WEIGHTS.reduce((best, step) => (Math.abs(step - weight) < Math.abs(best - weight) ? step : best));
}
