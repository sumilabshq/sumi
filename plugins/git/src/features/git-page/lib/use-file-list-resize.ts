import { useRef } from "react";
import { ResizeFileListCommand } from "@sumi/git";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/data-framework";

export const FILE_LIST_WIDTH_VAR = "--wg-git-list-w";

const DEFAULT_PX = 256;
const LEAST_PX = 200;
const LEAST_DIFFS_PX = 240;

export function useFileListResize(edge: HTMLElement | null, savedPx: number): EdgeResizeHandlers {
	const resize = useCommand(ResizeFileListCommand);
	const livePx = useRef(savedPx);
	const keptPx = useRef(savedPx);
	const frame = useRef(0);
	const drawn = (px: number): void => {
		livePx.current = px;

		if (frame.current !== 0) {
			return;
		}

		frame.current = requestAnimationFrame(() => {
			frame.current = 0;
			edge?.parentElement?.style.setProperty(FILE_LIST_WIDTH_VAR, `${livePx.current}px`);
		});
	};
	const kept = (): void => {
		if (livePx.current === keptPx.current) {
			return;
		}

		keptPx.current = livePx.current;
		void resize.run({ px: livePx.current });
	};

	if (keptPx.current !== savedPx && livePx.current === keptPx.current) {
		keptPx.current = savedPx;
		livePx.current = savedPx;
	}

	const handlers = useEdgeResize({
		widthOf: () => livePx.current,
		onResize: (px) => drawn(clampedPx(px, edge)),
		onReset: () => {
			drawn(DEFAULT_PX);
			kept();
		},
	});
	return {
		...handlers,
		onPointerUp: () => {
			handlers.onPointerUp();
			kept();
		},
		onLostPointerCapture: () => {
			handlers.onLostPointerCapture();
			kept();
		},
		onKeyDown: (event) => {
			handlers.onKeyDown(event);
			kept();
		},
	};
}

function clampedPx(px: number, edge: HTMLElement | null): number {
	const most = (edge?.parentElement?.clientWidth ?? Number.MAX_SAFE_INTEGER) - LEAST_DIFFS_PX;
	return Math.round(Math.max(LEAST_PX, Math.min(px, most)));
}
