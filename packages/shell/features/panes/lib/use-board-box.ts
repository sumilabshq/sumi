import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { FRAME_WIDTH_VARS } from "../../../shared/lib/frame-width-vars.js";
import { paneRectsOf } from "../../../shared/lib/pane-layout.js";
import type { PaneLayoutAsk, PaneRect } from "../../../shared/lib/pane-layout.js";
import type { PaneNode } from "../../../shared/schema/pane-tree.schema.js";

const FRAME = "[data-shell-frame]";
const STYLE_ONLY: MutationObserverInit = {
	attributes: true,
	attributeFilter: ["style"],
};
const EDGE_SETTLE_MS = 160;
const NOWHERE: PaneRect = {
	left: 0,
	top: 0,
	width: 0,
	height: 0,
};

export function useBoardBox(board: RefObject<HTMLElement | null>): PaneRect {
	const [box, setBox] = useState<PaneRect>(NOWHERE);
	useLayoutEffect(() => {
		const element = board.current;

		if (element === null) {
			return undefined;
		}

		const resized = new ResizeObserver(() => setBox(boxOf(element)));
		resized.observe(element);
		setBox(boxOf(element));
		return () => resized.disconnect();
	}, [board]);
	return box;
}

// TRADE-OFF: a chat-edge drag moves panes by direct style writes, so a drag renders nothing until release
export function useFollowsChatEdge(
	board: RefObject<HTMLElement | null>,
	root: PaneNode | null,
	ask: PaneLayoutAsk,
): void {
	const latest = useRef({ root, ask });
	latest.current = { root, ask };
	useLayoutEffect(() => {
		const element = board.current;
		const frame = element?.closest<HTMLElement>(FRAME) ?? null;

		if (element === null || frame === null) {
			return undefined;
		}

		let settle: ReturnType<typeof setTimeout> | undefined;
		const restyled = new MutationObserver(() => {
			element.dataset["followingEdge"] = "";
			clearTimeout(settle);
			settle = setTimeout(() => delete element.dataset["followingEdge"], EDGE_SETTLE_MS);
			const chatPx = Number.parseFloat(frame.style.getPropertyValue(FRAME_WIDTH_VARS.chat));
			const { root: drawn, ask: asked } = latest.current;
			const rects = paneRectsOf(drawn, boxOf(element), {
				...asked,
				chatPx: Number.isFinite(chatPx) ? chatPx : asked.chatPx,
			});
			placePanes(element, rects);
		});
		restyled.observe(frame, STYLE_ONLY);
		return () => {
			restyled.disconnect();
			clearTimeout(settle);
		};
	}, [board]);
}

function placePanes(element: HTMLElement, rects: ReadonlyMap<string, PaneRect>): void {
	for (const pane of element.querySelectorAll<HTMLElement>("[data-pane-id]")) {
		const rect = rects.get(pane.dataset["paneId"] ?? "");

		if (rect !== undefined) {
			pane.style.left = `${rect.left}px`;
			pane.style.width = `${rect.width}px`;
		}
	}
}

function boxOf(element: HTMLElement): PaneRect {
	return {
		left: 0,
		top: 0,
		width: element.clientWidth,
		height: element.clientHeight,
	};
}
