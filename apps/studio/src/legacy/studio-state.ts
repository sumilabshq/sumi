import { ShowViewCommand, ShownViewQuery } from "@widgetarium/app-host";
import { STUDIO_OPENED_ON } from "@widgetarium/core/engine/studio-state-port.js";
import type { StudioMoment, StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { createListeners } from "./listeners.js";

// TRADE-OFF: the core StudioState port still carries the shown view, so it reads and writes app-host's ShownViewQuery; views should read the query themselves
export function createStudioState(studioApp: StartedApp): StudioState {
	const listeners = createListeners();
	let moment = STUDIO_OPENED_ON;
	const momentNow = (): StudioMoment => {
		const view = shownViewOf(studioApp);

		if (view !== moment.view) {
			moment = { ...moment, view };
		}

		return moment;
	};
	const become = (next: StudioMoment, reason: string): void => {
		console.info(`[widgetarium] studio ${JSON.stringify(moment)} → ${JSON.stringify(next)} (${reason})`);
		moment = next;
		listeners.notify();
	};
	return {
		now: momentNow,
		subscribe: (changed) => {
			const stopPanel = listeners.subscribe(changed);
			const stopView = studioApp.routes.watch(ShownViewQuery, undefined, changed);
			return () => {
				stopPanel();
				stopView();
			};
		},
		show: (view) => void showView(studioApp, view),
		openPanel: (panel) => {
			if (moment.panel === panel) {
				return;
			}

			become({ ...momentNow(), panel }, `open ${panel}`);
		},
		closePanel: (panel) => {
			if (moment.panel !== panel) {
				return;
			}

			become({ ...momentNow(), panel: "none" }, `close ${panel}`);
		},
	};
}

function shownViewOf(studioApp: StartedApp): StudioView {
	const read = studioApp.routes.readNow(ShownViewQuery);
	return read === null ? STUDIO_OPENED_ON.view : ShownViewQuery.outputSchema.parse(read.output);
}

async function showView(studioApp: StartedApp, view: StudioView): Promise<void> {
	const answer = await studioApp.send(ShowViewCommand, { view });

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not show ${view}: ${answer.reason}`);
	}
}
