import type { Task, TaskStatus } from "../schema/task.schema.js";
import { DAY_MS } from "./task-refs.js";

export type StaleStage = "fresh" | "stale" | "expired";

interface StaleRule {
	readonly staleAfterMs: number;
	readonly closeAfterMs: number;
}

const RULES: Readonly<Partial<Record<TaskStatus, StaleRule>>> = {
	paused: {
		staleAfterMs: 14 * DAY_MS,
		closeAfterMs: 28 * DAY_MS,
	},
	backlog: {
		staleAfterMs: 60 * DAY_MS,
		closeAfterMs: 90 * DAY_MS,
	},
	ready_to_test: {
		staleAfterMs: 3 * DAY_MS,
		closeAfterMs: 14 * DAY_MS,
	},
};

export function staleStageOf(task: Task, now: number): StaleStage {
	const rule = RULES[task.status];

	if (rule === undefined) {
		return "fresh";
	}

	const quietMs = now - Math.max(task.updatedAt, task.keptAt ?? 0);

	if (quietMs >= rule.closeAfterMs) {
		return "expired";
	}

	return quietMs >= rule.staleAfterMs ? "stale" : "fresh";
}

export function quietDaysOf(task: Task, now: number): number {
	return Math.floor((now - Math.max(task.updatedAt, task.keptAt ?? 0)) / DAY_MS);
}
