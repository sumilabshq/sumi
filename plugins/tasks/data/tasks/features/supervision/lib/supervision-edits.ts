import { quietDaysOf, staleStageOf } from "../../../shared/lib/staleness.js";
import { nudgeOf } from "../../../shared/lib/task-cards.js";
import { moveOnBoard, moveTask } from "../../../shared/lib/task-moves.js";
import type { BoardStep, Move, TakenStep } from "../../../shared/lib/task-moves.js";
import { idOf, isClosed, withTask } from "../../../shared/lib/task-refs.js";
import type { Blocker, BlockerKind, Board, Task } from "../../../shared/schema/task.schema.js";
import type {
	ReconcileAsk,
	ReleaseChatAsk,
	SettleTurnAsk,
	TurnFailureKind,
} from "../../../shared/schema/task-asks.schema.js";
import type { TurnFollowUp } from "../../../shared/schema/task-view.schema.js";

export const MOST_NUDGES = 2;
export const CLOCK_SKEW_MS = 2000;

const HOST: Move["by"] = {
	kind: "host",
};

const STOPPED = "stopped by you";
const WAITING_FOR_DRAFT = "waiting for you: you were writing in its chat";
const STALLED = "ended its turn {nudges} times with open steps and did not move the task";
const INTERRUPTED = "the app closed while it was in progress";
const RELEASED = "its chat was {why}";
const EXPIRED = "stale: no activity for {days} days";
const UNCONFIRMED = "Done · not confirmed: no answer for {days} days";
const FAILED = "the turn failed";
const MOST_DETAIL = 600;

const FAILURE_BLOCKER_KIND: Readonly<Record<TurnFailureKind, BlockerKind>> = {
	silent: "session_silent",
	usage_limit: "usage_limit",
	other: "session_failed",
};

export function settledStep(board: Board, ask: SettleTurnAsk, now: number): BoardStep {
	const said = `turn ${ask.turn} of chat ${ask.chat} settled ${ask.ended}`;
	const working = workingOf(board, ask.chat);

	if (working.length === 0) {
		return { board, reason: `${said}: nothing in progress` };
	}

	const move = endedMoveOf(ask);

	if (move !== null) {
		return movedAll(board, working, { now, move });
	}

	const worked = working.filter((task) => isWorkedInTurn(task, ask));
	const uncounted = uncountedWhyOf(ask, worked);

	if (uncounted !== null) {
		return { board, reason: `${said}: not counted (${uncounted})` };
	}

	if (ask.isDrafted) {
		return movedAll(board, worked, { now, move: { to: "paused", by: HOST, reason: WAITING_FOR_DRAFT } });
	}

	if (ask.startedBy === "person" || ask.ended === "compact") {
		return { board, reason: `${said}: nudged without counting (the person started the turn)` };
	}

	return nudgedOrStalled(board, worked, now);
}

export function followUpOf(board: Board, ask: SettleTurnAsk): TurnFollowUp {
	if (endedMoveOf(ask) !== null || ask.isDrafted || ask.isBusy) {
		return { followUp: null };
	}

	const nudged = workingOf(board, ask.chat).find((task) => isWorkedInTurn(task, ask));
	return { followUp: nudged === undefined ? null : { message: nudgeOf(nudged), task: idOf(nudged.number) } };
}

export function releasedStep(board: Board, ask: ReleaseChatAsk, now: number): BoardStep {
	const reason = RELEASED.replace("{why}", ask.why);
	const tasks = board.tasks.map((task) => releaseTask(task, ask.chat, { now, reason }));

	if (tasks.every((task, at) => task === board.tasks[at])) {
		return { board, reason: `chat ${ask.chat} ${ask.why}: it held no task` };
	}

	return {
		board: { ...board, tasks },
		reason: `chat ${ask.chat} ${ask.why}: its tasks released`,
	};
}

export function reconciledStep(board: Board, ask: ReconcileAsk, now: number): BoardStep {
	const live = new Set(ask.liveChats);
	const orphans = board.tasks.filter(
		(task) => task.status === "in_progress" && (task.owner === null || !live.has(task.owner)),
	);
	const blocker: Blocker = { kind: "interrupted", detail: INTERRUPTED, resumesAt: null };
	return movedAll(board, orphans, { now, move: { to: "blocked", by: HOST, reason: INTERRUPTED, blocker } });
}

export function sweptStep(board: Board, now: number): BoardStep {
	const expired = board.tasks.filter((task) => staleStageOf(task, now) === "expired");
	return expired.reduce<BoardStep>((step, task) => closeExpired(step, task, now), { board, reason: "sweep" });
}

