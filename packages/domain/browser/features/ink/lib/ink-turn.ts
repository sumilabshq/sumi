import type { InkActivity } from "../../../shared/schema/ink-activity.schema.js";

// TRADE-OFF: a turn is a time window; the assistant does not report turn ends yet
const TURN_LASTS_MS = 15 * 60 * 1000;
const STOP_LASTS_MS = 10 * 60 * 1000;

export const MARKER_LINGERS_MS = 3000;

export function hasReadContentThisTurn(activity: InkActivity, now: number): boolean {
	return activity.contentReadAt !== null && now - activity.contentReadAt < TURN_LASTS_MS;
}

export function isStopped(activity: InkActivity, now: number): boolean {
	return activity.stoppedAt !== null && now - activity.stoppedAt < STOP_LASTS_MS;
}
