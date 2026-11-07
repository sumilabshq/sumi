import type { Runtime } from "@widgetarium/data-framework";
import {
	ReleaseChatTasksCommand,
	SettleTurnCommand,
	TaskTrailerQuery,
	UndeliveredTaskCommand,
} from "@widgetarium/tasks";
import type { SettleTurnAsk, TurnFollowUp, TurnTrailer } from "@widgetarium/tasks";
import type { SettledTurn } from "./turn-session.js";

export type ChatReleased = "cleared" | "deleted";

export interface SettleFacts {
	readonly isDrafted: boolean;
	readonly isBusy: boolean;
}

export type Nudge = NonNullable<TurnFollowUp["followUp"]>;

export interface ChatTasks {
	askTrailer(chatId: string): Promise<TurnTrailer>;
	settle(chatId: string, turn: SettledTurn, facts: SettleFacts): Promise<Nudge | null>;
	unsent(nudge: Nudge, reason: string): Promise<void>;
	release(chatId: string, why: ChatReleased): Promise<void>;
}

const NO_TRAILER: TurnTrailer = {
	trailer: null,
};

const TRAILER_UNREAD = "[tasks] chat {chat}: the turn starts without its task trailer ({reason})";
const NOT_SETTLED = "[tasks] chat {chat}: turn {turn} ended {ended}, its tasks stay as they were ({reason})";
const NOT_RELEASED = "[tasks] chat {chat} {why}: its tasks stay owned by it ({reason})";
const NOT_PAUSED = "[tasks] {task}: its nudge was not sent and it stays in progress ({reason})";

export const NO_CHAT_TASKS: ChatTasks = {
	askTrailer: () => Promise.resolve(NO_TRAILER),
	settle: () => Promise.resolve(null),
	unsent: () => Promise.resolve(),
	release: () => Promise.resolve(),
};

export function chatTasksOver(app: Runtime): ChatTasks {
	return {
		askTrailer: (chatId) => askTrailer(app, chatId),
		settle: (chatId, turn, facts) => settle(app, settleAskOf(chatId, turn, facts)),
		unsent: (nudge, reason) => unsent(app, nudge, reason),
		release: (chatId, why) => release(app, chatId, why),
	};
}

export function settleAskOf(chatId: string, settled: SettledTurn, facts: SettleFacts): SettleTurnAsk {
	return {
		chat: chatId,
		turn: settled.turn,
		ended: settled.ended,
		turnStartedAt: settled.startedAt,
		startedBy: settled.startedBy,
		isDrafted: facts.isDrafted,
		isBusy: facts.isBusy,
		failure: turnFailureOf(settled),
	};
}

function turnFailureOf({ failureKind, failure, resumesAt }: SettledTurn): SettleTurnAsk["failure"] {
	if (failureKind === null) {
		return null;
	}

	return {
		kind: failureKind,
		detail: failure ?? "",
		resumesAt,
	};
}

async function askTrailer(app: Runtime, chatId: string): Promise<TurnTrailer> {
	const answered = await app.send(TaskTrailerQuery, { chat: chatId });

	if (!answered.ok) {
		console.warn(TRAILER_UNREAD.replace("{chat}", chatId).replace("{reason}", answered.reason));
		return NO_TRAILER;
	}

	return answered.output;
}

async function settle(app: Runtime, ask: SettleTurnAsk): Promise<Nudge | null> {
	const answered = await app.send(SettleTurnCommand, ask);

	if (!answered.ok) {
		// TODO: a refused settle leaves its task in progress until the next cold start
		console.warn(
			NOT_SETTLED.replace("{chat}", ask.chat)
				.replace("{turn}", ask.turn)
				.replace("{ended}", ask.ended)
				.replace("{reason}", answered.reason),
		);
		return null;
	}

	return answered.output.followUp;
}

async function unsent(app: Runtime, nudge: Nudge, reason: string): Promise<void> {
	const answered = await app.send(UndeliveredTaskCommand, { task: nudge.task, reason });

	if (!answered.ok) {
		// TODO: retry, or the task stays in progress until the next cold start
		console.error(NOT_PAUSED.replace("{task}", nudge.task).replace("{reason}", answered.reason));
		return;
	}

	console.info(`[tasks] ${nudge.task}: its nudge was not sent (${reason}) → ${answered.output.status}`);
}

async function release(app: Runtime, chatId: string, why: ChatReleased): Promise<void> {
	const answered = await app.send(ReleaseChatTasksCommand, { chat: chatId, why });

	if (!answered.ok) {
		console.warn(NOT_RELEASED.replace("{chat}", chatId).replace("{why}", why).replace("{reason}", answered.reason));
		return;
	}

	console.info(`[tasks] chat ${chatId} ${why}: ${answered.output.changed} tasks released → no owner`);
}
