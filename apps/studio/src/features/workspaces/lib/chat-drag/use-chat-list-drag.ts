import type { RefObject } from "react";
import { useLiftedPress } from "@widgetarium/behaviors";
import type { OverlayPort, PendingPress } from "@widgetarium/behaviors";
import { ChatDrag } from "./chat-drag.js";
import type { ChatTarget } from "./chat-drag.js";

export interface ChatListDragHandlers {
	readonly onLift: () => void;
	readonly onEnd: () => void;
	readonly onPlace: (id: string, to: ChatTarget) => void;
	readonly onTakenByBoard: (id: string) => void;
	readonly onTearOff: (id: string) => void;
	readonly overlay: OverlayPort;
}

interface PressedRow extends PendingPress {
	readonly row: HTMLElement;
	readonly id: string;
}

const CHAT_ROW_SELECTOR = "[data-ws-chat]";
const NOT_A_HANDLE = "input, textarea, [contenteditable], .wg-ws-row-more";

export function useChatListDrag(holder: RefObject<HTMLElement | null>, handlers: ChatListDragHandlers): void {
	useLiftedPress<PressedRow>(holder, {
		pressOf: pressedRowOf,
		onLift: (element, press) => {
			handlers.onLift();
			createChatDrag(element, press, handlers).start();
		},
	});
}

function createChatDrag(
	holder: HTMLElement,
	{ row, id, pointerId, start }: PressedRow,
	handlers: ChatListDragHandlers,
): ChatDrag {
	return new ChatDrag({
		holder,
		row,
		id,
		title: row.querySelector(".wg-ws-row-title")?.textContent ?? "",
		isPinned: row.closest<HTMLElement>("[data-ws-list]")?.dataset["wsList"] === "pinned",
		pointerId,
		start,
		onPlace: (to) => handlers.onPlace(id, to),
		onTakenByBoard: () => handlers.onTakenByBoard(id),
		onTearOff: () => handlers.onTearOff(id),
		onEnd: handlers.onEnd,
		overlay: handlers.overlay,
	});
}

function pressedRowOf(holder: HTMLElement, event: PointerEvent): PressedRow | null {
	if (!(event.target instanceof Element) || event.target.closest(NOT_A_HANDLE) !== null) {
		return null;
	}

	const row = event.target.closest<HTMLElement>(CHAT_ROW_SELECTOR);
	const id = row?.dataset["wsChat"];

	if (row === null || id === undefined || !holder.contains(row)) {
		return null;
	}

	return {
		row,
		id,
		pointerId: event.pointerId,
		start: [event.clientX, event.clientY],
	};
}
