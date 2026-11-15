export interface CaretAnchor {
	readonly left: number;
	readonly middle: number;
}

const ZERO_WIDTH_SPACE = "​";
const MIRRORED_STYLE_PROPERTIES = [
	"boxSizing",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"font",
	"letterSpacing",
	"wordSpacing",
	"textTransform",
	"tabSize",
	"wordBreak",
	"lineHeight",
] as const;
const HIDDEN_MIRROR_STYLE = {
	position: "fixed",
	top: "0",
	left: "0",
	visibility: "hidden",
	whiteSpace: "pre-wrap",
	overflowWrap: "break-word",
};

// TODO: one caret measurer in shared/core; terminal-cursor and composer-expand repeat it.
export function caretAnchorOf(field: HTMLTextAreaElement): CaretAnchor {
	const mirror = mirrorOf(field);
	const caretMarker = mirror.appendChild(document.createElement("span"));
	caretMarker.textContent = ZERO_WIDTH_SPACE;
	document.body.appendChild(mirror);
	const markerBox = caretMarker.getBoundingClientRect();
	const mirrorBox = mirror.getBoundingClientRect();
	const fieldBox = field.getBoundingClientRect();
	mirror.remove();
	return {
		left: fieldBox.left + field.clientLeft + markerBox.left - mirrorBox.left - field.scrollLeft,
		middle: fieldBox.top + field.clientTop + markerBox.top - mirrorBox.top + markerBox.height / 2 - field.scrollTop,
	};
}

function mirrorOf(field: HTMLTextAreaElement): HTMLDivElement {
	const mirror = document.createElement("div");
	const fieldStyle = getComputedStyle(field);

	for (const property of MIRRORED_STYLE_PROPERTIES) {
		mirror.style[property] = fieldStyle[property];
	}

	Object.assign(mirror.style, HIDDEN_MIRROR_STYLE);
	mirror.style.width = `${field.clientWidth}px`;
	mirror.textContent = field.value.slice(0, field.selectionEnd);
	return mirror;
}
