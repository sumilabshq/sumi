import {
	CHAT_USUAL_PX,
	STUDIO_OPENED_ON,
	chatPxFloored,
	chatPxWithin,
} from "@widgetarium/core/engine/studio-state-port.js";
import type { ChatWidth, StudioMoment, StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { localChatWidthMemory } from "./chat-width-memory.js";
import type { ChatWidthMemory } from "./chat-width-memory.js";
import { createListeners } from "./listeners.js";

export function createStudioState(memory: ChatWidthMemory = localChatWidthMemory()): StudioState {
	const listeners = createListeners();
	let moment = STUDIO_OPENED_ON;
	const become = (next: StudioMoment, reason: string): void => {
		console.info(`[widgetarium] studio ${JSON.stringify(moment)} → ${JSON.stringify(next)} (${reason})`);
		moment = next;
		listeners.notify();
	};
	return {
		now: () => moment,
		subscribe: listeners.subscribe,
		show: (view) => {
			if (moment.view !== view) become({ ...moment, view }, `show ${view}`);
		},
		openPanel: (panel) => {
			if (moment.panel !== panel) become({ ...moment, panel }, `open ${panel}`);
		},
		closePanel: (panel) => {
			if (moment.panel === panel) become({ ...moment, panel: "none" }, `close ${panel}`);
		},
		chatWidth: createChatWidth(memory),
	};
}

function createChatWidth(memory: ChatWidthMemory): ChatWidth {
	const listeners = createListeners();
	let px = chatPxFloored(memory.read() ?? CHAT_USUAL_PX);
	const become = (next: number, reason: string): void => {
		if (next === px) {
			return;
		}

		console.debug(`[widgetarium] studio chat ${px}px → ${next}px (${reason})`);
		px = next;
		memory.write(next);
		listeners.notify();
	};
	return {
		now: () => px,
		subscribe: listeners.subscribe,
		resize: (asked, roomPx) => become(chatPxWithin(asked, roomPx), "resize"),
		reset: () => become(CHAT_USUAL_PX, "reset"),
	};
}
