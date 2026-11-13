import { useEffect, useState } from "react";
import { fieldSizeWatcher, listenToCursorMoves } from "./cursor-moves.js";
import { cursorSpotOf, isSameSpot } from "./cursor-spot.js";
import type { CursorSpot } from "./cursor-spot.js";
import { isDrawingOwnText, wantedField } from "./text-field.js";
import type { TextField } from "./text-field.js";

const MARKED_ROOT = "data-terminal-cursor-on";
const DRAWN_FIELD = "data-terminal-cursor-drawn";
const FRAMES_AWAITING_HIDDEN_FOCUS = 60;

export function useFollowsFocusedCursor(): CursorSpot | null {
	const [spot, setSpot] = useState<CursorSpot | null>(null);

	useEffect(() => {
		document.documentElement.toggleAttribute(MARKED_ROOT, true);
		const stop = followFocusedCursor((next) => setSpot((shown) => (isSameSpot(shown, next) ? shown : next)));
		return () => {
			stop();
			document.documentElement.toggleAttribute(MARKED_ROOT, false);
		};
	}, []);

	return spot;
}

function followFocusedCursor(onSpot: (spot: CursorSpot | null) => void): () => void {
	let frame = 0;
	let framesAwaited = 0;
	let isComposing = false;
	let drawn: TextField | null = null;
	const markDrawn = drawnFieldMarker();
	const follow = (): void => {
		frame = 0;
		const wanted = wantedField();
		watchSizeOf(wanted);
		drawn = wanted !== null && !isComposing && isDrawingOwnText(wanted) ? wanted : null;
		const spot = drawn === null ? null : cursorSpotOf(drawn);
		markDrawn(spot === null ? null : drawn);
		onSpot(spot);

		if (drawn === null && wanted !== null && wanted === document.activeElement && framesAwaited > 0) {
			framesAwaited -= 1;
			frame = requestAnimationFrame(follow);
		}
	};
	const moved = (): void => {
		framesAwaited = FRAMES_AWAITING_HIDDEN_FOCUS;

		if (frame === 0) {
			frame = requestAnimationFrame(follow);
		}
	};
	const watchSizeOf = fieldSizeWatcher(moved);
	const stopListening = listenToCursorMoves({
		onMove: moved,
		onComposing: (isNowComposing) => {
			isComposing = isNowComposing;
			moved();
		},
		drawnField: () => drawn,
	});
	moved();
	return () => {
		cancelAnimationFrame(frame);
		stopListening();
		watchSizeOf(null);
		markDrawn(null);
	};
}

function drawnFieldMarker(): (field: TextField | null) => void {
	let marked: TextField | null = null;
	return (field) => {
		if (field === marked) {
			return;
		}

		marked?.removeAttribute(DRAWN_FIELD);
		field?.setAttribute(DRAWN_FIELD, "");
		marked = field;
	};
}
