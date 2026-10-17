import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { CARD_LEAST_PX, CHAT_LEAST_PX } from "@widgetarium/core/engine/studio-state-port.js";
import type { ChatWidth } from "@widgetarium/core/engine/studio-state-port.js";

const CHAT = "--wg-studio-chat";
const CHAT_LEAST = "--wg-studio-chat-least";
const CARD_LEAST = "--wg-studio-card-least";

export function useWritesChatWidth(frame: RefObject<HTMLDivElement | null>, chatWidth: ChatWidth): void {
	useLayoutEffect(() => {
		const style = frame.current?.style;
		if (!style) {
			return undefined;
		}

		const written = (): void => style.setProperty(CHAT, `${chatWidth.now()}px`);
		style.setProperty(CHAT_LEAST, `${CHAT_LEAST_PX}px`);
		style.setProperty(CARD_LEAST, `${CARD_LEAST_PX}px`);
		written();
		return chatWidth.subscribe(written);
	}, [frame, chatWidth]);
}
