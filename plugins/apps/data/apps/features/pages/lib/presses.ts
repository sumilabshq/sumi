import type { AppPage, Press } from "../../../shared/schema/page.schema.js";

export interface TakenPress {
	readonly page: AppPage;
	readonly press: Press;
}

const MOST_PRESSES_KEPT = 20;
const NO_ACTION = "tab {tab} shows no action {action}";
const ACTION_OFF = "the action {action} of tab {tab} is off";
const NO_WAITING_PRESS = "no press {press} waits in tab {tab}";

export function refusePress(page: AppPage, tab: string, action: string): string | null {
	const shown = page.actions.find(({ id }) => id === action);

	if (shown === undefined) {
		return NO_ACTION.replace("{tab}", tab).replace("{action}", action);
	}

	return shown.isOff === true ? ACTION_OFF.replace("{tab}", tab).replace("{action}", action) : null;
}

export function withPressQueued(page: AppPage, press: Press): AppPage {
	return {
		...page,
		presses: [...page.presses.filter(({ action }) => action !== press.action), press].slice(-MOST_PRESSES_KEPT),
	};
}

export function pressTakenFrom(page: AppPage, tab: string, pressId: string): TakenPress | string {
	const press = page.presses.find(({ id }) => id === pressId);

	if (press === undefined) {
		return NO_WAITING_PRESS.replace("{press}", pressId).replace("{tab}", tab);
	}

	return {
		page: {
			...page,
			presses: page.presses.filter(({ id }) => id !== pressId),
		},
		press,
	};
}
