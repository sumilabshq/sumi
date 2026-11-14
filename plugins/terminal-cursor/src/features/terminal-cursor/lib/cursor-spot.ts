import type { TextField } from "./text-field.js";

export interface CursorSpot {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
	readonly under: string;
	readonly font: string;
	readonly letterSpacing: string;
	readonly textTransform: string;
}

const CURSOR_WIDTH_EM = 8 / 14;
const CURSOR_HEIGHT_EM = 18 / 14;
const ZERO_WIDTH_SPACE = "​";
const PASSWORD_DOT = "•";
const BLANK = /^\s*$/;
const BLANK_CODE_POINT = 0x20;
const MIRRORED_LOOKS = [
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"font",
	"letterSpacing",
	"wordSpacing",
	"textTransform",
	"textAlign",
	"direction",
	"unicodeBidi",
	"tabSize",
	"wordBreak",
] as const;

export function isSameSpot(shown: CursorSpot | null, next: CursorSpot | null): boolean {
	return JSON.stringify(shown) === JSON.stringify(next);
}

export function cursorSpotOf(field: TextField): CursorSpot | null {
	const at = field.selectionDirection === "backward" ? field.selectionStart : field.selectionEnd;

	if (at === null) {
		return null;
	}

	const look = getComputedStyle(field);
	const shown = shownTextOf(field);
	const under = String.fromCodePoint(shown.codePointAt(at) ?? BLANK_CODE_POINT);
	const isUnderDrawn = !BLANK.test(under);
	const mirror = mirrorOf(field, look);
	const mark = document.createElement("span");
	mark.textContent = isUnderDrawn ? under : ZERO_WIDTH_SPACE;
	mirror.append(shown.slice(0, at), mark, shown.slice(isUnderDrawn ? at + under.length : at));
	document.body.appendChild(mirror);
	const fontPx = parseFloat(look.fontSize);
	const markBox = mark.getBoundingClientRect();
	const mirrorBox = mirror.getBoundingClientRect();
	const fieldBox = field.getBoundingClientRect();
	const height = Math.round(fontPx * CURSOR_HEIGHT_EM);
	const centerY =
		field instanceof HTMLInputElement
			? fieldBox.top +
				field.clientTop +
				field.clientHeight / 2 +
				(parseFloat(look.paddingTop) - parseFloat(look.paddingBottom)) / 2
			: fieldBox.top + field.clientTop + markBox.top - mirrorBox.top + markBox.height / 2 - field.scrollTop;
	const spot = {
		left: Math.round(fieldBox.left + field.clientLeft + markBox.left - mirrorBox.left - field.scrollLeft),
		top: Math.round(centerY - height / 2),
		width: isUnderDrawn ? Math.max(Math.round(markBox.width), 1) : Math.round(fontPx * CURSOR_WIDTH_EM),
		height,
		under: isUnderDrawn ? under : "",
		font: look.font,
		letterSpacing: look.letterSpacing,
		textTransform: look.textTransform,
	};
	mirror.remove();
	return isSeenInField(field, spot.left + spot.width / 2, centerY) ? spot : null;
}

function shownTextOf(field: TextField): string {
	if (field.value === "") {
		return field.placeholder;
	}

	return field instanceof HTMLInputElement && field.type === "password"
		? PASSWORD_DOT.repeat(field.value.length)
		: field.value;
}

function isSeenInField(field: TextField, centerX: number, centerY: number): boolean {
	const fieldBox = field.getBoundingClientRect();
	const isInBox =
		centerX >= fieldBox.left && centerX <= fieldBox.right && centerY >= fieldBox.top && centerY <= fieldBox.bottom;
	return isInBox && document.elementFromPoint(centerX, centerY) === field;
}

function mirrorOf(field: TextField, look: CSSStyleDeclaration): HTMLDivElement {
	const mirror = document.createElement("div");
	const isArea = field instanceof HTMLTextAreaElement;

	for (const name of MIRRORED_LOOKS) {
		mirror.style[name] = look[name];
	}

	mirror.style.boxSizing = "border-box";
	mirror.style.position = "fixed";
	mirror.style.top = "0";
	mirror.style.left = "0";
	mirror.style.visibility = "hidden";
	mirror.style.pointerEvents = "none";
	mirror.style.border = "0";
	mirror.style.width = `${field.clientWidth}px`;
	mirror.style.lineHeight = look.lineHeight;
	mirror.style.whiteSpace = isArea ? "pre-wrap" : "pre";
	mirror.style.overflowWrap = isArea ? "break-word" : "normal";
	mirror.style.textIndent = look.textIndent;
	return mirror;
}
