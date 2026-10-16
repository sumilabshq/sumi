import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import { movedNow } from "@widgetarium/gpu";
import type { LookWatcher, StageLook } from "@widgetarium/gpu";

const SHARP_AFTER_MS = 150;

export function usePainter(
	layerRef: RefObject<HTMLElement | null>,
	watchers: ReadonlySet<LookWatcher>,
	onSettled: (look: StageLook) => void,
): (look: StageLook) => void {
	const frame = useRef(0);
	const settle = useRef(0);
	const waiting = useRef<StageLook | null>(null);
	const settled = useRef(onSettled);
	settled.current = onSettled;
	return useCallback(
		(look: StageLook): void => {
			waiting.current = look;
			movedNow();
			if (frame.current) return;
			frame.current = window.requestAnimationFrame(() => {
				frame.current = 0;
				const layer = layerRef.current;
				const next = waiting.current;
				if (!layer || !next) return;
				layer.style.willChange = "transform";
				layer.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
				for (const watcher of watchers) watcher(next);
				window.clearTimeout(settle.current);
				settle.current = window.setTimeout(() => {
					layer.style.willChange = "";
					settled.current(next);
				}, SHARP_AFTER_MS);
			});
		},
		[layerRef, watchers],
	);
}
