import { STUDIO_OPENED_ON } from "@widgetarium/core/engine/studio-state-port.js";
import type { StudioMoment, StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { createListeners } from "./listeners.js";

export function createStudioState(): StudioState {
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
	};
}
