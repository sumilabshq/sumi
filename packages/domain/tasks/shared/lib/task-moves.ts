import { MOST_CHATS } from "../schema/task.schema.js";
import type { Actor, Blocker, Board, Task, TaskStatus, Transition } from "../schema/task.schema.js";
import { idOf, isClosed, oneLine, withTask } from "./task-refs.js";

export type BoardStep =
	| {
			readonly board: Board;
			readonly reason: string;
	  }
	| {
			readonly refusal: string;
	  };

export type TakenStep = Exclude<BoardStep, { readonly refusal: string }>;

export interface Move {
	readonly to: TaskStatus;
	readonly by: Actor;
	readonly reason: string;
	readonly blocker?: Blocker | null;
	readonly takenBy?: string | null;
}

export interface Moving {
	readonly move: Move;
	readonly now: number;
}

const LOG_MOST = 200;
const UNBLOCKED = "{blocker} closed; ready to go on";

export function moveTask(task: Task, move: Move, now: number): Task {
	const chat = move.takenBy ?? (move.by.kind === "agent" ? move.by.chat : null);
	return {
		...task,
		status: move.to,
		blocker: move.to === "blocked" ? (move.blocker ?? null) : null,
		owner: ownerAfter(task, move, chat),
		chats: chatsWith(task.chats, chat),
		updatedAt: now,
		nudges: 0,
		log: [...task.log, transitionOf(task, move, now)].slice(-LOG_MOST),
	};
}

export function moveOnBoard(board: Board, task: Task, { move, now }: Moving): TakenStep {
	const moved = moveTask(task, move, now);
	return {
		board: withUnblockedAfter(withTask(board, moved), moved, now),
		reason: moveReasonOf(task, move),
	};
}

export function touchTask(task: Task, by: Actor, now: number): Task {
	return {
		...task,
		chats: chatsWith(task.chats, by.kind === "agent" ? by.chat : null),
		updatedAt: now,
	};
}

function moveReasonOf(task: Task, move: Move): string {
	return `${idOf(task.number)} ${task.status} → ${move.to} by ${actorWordOf(move.by)}${move.reason === "" ? "" : `: ${oneLine(move.reason)}`}`;
}

function actorWordOf(actor: Actor): string {
	return actor.kind === "agent" ? `chat ${actor.chat}` : actor.kind;
}

function withUnblockedAfter(board: Board, closed: Task, now: number): Board {
	if (!isClosed(closed.status)) {
		return board;
	}

	return {
		...board,
		tasks: board.tasks.map((task) => (isFreedBy(board, task, closed) ? freeTask(task, closed, now) : task)),
	};
}

function transitionOf(task: Task, move: Move, now: number): Transition {
	return {
		from: task.status,
		to: move.to,
		by: move.by,
		reason: oneLineOrEmpty(move.reason),
		at: now,
	};
}

function ownerAfter(task: Task, move: Move, chat: string | null): string | null {
	if (move.to === "todo" || move.to === "backlog") {
		return null;
	}

	if (move.to === "in_progress" && chat !== null) {
		return chat;
	}

	return task.owner;
}

function isFreedBy(board: Board, task: Task, closed: Task): boolean {
	if (task.status !== "blocked" || task.blocker?.kind !== "task" || !task.blockedBy.includes(closed.number)) {
		return false;
	}

	return task.blockedBy.every((number) => {
		const blocker = board.tasks.find((other) => other.number === number);
		return blocker === undefined || isClosed(blocker.status);
	});
}

function freeTask(task: Task, closed: Task, now: number): Task {
	const reason = UNBLOCKED.replace("{blocker}", idOf(closed.number));
	return moveTask(
		task,
		{
			to: "paused",
			by: {
				kind: "host",
			},
			reason,
		},
		now,
	);
}

function chatsWith(chats: readonly string[], chat: string | null): string[] {
	if (chat === null || chats.includes(chat)) {
		return [...chats];
	}

	return [...chats, chat].slice(-MOST_CHATS);
}

function oneLineOrEmpty(text: string): string {
	return text.trim() === "" ? "" : text.replace(/\s+/g, " ").trim().slice(0, 1000);
}
