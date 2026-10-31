import { refuseMove, refuseNoteless, refuseOverflow } from "../../../shared/lib/gates.js";
import { sameOpenTitleOf } from "../../../shared/lib/board-views.js";
import { moveOnBoard, touchTask } from "../../../shared/lib/task-moves.js";
import type { BoardStep, Move, TakenStep } from "../../../shared/lib/task-moves.js";
import { idOf, nextIdOf, numberOfRef, taskOfNumber, taskOfRef, withTask } from "../../../shared/lib/task-refs.js";
import type { Actor, Board, Task } from "../../../shared/schema/task.schema.js";
import type { CreateTaskAsk, EditTaskAsk, MoveTaskAsk, StartTaskAsk } from "../../../shared/schema/task-asks.schema.js";

const FOREIGN = "{id} is worked by another chat ({owner}). Read it with task_get; only that chat changes it.";
const NO_REF = "There is no task {ref}.";
const SELF_REF = "{id} cannot wait for itself.";
const BLOCKER_NEEDS_TASK = "A task blocker needs the task it waits for: set it with task_update blockedBy first.";

export interface Edited {
	readonly board: Board;
	readonly task: Task;
}

export function agentOf(chat: string): Actor {
	return {
		kind: "agent",
		chat,
	};
}

export function refuseForeign(task: Task, chat: string): string | null {
	if (task.owner === null || task.owner === chat) {
		return null;
	}

	return FOREIGN.replace("{id}", idOf(task.number)).replace("{owner}", task.owner);
}

export function editableOrRefusal(board: Board, ref: string, chat: string): Task | string {
	const task = taskOfRef(board, ref);

	if (typeof task === "string") {
		return task;
	}

	return refuseForeign(task, chat) ?? task;
}

export function stepWith(edited: Edited, reason: string): BoardStep {
	return {
		board: withTask(edited.board, edited.task),
		reason,
	};
}

export function createdStep(board: Board, ask: CreateTaskAsk, now: number): BoardStep {
	if (sameOpenTitleOf(board, ask.title) !== null) {
		return {
			board,
			reason: `task "${ask.title}" is already open: answered the open one`,
		};
	}

	const refused = refuseRefs(board, [...(ask.parent === null ? [] : [ask.parent]), ...ask.blockedBy]);

	if (refused !== null) {
		return { refusal: refused };
	}

	return createOnBoard(board, newTask(board, ask, now));
}

export function editedStep(board: Board, ask: EditTaskAsk, now: number): BoardStep {
	const task = editableOrRefusal(board, ask.task, ask.chat);

	if (typeof task === "string") {
		return { refusal: task };
	}

	const blockedBy = ask.blockedBy ?? task.blockedBy.map(idOf);
	const edited = withEdits(touchTask(task, agentOf(ask.chat), now), ask, blockedBy);
	const refused = refuseRefs(board, blockedBy) ?? refuseSelf(task, blockedBy) ?? refuseOverflow(edited);

	if (refused !== null) {
		return { refusal: refused };
	}

	return stepWith({ board, task: edited }, `${idOf(task.number)} edited by chat ${ask.chat}`);
}

export function startedStep(board: Board, ask: StartTaskAsk, now: number): BoardStep {
	return movedStep(
		board,
		{
			chat: ask.chat,
			task: ask.task,
			to: "in_progress",
			note: "started",
			blocker: null,
		},
		now,
	);
}

export function movedStep(board: Board, ask: MoveTaskAsk, now: number): BoardStep {
	const task = editableOrRefusal(board, ask.task, ask.chat);

	if (typeof task === "string") {
		return { refusal: task };
	}

	const move = agentMoveOf(ask);
	const refused =
		refuseNoteless(task, { ...move, note: ask.note }) ?? refuseMove(board, task, move) ?? refuseBlocker(task, ask);

	if (refused !== null) {
		return { refusal: refused };
	}

	return moveOnBoard(board, task, {
		move,
		now,
	});
}

export function nextDocIdOf(task: Task): string {
	return nextIdOf("D", task.documents);
}

function agentMoveOf(ask: MoveTaskAsk): Move {
	return {
		to: ask.to,
		by: agentOf(ask.chat),
		reason: ask.note ?? "",
		blocker: ask.to === "blocked" ? { kind: ask.blocker ?? "external", detail: ask.note ?? "", resumesAt: null } : null,
	};
}

function withEdits(task: Task, ask: EditTaskAsk, blockedBy: readonly string[]): Task {
	return {
		...task,
		title: ask.title ?? task.title,
		description: ask.description ?? task.description,
		kind: ask.kind ?? task.kind,
		blockedBy: blockedBy.flatMap(blockerNumbersOf),
		acceptance: [...task.acceptance, ...ask.addCriteria.map((text, at) => newCriterion(task, text, at))],
		plan: [...task.plan, ...ask.addSteps.map((text, at) => newStep(task, text, at))],
	};
}

function createOnBoard(board: Board, task: Task): TakenStep {
	return {
		board: {
			nextNumber: board.nextNumber + 1,
			tasks: [...board.tasks, task],
		},
		reason: `${idOf(task.number)} none → ${task.status} by chat ${task.createdBy}: created "${task.title}"`,
	};
}

function refuseBlocker(task: Task, ask: MoveTaskAsk): string | null {
	return ask.to === "blocked" && ask.blocker === "task" && task.blockedBy.length === 0 ? BLOCKER_NEEDS_TASK : null;
}

function refuseRefs(board: Board, refs: readonly string[]): string | null {
	const missing = refs.find((ref) => {
		const number = numberOfRef(ref);
		return number === null || taskOfNumber(board, number) === null;
	});
	return missing === undefined ? null : NO_REF.replace("{ref}", missing);
}

function refuseSelf(task: Task, refs: readonly string[]): string | null {
	return refs.some((ref) => numberOfRef(ref) === task.number) ? SELF_REF.replace("{id}", idOf(task.number)) : null;
}

function blockerNumbersOf(ref: string): number[] {
	const number = numberOfRef(ref);
	return number === null ? [] : [number];
}

function newTask(board: Board, ask: CreateTaskAsk, now: number): Task {
	const draft: Task = {
		number: board.nextNumber,
		title: ask.title,
		description: ask.description,
		kind: ask.kind,
		status: ask.status,
		blocker: null,
		parent: ask.parent === null ? null : numberOfRef(ask.parent),
		blockedBy: ask.blockedBy.flatMap(blockerNumbersOf),
		acceptance: [],
		plan: [],
		testPlan: null,
		documents: [],
		workplaces: [],
		owner: null,
		chats: [ask.chat],
		createdBy: ask.chat,
		createdAt: now,
		updatedAt: now,
		keptAt: null,
		nudges: 0,
		progressed: [],
		log: [
			{
				from: null,
				to: ask.status,
				by: agentOf(ask.chat),
				reason: "created",
				at: now,
			},
		],
	};
	return {
		...draft,
		acceptance: ask.acceptance.map((text, at) => newCriterion(draft, text, at)),
		plan: ask.plan.map((text, at) => newStep(draft, text, at)),
	};
}

function newCriterion(task: Task, text: string, at: number): Task["acceptance"][number] {
	return {
		id: `C${task.acceptance.length + at + 1}`,
		text,
		state: "open",
		evidence: null,
		reason: null,
	};
}

function newStep(task: Task, text: string, at: number): Task["plan"][number] {
	return {
		id: `S${task.plan.length + at + 1}`,
		text,
		state: "pending",
		note: null,
		by: null,
	};
}
