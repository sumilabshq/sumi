import { refuseMove, refuseOverflow } from "../../../shared/lib/gates.js";
import { continueAtOf, nextStepOf, stepForAgentOf } from "../../../shared/lib/task-cards.js";
import { moveOnBoard } from "../../../shared/lib/task-moves.js";
import type { BoardStep, Move, TakenStep } from "../../../shared/lib/task-moves.js";
import { idOf, nextIdOf, oneLine, taskOfRef, withTask } from "../../../shared/lib/task-refs.js";
import { MOST_CRITERIA } from "../../../shared/schema/task.schema.js";
import type { Board, Task } from "../../../shared/schema/task.schema.js";
import type { ContinueAsk, SendBackAsk, UndeliveredAsk } from "../../../shared/schema/task-asks.schema.js";

const NOTHING_TO_ACCEPT = "{id} is {status}; only a task Ready to test is accepted.";
const NOTHING_TO_SEND_BACK = "{id} is {status}; only a task Ready to test is sent back.";
const NOTHING_TO_CONTINUE = "{id} is {status}; only a blocked or paused task is continued.";
const NOT_YET = "{id} waits for its usage limit to reset in {minutes} min; continue it then.";
const UNDELIVERED = "its chat did not get the message ({reason})";
const NOTE_DOES_NOT_FIT =
	"{id} already holds {most} acceptance criteria, so your note cannot be added. Accept it, or cancel it and create a follow-up task with your note.";
const KEPT = "{id} kept by you: quiet for 0 days";
const CONTINUE_MESSAGE = 'Continue {id} "{title}".{next} Read it with task_get first.';
const START_MESSAGE = 'Take over {id} "{title}": read it with task_get, then task_start it and go on.';
const SENT_BACK_MESSAGE = 'The person sent {id} back: "{note}". Fix it, then move it to ready_to_test again.';
const SENT_BACK_TODO_MESSAGE =
	'The person sent {id} "{title}" back: "{note}". Take it over: read it with task_get, task_start it, fix it, then move it to ready_to_test again.';
const MINUTE_MS = 60_000;

const HOST: Move["by"] = {
	kind: "host",
};

const PERSON: Move["by"] = {
	kind: "person",
};

export function acceptedStep(board: Board, ref: string, now: number): BoardStep {
	return personMovedStep(board, ref, {
		now,
		reason: "accepted",
		wanted: "ready_to_test",
		to: "done",
		refusal: NOTHING_TO_ACCEPT,
	});
}

export function sentBackStep(board: Board, ask: SendBackAsk, now: number): BoardStep {
	const moved = personMovedStep(board, ask.task, {
		now,
		reason: ask.note,
		wanted: "ready_to_test",
		to: ask.chat === null ? "todo" : "in_progress",
		takenBy: ask.chat,
		refusal: NOTHING_TO_SEND_BACK,
	});
	return "refusal" in moved ? moved : withNoteAsCriterion(moved, ask);
}

export function continuedStep(board: Board, ask: ContinueAsk, now: number): BoardStep {
	const task = continuableOrRefusal(board, ask.task, now);

	if (typeof task === "string") {
		return { refusal: task };
	}

	return personMovedStep(board, ask.task, {
		now,
		reason: "continued by you",
		wanted: task.status,
		to: ask.chat === null ? "todo" : "in_progress",
		takenBy: ask.chat,
		refusal: NOTHING_TO_CONTINUE,
	});
}

export function undeliveredStep(board: Board, ask: UndeliveredAsk, now: number): BoardStep {
	const task = taskOfRef(board, ask.task);

	if (typeof task === "string") {
		return { refusal: task };
	}

	if (task.status !== "in_progress") {
		return {
			board,
			reason: `${idOf(task.number)} is ${task.status}: an undelivered message leaves it as it is`,
		};
	}

	const move: Move = { to: "paused", by: HOST, reason: UNDELIVERED.replace("{reason}", ask.reason) };
	return moveOnBoard(board, task, {
		move,
		now,
	});
}

