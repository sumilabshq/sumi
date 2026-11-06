import type { PlacedTabsMove } from "../../../shared/lib/settling/settling.js";
import type { PlacedTabs, PendingPress } from "../../../shared/schema/tabs.schema.js";
import type { PressAppAction, TakeActionPress } from "../../../shared/schema/tab-facts.schema.js";

const MOST_PRESSES_KEPT = 20;
const NO_TAB = "no open tab {tab} to press {action} in";
const NO_ACTION = "tab {tab} shows no action {action}";
const ACTION_OFF = "the action {action} of tab {tab} is off";
const NO_WAITING_PRESS = "no press {press} waits in tab {tab}";

export function withPressQueued(placed: PlacedTabs, ask: PressAppAction): PlacedTabsMove<PendingPress | string> {
	const refusal = refusePress(placed, ask);
	return refusal === null ? queuedMoveOf(placed, ask) : refusedMoveOf(refusal);
}

export function withPressTaken(
	placed: PlacedTabs,
	{ id, press }: TakeActionPress,
): PlacedTabsMove<PendingPress | string> {
	const waiting = placed.pendingPresses ?? [];
	const pressed = waiting.find((held) => held.id === press && held.tab === id);

	if (pressed === undefined) {
		return refusedMoveOf(NO_WAITING_PRESS.replace("{press}", press).replace("{tab}", id));
	}

	return {
		next: {
			...placed,
			pendingPresses: waiting.filter((held) => held.id !== press),
		},
		reason: `pending presses -${press} ${pressed.action} in tab ${id} (taken by the app)`,
		answer: pressed,
	};
}

export function pressesOf(placed: PlacedTabs, tab: string): PendingPress[] {
	return (placed.pendingPresses ?? []).filter((held) => held.tab === tab);
}

export function pressSaidOf({ tab, action }: PressAppAction, pressed: PendingPress | string): string {
	return typeof pressed === "string"
		? `press of ${action} in tab ${tab} refused: ${pressed}`
		: `tab ${tab} action ${action} pressed as ${pressed.id}`;
}

function queuedMoveOf(placed: PlacedTabs, { tab, action }: PressAppAction): PlacedTabsMove<PendingPress> {
	const minted = (placed.mintedPresses ?? 0) + 1;
	const pressed: PendingPress = {
		id: `press-${minted}`,
		tab,
		action,
	};
	return {
		next: {
			...placed,
			pendingPresses: [...otherPressesOf(placed, pressed), pressed].slice(-MOST_PRESSES_KEPT),
			mintedPresses: minted,
		},
		reason: `pending presses +${pressed.id} ${action} in tab ${tab}`,
		answer: pressed,
	};
}

function otherPressesOf(placed: PlacedTabs, { tab, action }: PendingPress): PendingPress[] {
	return (placed.pendingPresses ?? []).filter((held) => held.tab !== tab || held.action !== action);
}

function refusedMoveOf(refusal: string): PlacedTabsMove<string> {
	return {
		next: null,
		reason: refusal,
		answer: refusal,
	};
}

function refusePress(placed: PlacedTabs, { tab, action }: PressAppAction): string | null {
	const held = placed.tabs.find(({ id }) => id === tab);
	const shownAction = (held?.lastActions ?? []).find(({ id }) => id === action);

	if (held === undefined) {
		return NO_TAB.replace("{tab}", tab).replace("{action}", action);
	}

	if (shownAction === undefined) {
		return NO_ACTION.replace("{tab}", tab).replace("{action}", action);
	}

	return shownAction.isOff === true ? ACTION_OFF.replace("{tab}", tab).replace("{action}", action) : null;
}
