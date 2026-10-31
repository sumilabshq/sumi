import type { Board, Step, Task, Transition } from "../schema/task.schema.js";
import type { Count, PersonAction, TaskCard, TaskView, TurnTrailer } from "../schema/task-view.schema.js";
import { isTerminalStep, openBlockersOf } from "./gates.js";
import { quietDaysOf, staleStageOf } from "./staleness.js";
import { idOf, isClosed, oneLine } from "./task-refs.js";
import { STATUS_WORDS } from "./task-words.js";

const HOST_BLOCKS: ReadonlySet<string> = new Set([
	"session_silent",
	"session_failed",
	"usage_limit",
	"stalled",
	"interrupted",
]);

export function cardOf(board: Board, task: Task, now: number): TaskCard {
	const actions = actionsOf(task, now);
	return {
		id: idOf(task.number),
		number: task.number,
		title: task.title,
		kind: task.kind,
		status: task.status,
		statusLabel: STATUS_WORDS[task.status],
		isClosed: isClosed(task.status),
		note: noteOf(task),
		blocker: task.status === "blocked" ? task.blocker : null,
		continueAt: continueAtOf(task, now),
		waitsFor: openBlockersOf(board, task).map((blocker) => idOf(blocker.number)),
		owner: task.owner,
		criteria: criteriaCountOf(task),
		steps: stepsCountOf(task),
		tests: testsCountOf(task),
		branch: task.workplaces.find((place) => place.branch !== null)?.branch ?? null,
		nextStep: nextStepSaidOf(task),
		isStale: staleStageOf(task, now) !== "fresh",
		quietDays: staleStageOf(task, now) === "fresh" ? null : quietDaysOf(task, now),
		isYourTurn: actions.some((action) => action !== "keep"),
		actions,
		updatedAt: task.updatedAt,
		closedAt: closedAtOf(task),
	};
}

export function viewOf(board: Board, task: Task, now: number): TaskView {
	return {
		card: cardOf(board, task, now),
		description: task.description,
		parent: task.parent === null ? null : idOf(task.parent),
		acceptance: task.acceptance,
		plan: task.plan,
		testPlan: task.testPlan,
		documents: task.documents,
		workplaces: task.workplaces,
		chats: task.chats,
		createdBy: task.createdBy,
		createdAt: task.createdAt,
		log: task.log.map((entry) => ({
			...entry,
			fromLabel: entry.from === null ? null : STATUS_WORDS[entry.from],
			toLabel: STATUS_WORDS[entry.to],
		})),
	};
}

export function continueAtOf(task: Task, now: number): number | null {
	const resumesAt = task.status === "blocked" ? (task.blocker?.resumesAt ?? null) : null;
	return resumesAt !== null && resumesAt > now ? resumesAt : null;
}

export function noteOf(task: Task): string | null {
	if (task.status === "blocked" && task.blocker !== null) {
		return task.blocker.detail;
	}

	return lastArrivalOf(task)?.reason || null;
}

export function closedAtOf(task: Task): number | null {
	if (!isClosed(task.status)) {
		return null;
	}

	return lastArrivalOf(task)?.at ?? task.updatedAt;
}

export function nextStepOf(task: Task): Step | null {
	return (
		task.plan.find((step) => step.state === "active") ?? task.plan.find((step) => step.state === "pending") ?? null
	);
}

export function stepForAgentOf(step: Step): string {
	return `${step.id}: ${oneLine(step.text)}`;
}

export function openTaskOf(board: Board, chat: string): Task | null {
	const owned = board.tasks.filter((task) => task.owner === chat && !isClosed(task.status));
	const byRecent = [...owned].sort((a, b) => b.updatedAt - a.updatedAt);
	return (
		byRecent.find((task) => task.status === "in_progress") ??
		byRecent.find((task) => task.status === "blocked" || task.status === "paused") ??
		byRecent.find((task) => task.status === "ready_to_test") ??
		null
	);
}

export function openOwnedOf(board: Board, chat: string): readonly Task[] {
	return board.tasks.filter(
		(task) => task.owner === chat && !isClosed(task.status) && task.status !== "backlog" && task.status !== "todo",
	);
}

export function turnTrailerOf(board: Board, chat: string): TurnTrailer {
	return {
		trailer: trailerOf(board, chat),
	};
}

export function nudgeOf(task: Task): string {
	const steps = stepsCountOf(task);
	const criteria = criteriaCountOf(task);
	return [
		`[Sumi] ${idOf(task.number)} "${oneLine(task.title)}" is still in progress: ${steps.total - steps.done} of ${steps.total} steps open, ${criteria.done} of ${criteria.total} criteria met or dropped.`,
		"Go on with it, or move it with task_move: ready_to_test when every step and criterion is settled, paused or blocked with a note when you cannot go on.",
	].join(" ");
}

export function criteriaCountOf(task: Task): Count {
	return {
		done: task.acceptance.filter((criterion) => criterion.state !== "open").length,
		total: task.acceptance.length,
	};
}

export function stepsCountOf(task: Task): Count {
	return {
		done: task.plan.filter((step) => isTerminalStep(step.state)).length,
		total: task.plan.length,
	};
}

function nextStepSaidOf(task: Task): string | null {
	const next = nextStepOf(task);
	return next === null ? null : oneLine(next.text);
}

function trailerOf(board: Board, chat: string): string | null {
	const task = openTaskOf(board, chat);

	if (task === null) {
		return null;
	}

	const next = nextStepOf(task);
	const steps = stepsCountOf(task);
	const lines = [
		`[Sumi] This chat's task: ${idOf(task.number)} "${oneLine(task.title)}", ${task.status}, ${steps.done} of ${steps.total} steps done.`,
		next === null ? null : `Next step: ${stepForAgentOf(next)}.`,
		task.status === "in_progress"
			? "Mark each step with task_step as you finish it; move the task before you stop."
			: null,
	];
	return lines.filter((line) => line !== null).join(" ");
}

function testsCountOf(task: Task): Count | null {
	if (task.testPlan === null) {
		return null;
	}

	const run = task.testPlan.runs.at(-1);
	return {
		done: run === undefined ? 0 : Object.values(run.results).filter((result) => result === "passed").length,
		total: task.testPlan.cases.length,
	};
}

function actionsOf(task: Task, now: number): PersonAction[] {
	const keep: PersonAction[] = staleStageOf(task, now) === "fresh" ? [] : ["keep"];

	if (task.status === "ready_to_test") {
		return ["accept", "send_back", ...keep];
	}

	if (task.status === "blocked" && task.blocker !== null && HOST_BLOCKS.has(task.blocker.kind)) {
		return ["continue", ...keep];
	}

	if (task.status === "paused") {
		return ["continue", ...keep];
	}

	return keep;
}

function lastArrivalOf(task: Task): Transition | undefined {
	return [...task.log].reverse().find((entry) => entry.to === task.status);
}