export function keptStep(board: Board, ref: string, now: number): BoardStep {
	const task = taskOfRef(board, ref);

	if (typeof task === "string") {
		return { refusal: task };
	}

	return {
		board: withTask(board, { ...task, keptAt: now }),
		reason: KEPT.replace("{id}", idOf(task.number)),
	};
}

export function continueMessageOf(task: Task): string {
	if (task.status === "todo") {
		return START_MESSAGE.replace("{id}", idOf(task.number)).replace("{title}", oneLine(task.title));
	}

	const next = nextStepOf(task);
	return CONTINUE_MESSAGE.replace("{id}", idOf(task.number))
		.replace("{title}", oneLine(task.title))
		.replace("{next}", next === null ? "" : ` Next step: ${stepForAgentOf(next)}.`);
}

export function sentBackMessageOf(task: Task, note: string): string {
	if (task.status === "todo") {
		return SENT_BACK_TODO_MESSAGE.replace("{id}", idOf(task.number))
			.replace("{title}", oneLine(task.title))
			.replace("{note}", oneLine(note));
	}

	return SENT_BACK_MESSAGE.replace("{id}", idOf(task.number)).replace("{note}", oneLine(note));
}

interface PersonMove {
	readonly now: number;
	readonly reason: string;
	readonly wanted: Task["status"];
	readonly to: Task["status"];
	readonly takenBy?: string | null;
	readonly refusal: string;
}

function personMovedStep(board: Board, ref: string, move: PersonMove): BoardStep {
	const task = taskOfRef(board, ref);

	if (typeof task === "string") {
		return { refusal: task };
	}

	const shaped: Move = { to: move.to, by: PERSON, reason: move.reason, takenBy: move.takenBy ?? null };
	const refused = refuseUnwanted(task, move) ?? refuseMove(board, task, shaped);

	if (refused !== null) {
		return { refusal: refused };
	}

	return moveOnBoard(board, task, {
		move: shaped,
		now: move.now,
	});
}

function refuseUnwanted(task: Task, move: PersonMove): string | null {
	return task.status === move.wanted
		? null
		: move.refusal.replace("{id}", idOf(task.number)).replace("{status}", task.status);
}

function continuableOrRefusal(board: Board, ref: string, now: number): Task | string {
	const task = taskOfRef(board, ref);

	if (typeof task === "string") {
		return task;
	}

	return refuseContinue(task, now) ?? task;
}

function refuseContinue(task: Task, now: number): string | null {
	if (task.status !== "blocked" && task.status !== "paused") {
		return NOTHING_TO_CONTINUE.replace("{id}", idOf(task.number)).replace("{status}", task.status);
	}

	const continueAt = continueAtOf(task, now);
	return continueAt === null
		? null
		: NOT_YET.replace("{id}", idOf(task.number)).replace(
				"{minutes}",
				String(Math.ceil((continueAt - now) / MINUTE_MS)),
			);
}

function withNoteAsCriterion(moved: TakenStep, ask: SendBackAsk): BoardStep {
	const task = taskOfRef(moved.board, ask.task);

	if (typeof task === "string") {
		return { refusal: task };
	}

	const reopened = withOpenCriterion(task, ask.note);

	if (refuseOverflow(reopened) !== null) {
		return { refusal: NOTE_DOES_NOT_FIT.replace("{id}", idOf(task.number)).replace("{most}", String(MOST_CRITERIA)) };
	}

	return {
		board: withTask(moved.board, reopened),
		reason: moved.reason,
	};
}

function withOpenCriterion(task: Task, text: string): Task {
	return {
		...task,
		acceptance: [
			...task.acceptance,
			{
				id: nextIdOf("C", task.acceptance),
				text,
				state: "open",
				evidence: null,
				reason: null,
			},
		],
	};
}
