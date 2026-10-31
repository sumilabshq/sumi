import { useEffect, useRef, useState } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { prefersReducedMotion } from "@widgetarium/kit";
import { ChangeMenuDoorCommand } from "@widgetarium/command-menu";
import type { Door } from "@widgetarium/command-menu";

export interface DoorSwitch {
	readonly shownDoor: Door;
	readonly isLeaving: boolean;
	switchTo(door: Door): void;
}

interface DoorSwitchAsk {
	readonly door: Door;
	readonly resultsDoor: Door;
	readonly typed: (change: () => void) => void;
}

type DelayedCall = (call: () => void) => void;

interface PendingDoor {
	readonly door: Door | null;
	readonly shownDoor: Door;
	readonly mark: (door: Door) => void;
}

interface SwitchSteps {
	readonly shownDoor: Door;
	readonly commit: (door: Door) => void;
	readonly markPending: (door: Door) => void;
	readonly afterRowsLeave: DelayedCall;
}

const ROWS_LEAVE_MS = 100;

export function useDoorSwitch({ door, resultsDoor, typed }: DoorSwitchAsk): DoorSwitch {
	const changeDoor = useCommand(ChangeMenuDoorCommand);
	const pending = usePendingDoor(door, resultsDoor);
	const afterRowsLeave = useDelayedCall(ROWS_LEAVE_MS);
	return {
		shownDoor: pending.shownDoor,
		isLeaving: pending.door !== null,
		switchTo: switchToOf({
			shownDoor: pending.shownDoor,
			commit: (next) => typed(() => void changeDoor.run({ door: next })),
			markPending: pending.mark,
			afterRowsLeave,
		}),
	};
}

function switchToOf({ shownDoor, commit, markPending, afterRowsLeave }: SwitchSteps): (next: Door) => void {
	return (next) => {
		if (next === shownDoor) {
			return;
		}

		if (prefersReducedMotion()) {
			commit(next);
			return;
		}

		markPending(next);
		afterRowsLeave(() => commit(next));
	};
}

function useDelayedCall(delayMs: number): DelayedCall {
	const timer = useRef(0);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	return (call) => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(call, delayMs);
	};
}

function usePendingDoor(door: Door, resultsDoor: Door): PendingDoor {
	const [pendingDoor, setPendingDoor] = useState<Door | null>(null);
	useEffect(() => {
		if (pendingDoor === door && pendingDoor === resultsDoor) {
			setPendingDoor(null);
		}
	}, [pendingDoor, door, resultsDoor]);
	return {
		door: pendingDoor,
		shownDoor: pendingDoor ?? door,
		mark: setPendingDoor,
	};
}
