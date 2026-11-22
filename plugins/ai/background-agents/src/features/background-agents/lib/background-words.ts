import { workingIn } from "@widgetarium/core/engine/assistant-port.js";
import type { Chat } from "@widgetarium/assistant/contract";

export type ShownAgent = Chat["session"]["background"][number];

const WORKING_ONE = "1 agent working in the background";
const WORKING_MANY = "{count} agents working in the background";
const ENDED_ONE = "1 background agent ended";
const ENDED_MANY = "{count} background agents ended";
const NOT_DONE = "{count} stopped";

export interface BackgroundSaid {
	readonly said: string;
	readonly isWorking: boolean;
	readonly notDone: string | null;
}

export function backgroundSaidOf(agents: readonly ShownAgent[]): BackgroundSaid {
	const working = workingIn(agents).length;
	const notDone = agents.filter(({ state }) => state === "stopped" || state === "failed").length;

	if (working > 0) {
		return {
			said: working === 1 ? WORKING_ONE : WORKING_MANY.replace("{count}", String(working)),
			isWorking: true,
			notDone: null,
		};
	}

	return {
		said: agents.length === 1 ? ENDED_ONE : ENDED_MANY.replace("{count}", String(agents.length)),
		isWorking: false,
		notDone: notDone === 0 ? null : NOT_DONE.replace("{count}", String(notDone)),
	};
}

export function spanMsOf(agent: ShownAgent, now: number): number {
	return (agent.endedAt ?? now) - agent.startedAt;
}

export function earliestStartOf(agents: readonly ShownAgent[]): number {
	return Math.min(...workingIn(agents).map(({ startedAt }) => startedAt));
}
