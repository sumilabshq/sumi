import { EdgeWidth, localPxMemory } from "@widgetarium/behaviors";
import type { EdgeBounds, PxMemory } from "@widgetarium/behaviors";
import {
	CARD_LEAST_PX,
	CHAT_LEAST_PX,
	CHAT_USUAL_PX,
	STUDIO_OPENED_ON,
} from "@widgetarium/core/engine/studio-state-port.js";
import type { StudioMoment, StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { createListeners } from "./listeners.js";

const CHAT_WIDTH_KEY = "widgetarium-studio-chat-px";

const CHAT_BOUNDS: EdgeBounds = {
	leastPx: CHAT_LEAST_PX,
	usualPx: CHAT_USUAL_PX,
	keptBesidePx: CARD_LEAST_PX,
};

export function createStudioState(memory: PxMemory = localPxMemory(CHAT_WIDTH_KEY)): StudioState {
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
		chatWidth: new EdgeWidth("studio chat", CHAT_BOUNDS, memory),
	};
}
