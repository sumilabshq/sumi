import { useRef } from "react";
import { git } from "@sumi/git/contract";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/data-framework";
import { SIDE_PANEL_MIN_WIDTH } from "@widgetarium/kit";

export const FILE_LIST_WIDTH_VAR = "--git-list-w";

const DEFAULT_PX = 256;
const LEAST_DIFFS_PX = 240;

export function useFileListResize(panel: HTMLElement | null, savedPx: number): EdgeResizeHandlers {
	const resize = useCommand(git.gitLook.resizeFileList);
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
			panel?.parentElement?.style.setProperty(FILE_LIST_WIDTH_VAR, `${livePx.current}px`);
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
		edge: "start",
		onResize: (px) => drawn(clampedPx(px, panel)),
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

function clampedPx(px: number, panel: HTMLElement | null): number {
	const most = (panel?.parentElement?.clientWidth ?? Number.MAX_SAFE_INTEGER) - LEAST_DIFFS_PX;
	return Math.round(Math.max(SIDE_PANEL_MIN_WIDTH, Math.min(px, most)));
}