function endedMoveOf(ask: SettleTurnAsk): Move | null {
	if (ask.ended === "stopped") {
		return { to: "paused", by: HOST, reason: STOPPED };
	}

	if (ask.ended !== "failed") {
		return null;
	}

	const blocker = failureBlockerOf(ask);
	return { to: "blocked", by: HOST, reason: blocker.detail, blocker };
}

function closeExpired(step: BoardStep, task: Task, now: number): BoardStep {
	if ("refusal" in step) {
		return step;
	}

	const move = expiredMoveOf(task, now);
	const moved = moveOnBoard(step.board, task, {
		move,
		now,
	});
	return {
		board: moved.board,
		reason: `${step.reason}; ${idOf(task.number)} ${task.status} → ${move.to} (${move.reason})`,
	};
}

function expiredMoveOf(task: Task, now: number): Move {
	const days = String(quietDaysOf(task, now));

	if (task.status === "ready_to_test") {
		return { to: "done", by: HOST, reason: UNCONFIRMED.replace("{days}", days) };
	}

	return { to: "cancelled", by: HOST, reason: EXPIRED.replace("{days}", days) };
}

function nudgedOrStalled(board: Board, worked: readonly Task[], now: number): BoardStep {
	const stalled = worked.filter((task) => task.nudges >= MOST_NUDGES);
	const detail = STALLED.replace("{nudges}", String(MOST_NUDGES + 1));
	const blocked = movedAll(board, stalled, {
		now,
		move: { to: "blocked", by: HOST, reason: detail, blocker: { kind: "stalled", detail, resumesAt: null } },
	});
	const nudged = worked
		.filter((task) => task.nudges < MOST_NUDGES)
		.map((task) => ({ ...task, nudges: task.nudges + 1 }));
	const nudgedSaid = nudged.map((task) => `${idOf(task.number)} nudge ${task.nudges - 1} → ${task.nudges}`);
	return {
		board: nudged.reduce(withTask, blocked.board),
		reason: [...(stalled.length === 0 ? [] : [blocked.reason]), ...nudgedSaid].join("; "),
	};
}

function workingOf(board: Board, chat: string): readonly Task[] {
	return board.tasks.filter((task) => task.owner === chat && task.status === "in_progress");
}

function isWorkedInTurn(task: Task, ask: SettleTurnAsk): boolean {
	const started = [...task.log].reverse().find((transition) => transition.to === "in_progress");

	if (started === undefined || started.at <= ask.turnStartedAt + CLOCK_SKEW_MS) {
		return true;
	}

	return started.by.kind === "agent" && started.by.chat === ask.chat;
}

function uncountedWhyOf(ask: SettleTurnAsk, worked: readonly Task[]): string | null {
	if (worked.length === 0) {
		return "no task of it was in progress during the turn";
	}

	return ask.isBusy ? "the chat is answering again; that turn settles it" : null;
}

function movedAll(
	board: Board,
	tasks: readonly Task[],
	{ now, move }: { readonly now: number; readonly move: Move },
): TakenStep {
	if (tasks.length === 0) {
		return { board, reason: "nothing to move" };
	}

	const moved = tasks.map((task) => moveTask(task, move, now));
	return {
		board: moved.reduce(withTask, board),
		reason: tasks.map((task) => `${idOf(task.number)} ${task.status} → ${move.to} by host: ${move.reason}`).join("; "),
	};
}

function failureBlockerOf({ failure }: SettleTurnAsk): Blocker {
	if (failure === null) {
		return { kind: "session_failed", detail: FAILED, resumesAt: null };
	}

	return {
		kind: FAILURE_BLOCKER_KIND[failure.kind],
		detail: failure.detail.slice(0, MOST_DETAIL),
		resumesAt: failure.kind === "usage_limit" ? failure.resumesAt : null,
	};
}

function releaseTask(
	task: Task,
	chat: string,
	{ now, reason }: { readonly now: number; readonly reason: string },
): Task {
	const chats = task.chats.filter((kept) => kept !== chat);

	if (task.owner !== chat || isClosed(task.status)) {
		return chats.length === task.chats.length ? task : { ...task, chats };
	}

	const blocked =
		task.status === "in_progress"
			? moveTask(
					task,
					{ to: "blocked", by: HOST, reason, blocker: { kind: "session_failed", detail: reason, resumesAt: null } },
					now,
				)
			: task;
	return { ...blocked, owner: null, chats };
}
