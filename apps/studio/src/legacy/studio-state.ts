import { ShowViewCommand, ShownViewQuery } from "@widgetarium/app-host";
import { STUDIO_OPENED_ON } from "@widgetarium/core/engine/studio-state-port.js";
import type { StudioMoment, StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import type { Runtime } from "@widgetarium/data-framework";
import { createListeners } from "./listeners.js";

// TRADE-OFF: the core StudioState port still carries the shown view, so it reads and writes app-host's ShownViewQuery; views should read the query themselves
export function createStudioState(studioApp: Runtime): StudioState {
	const listeners = createListeners();
	let moment = STUDIO_OPENED_ON;
	const become = (next: StudioMoment, reason: string): void => {
		console.info(`[widgetarium] studio ${JSON.stringify(moment)} → ${JSON.stringify(next)} (${reason})`);
		moment = next;
		listeners.notify();
	};
	const rereadView = async (): Promise<void> => {
		const answer = await studioApp.send(ShownViewQuery);

		if (!answer.ok) {
			console.error(`[widgetarium] the studio could not read the shown view: ${answer.reason}`);
			return;
		}

		if (answer.output !== moment.view) {
			become({ ...moment, view: answer.output }, "shown view read");
		}
	};
	studioApp.routes.watch(ShownViewQuery, undefined, () => void rereadView());
	void rereadView();
	return {
		now: () => moment,
		subscribe: (changed) => listeners.subscribe(changed),
		show: (view) => void showView(studioApp, view),
		openPanel: (panel) => {
			if (moment.panel === panel) {
				return;
			}

			become({ ...moment, panel }, `open ${panel}`);
		},
		closePanel: (panel) => {
			if (moment.panel !== panel) {
				return;
			}

			become({ ...moment, panel: "none" }, `close ${panel}`);
		},
	};
}

async function showView(studioApp: Runtime, view: StudioView): Promise<void> {
	const answer = await studioApp.send(ShowViewCommand, { view });

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not show ${view}: ${answer.reason}`);
	}
}
