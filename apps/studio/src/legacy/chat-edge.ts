import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement, RefObject } from "react";
import { CHAT_LEAST_PX } from "@widgetarium/core/engine/studio-state-port.js";
import type { ChatWidth } from "@widgetarium/core/engine/studio-state-port.js";
import { useEdgeResize } from "@widgetarium/behaviors";

export interface ChatEdgeProps {
	readonly chatWidth: ChatWidth;
	readonly column: RefObject<HTMLElement | null>;
	readonly frame: RefObject<HTMLDivElement | null>;
}

const EDGE_SEPARATOR = {
	className: "wg-studio-chat-edge",
	role: "separator",
	tabIndex: 0,
	"aria-label": "Chat width",
	"aria-orientation": "vertical",
	"aria-valuemin": CHAT_LEAST_PX,
} as const;

export function ChatEdge({ chatWidth, column, frame }: ChatEdgeProps): ReactElement {
	const px = useSyncExternalStore(chatWidth.subscribe, chatWidth.now);
	const handlers = useEdgeResize({
		widthOf: () => column.current?.getBoundingClientRect().width ?? px,
		onResize: (asked) => chatWidth.resize(asked, roomBesideSidesOf(frame.current)),
		onReset: () => chatWidth.reset(),
	});
	return h("div", {
		...EDGE_SEPARATOR,
		"aria-valuenow": px,
		...handlers,
	});
}

const BESIDE_THE_CHAT = [":scope > .wg-studio-sidebar", ":scope > .wg-studio-rail"];

function roomBesideSidesOf(studio: HTMLElement | null): number {
	const sides = BESIDE_THE_CHAT.map((side) => studio?.querySelector(side)?.getBoundingClientRect().width ?? 0);
	return sides.reduce((room, side) => room - side, studio?.clientWidth ?? 0);
}
