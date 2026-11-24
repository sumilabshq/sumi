import { useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { APP_COLUMNS, spanAfterDrag } from "../../../shared/lib/tile-span.js";
import type { SpanDrag } from "../../../shared/lib/tile-span.js";

interface Resizing {
	readonly appId: string;
	readonly startSpan: number;
	readonly span: number;
}

export interface SpanResize {
	spanOf(appId: string, kept: number): number;
	begin(appId: string, span: number, event: PointerEvent<HTMLElement>): void;
}

export function useSpanResize(
	area: RefObject<HTMLElement | null>,
	onResized: (appId: string, span: number) => void,
): SpanResize {
	const resizing = useRef<Resizing | null>(null);
	const [shown, setShown] = useState<Resizing | null>(null);
	const hold = (next: Resizing | null): void => {
		resizing.current = next;
		setShown(next);
	};
	const begin = (appId: string, span: number, event: PointerEvent<HTMLElement>): void => {
		event.preventDefault();
		event.stopPropagation();
		const drag: SpanDrag = {
			startX: event.clientX,
			startSpan: span,
			columnPx: (area.current?.getBoundingClientRect().width ?? 0) / APP_COLUMNS,
		};
		hold({ appId, startSpan: span, span });
		const move = (pointer: globalThis.PointerEvent): void => {
			const held = resizing.current;

			if (held !== null && drag.columnPx > 0) {
				hold({ ...held, span: spanAfterDrag(drag, pointer.clientX) });
			}
		};
		const end = (): void => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", end);
			const held = resizing.current;
			hold(null);

			if (held !== null && held.span !== held.startSpan) {
				onResized(held.appId, held.span);
			}
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", end);
	};
	return {
		spanOf: (appId, kept) => (shown?.appId === appId ? shown.span : kept),
		begin,
	};
}
