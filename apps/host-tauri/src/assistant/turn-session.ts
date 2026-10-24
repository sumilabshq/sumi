import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { Emit, StreamPart } from "@widgetarium/core/engine/provider-stream.js";
import {
	EMPTY_SESSION,
	endedTurn,
	startedCompact,
	startedTurn,
	withoutLastCompact,
	withoutLastQuestion,
	withPart,
} from "./session-steps.js";
import type { RunAnswer, TurnRun } from "./turn-run.js";

export interface StartedTurn {
	readonly run: TurnRun;
	readonly providerId: string;
	readonly resumesWithoutAnId: boolean;
}

export type ResumeOf = (providerId: string) => string | null;

export type StartTurn = (asked: string, resumeOf: ResumeOf, emit: Emit) => Promise<StartedTurn>;

export interface TurnSession {
	now(): AssistantSession;
	watch(changed: () => void): () => void;
	send(said: string): Promise<void>;
	retry(): void;
	stop(): void;
	clear(): Promise<void>;
	compact(): Promise<void>;
}

export interface KeptChat {
	readonly session: AssistantSession;
	readonly resumes: ReadonlyMap<string, string>;
}

export interface ChatHistory {
	readonly kept: KeptChat;
	settled(session: AssistantSession, resumes: ReadonlyMap<string, string>): void;
	cleared(): void;
}

export const NO_CHAT_HISTORY: ChatHistory = {
	kept: {
		session: EMPTY_SESSION,
		resumes: new Map(),
	},
	settled: () => undefined,
	cleared: () => undefined,
};

export const NOTHING_TO_SEND = "There is nothing to send.";
export const STILL_ANSWERING = "The assistant is still answering. Wait for it, or stop it first.";
export const STOPPED = "Stopped.";
export const NOTHING_TO_COMPACT = "There is nothing to compact yet: this chat has no conversation with the agent.";
export const COMPACT_PROMPT = "/compact";
const NOT_STARTED = "The answer could not be started: {why}";
const RESUMES_ITS_OWN_LAST = "last";
const DRAW_EVERY_MS = 60;

interface ActiveTurn {
	readonly run: TurnRun;
	readonly providerId: string;
}

interface SessionStore {
	session: AssistantSession;
	active: ActiveTurn | null;
	generation: number;
	drawTimer: ReturnType<typeof setTimeout> | null;
	readonly resumes: Map<string, string>;
	readonly watchers: Set<() => void>;
	readonly clock: () => number;
	readonly history: ChatHistory;
}

export function createTurnSession(
	startTurn: StartTurn,
	clock: () => number = Date.now,
	history: ChatHistory = NO_CHAT_HISTORY,
): TurnSession {
	const store: SessionStore = {
		session: history.kept.session,
		active: null,
		generation: 0,
		drawTimer: null,
		resumes: new Map(history.kept.resumes),
		watchers: new Set(),
		clock,
		history,
	};
	return {
		now: () => store.session,
		watch: (changed) => {
			store.watchers.add(changed);
			return () => void store.watchers.delete(changed);
		},
		send: (said) => send(store, startTurn, said),
		retry: () => retry(store, startTurn),
		stop: () => stop(store),
		clear: async () => {
			store.active?.run.stop();
			store.resumes.clear();
			history.cleared();
			settleNow(store, EMPTY_SESSION);
		},
		compact: () => compact(store, startTurn),
	};
}

function notify(store: SessionStore): void {
	store.watchers.forEach((changed) => changed());
}

function cancelDraw(store: SessionStore): void {
	if (store.drawTimer !== null) {
		clearTimeout(store.drawTimer);
	}
	store.drawTimer = null;
}

function notifySoon(store: SessionStore): void {
	if (store.drawTimer !== null) {
		return;
	}

	store.drawTimer = setTimeout(() => {
		store.drawTimer = null;
		notify(store);
	}, DRAW_EVERY_MS);
}

function settleNow(store: SessionStore, settled: AssistantSession): void {
	store.active = null;
	store.generation += 1;
	cancelDraw(store);
	store.session = settled;
	store.history.settled(settled, store.resumes);
	notify(store);
}

