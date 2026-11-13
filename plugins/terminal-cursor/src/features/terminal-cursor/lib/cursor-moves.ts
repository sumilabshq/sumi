import type { TextField } from "./text-field.js";

const FIELD_CHOICE = "data-terminal-cursor";
const DOCUMENT_MOVES = [
	"focusin",
	"input",
	"selectionchange",
	"keydown",
	"keyup",
	"pointerdown",
	"pointerup",
	"click",
	"transitionend",
	"animationend",
	"visibilitychange",
] as const;
const WINDOW_MOVES = ["focus", "blur", "resize"] as const;

export interface CursorMoves {
	readonly onMove: () => void;
	readonly onComposing: (isComposing: boolean) => void;
	readonly drawnField: () => TextField | null;
}

export function listenToCursorMoves({ onMove, onComposing, drawnField }: CursorMoves): () => void {
	const composing = (event: Event): void => onComposing(event.type === "compositionstart");
	const scrolled = (event: Event): void => {
		const field = drawnField();

		if (field !== null && event.target instanceof Node && event.target.contains(field)) {
			onMove();
		}
	};
	const changed = new MutationObserver((changes) => {
		const drawn = drawnField();
		const isDrawnGone = drawn !== null && !drawn.isConnected;

		if (isDrawnGone || changes.some((change) => change.type === "attributes")) {
			onMove();
		}
	});
	const stop = new AbortController();
	const heard = {
		signal: stop.signal,
		capture: true,
		passive: true,
	};
	DOCUMENT_MOVES.forEach((move) => document.addEventListener(move, onMove, heard));
	WINDOW_MOVES.forEach((move) => window.addEventListener(move, onMove, heard));
	document.addEventListener("scroll", scrolled, heard);
	document.addEventListener("focusout", composing, heard);
	document.addEventListener("compositionstart", composing, heard);
	document.addEventListener("compositionend", composing, heard);
	changed.observe(document.documentElement, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: [FIELD_CHOICE],
	});
	return () => {
		stop.abort();
		changed.disconnect();
	};
}

export function fieldSizeWatcher(onResized: () => void): (field: TextField | null) => void {
	const sized = new ResizeObserver(onResized);
	let watched: TextField | null = null;
	return (field) => {
		if (field === watched) {
			return;
		}

		sized.disconnect();
		watched = field;

		if (field !== null) {
			sized.observe(field);
		}
	};
}