function applyPart(store: SessionStore, active: ActiveTurn, part: StreamPart): void {
	if ("session" in part && part.session !== "") {
		store.resumes.set(active.providerId, part.session);
	}
	store.session = withPart(store.session, part, store.clock());
	notifySoon(store);
}

function settleRun(store: SessionStore, started: StartedTurn, { failure }: RunAnswer): void {
	// TRADE-OFF: a marker, because a CLI that resumes its own last conversation names no id to carry
	if (failure === null && started.resumesWithoutAnId && !store.resumes.has(started.providerId)) {
		store.resumes.set(started.providerId, RESUMES_ITS_OWN_LAST);
	}
	const ended = endedTurn(store.session, failure === null ? "done" : "failed", store.clock());
	settleNow(store, { ...ended, failure: failure ?? ended.failure });
}

function failTurn(store: SessionStore, generation: number, failed: unknown): void {
	if (store.generation !== generation) {
		return;
	}

	const failure = NOT_STARTED.replace("{why}", failureMessage(failed));
	settleNow(store, { ...endedTurn(store.session, "failed", store.clock()), failure });
}

async function answerTurn(store: SessionStore, startTurn: StartTurn, asked: string, generation: number): Promise<void> {
	const owned: { active: ActiveTurn | null } = { active: null };
	const emit: Emit = (part) => {
		if (owned.active !== null && store.active === owned.active) {
			applyPart(store, owned.active, part);
		}
	};
	const started = await startTurn(asked, (providerId) => store.resumes.get(providerId) ?? null, emit);
	if (store.generation !== generation) {
		started.run.stop();
		return;
	}

	owned.active = { run: started.run, providerId: started.providerId };
	store.active = owned.active;
	const answer = await started.run.done;
	if (store.active === owned.active) {
		settleRun(store, started, answer);
	}
}

function refusalOf(session: AssistantSession, asked: string): string | null {
	if (asked === "") {
		return NOTHING_TO_SEND;
	}

	return session.busy ? STILL_ANSWERING : null;
}

function send(store: SessionStore, startTurn: StartTurn, said: string): Promise<void> {
	const asked = said.trim();
	const refusal = refusalOf(store.session, asked);
	if (refusal !== null) {
		return Promise.reject(new Error(refusal));
	}

	store.session = startedTurn(store.session, asked, store.clock());
	return answer(store, startTurn, asked);
}

function compactRefusalOf({ session, resumes }: SessionStore): string | null {
	if (session.busy) {
		return STILL_ANSWERING;
	}

	return resumes.size === 0 ? NOTHING_TO_COMPACT : null;
}

function compact(store: SessionStore, startTurn: StartTurn): Promise<void> {
	const refusal = compactRefusalOf(store);
	if (refusal !== null) {
		return Promise.reject(new Error(refusal));
	}

	store.session = startedCompact(store.session, store.clock());
	return answer(store, startTurn, COMPACT_PROMPT);
}

function answer(store: SessionStore, startTurn: StartTurn, asked: string): Promise<void> {
	notify(store);
	const generation = store.generation;
	answerTurn(store, startTurn, asked, generation).catch((failed: unknown) => failTurn(store, generation, failed));
	return Promise.resolve();
}

function retry(store: SessionStore, startTurn: StartTurn): void {
	const uncompacted = store.session.busy ? null : withoutLastCompact(store.session);
	if (uncompacted !== null) {
		store.session = uncompacted;
		compact(store, startTurn).catch((failed: unknown) =>
			settleNow(store, { ...store.session, failure: failureMessage(failed) }),
		);
		return;
	}

	const retried = store.session.busy ? null : withoutLastQuestion(store.session);
	if (retried === null) {
		return;
	}

	store.session = retried.session;
	void send(store, startTurn, retried.asked);
}

function stop(store: SessionStore): void {
	if (!store.session.busy) {
		return;
	}

	store.active?.run.stop();
	const stopped = endedTurn(store.session, "stopped", store.clock());
	settleNow(store, { ...stopped, failure: STOPPED });
}
