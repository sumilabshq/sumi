import type { AssistantSession, QueueChange, QueuedMessage } from "@widgetarium/core/engine/assistant-port.js";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { Emit, StreamPart } from "@widgetarium/core/engine/provider-stream.js";
import type { TurnEnded, TurnStarter } from "@widgetarium/tasks";
import {
	EMPTY_SESSION,
	endedTurn,
	heardMidTurn,
	startedCompact,
	startedTurn,
	withoutLastCompact,
	withoutLastQuestion,
	withPart,
} from "./session-steps.js";
import type { RunAnswer, RunFailureKind, TurnRun } from "./turn-run.js";

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
	sendFromHost(said: string): Promise<void>;
	retry(): void;
	stop(): void;
	clear(): Promise<void>;
	compact(): Promise<void>;
	lastEndedTurn(): string | null;
	changeQueue(change: QueueChange): string | null;
	handQueueToAgent(): string | null;
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

export interface SettledTurn {
	readonly turn: string;
	readonly ended: TurnEnded;
	readonly startedBy: TurnStarter;
	readonly startedAt: number;
	readonly failureKind: RunFailureKind | null;
	readonly failure: string | null;
	readonly resumesAt: number | null;
}

export interface TurnListener {
	settled(turn: SettledTurn): void;
	cleared(): void;
}

export interface TurnSessionOptions {
	readonly clock?: () => number;
	readonly history?: ChatHistory;
	readonly listener?: TurnListener;
}

export const NO_TURN_LISTENER: TurnListener = {
	settled: () => undefined,
	cleared: () => undefined,
};

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
const HEARD_MID_TURN =
	"The person sent these messages while you were working. They are their newest words: read them now and take them into account before your next step.";
const MESSAGE_HEAD = "Message {n}:";
export const NO_SUCH_QUEUED = "That queued message was already sent or removed.";
export const NOTHING_READY = "Nothing in the queue is ready to send.";

interface ActiveTurn {
	readonly run: TurnRun;
	readonly providerId: string;
}

interface RunningTurn {
	readonly id: string;
	readonly isCompact: boolean;
	readonly startedBy: TurnStarter;
	readonly startedAt: number;
}

interface TurnEnd {
	readonly ended: TurnEnded;
	readonly failureKind: RunFailureKind | null;
	readonly failure: string | null;
	readonly resumesAt: number | null;
}

interface SessionStore {
	session: AssistantSession;
	active: ActiveTurn | null;
	running: RunningTurn | null;
	lastEnded: string | null;
	generation: number;
	queuedIdSequence: number;
	drawTimer: ReturnType<typeof setTimeout> | null;
	readonly resumes: Map<string, string>;
	readonly watchers: Set<() => void>;
	readonly clock: () => number;
	readonly history: ChatHistory;
	readonly listener: TurnListener;
}

export function createTurnSession(startTurn: StartTurn, options: TurnSessionOptions = {}): TurnSession {
	const history = options.history ?? NO_CHAT_HISTORY;
	const store: SessionStore = {
		session: history.kept.session,
		active: null,
		running: null,
		lastEnded: null,
		generation: 0,
		queuedIdSequence: 0,
		drawTimer: null,
		resumes: new Map(history.kept.resumes),
		watchers: new Set(),
		clock: options.clock ?? Date.now,
		history,
		listener: options.listener ?? NO_TURN_LISTENER,
	};
	return {
		now: () => store.session,
		watch: (changed) => {
			store.watchers.add(changed);
			return () => void store.watchers.delete(changed);
		},
		send: (said) => send(store, startTurn, { said, startedBy: "person" }),
		sendFromHost: (said) => send(store, startTurn, { said, startedBy: "host" }),
		retry: () => retry(store, startTurn),
		stop: () => stop(store),
		clear: async () => {
			store.active?.run.stop();
			store.running = null;
			store.lastEnded = null;
			store.resumes.clear();
			history.cleared();
			settleNow(store, EMPTY_SESSION);
			store.listener.cleared();
		},
		compact: () => compact(store, startTurn),
		lastEndedTurn: () => store.lastEnded,
		changeQueue: (change) => changeQueue(store, startTurn, change),
		handQueueToAgent: () => handQueueToAgent(store),
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

function announceEnd(store: SessionStore, end: TurnEnd): void {
	const running = store.running;
	store.running = null;

	if (running === null) {
		return;
	}

	store.lastEnded = running.id;
	store.listener.settled({
		...end,
		turn: running.id,
		ended: end.ended === "done" && running.isCompact ? "compact" : end.ended,
		startedBy: running.startedBy,
		startedAt: running.startedAt,
	});
}

function settleRun(
	store: SessionStore,
	{ started, startTurn }: { readonly started: StartedTurn; readonly startTurn: StartTurn },
	{ failure, failureKind, resumesAt }: RunAnswer,
): void {
	// TRADE-OFF: a marker, because a CLI that resumes its own last conversation names no id to carry
	if (failure === null && started.resumesWithoutAnId && !store.resumes.has(started.providerId)) {
		store.resumes.set(started.providerId, RESUMES_ITS_OWN_LAST);
	}
	const ended = endedTurn(store.session, failure === null ? "done" : "failed", store.clock());
	settleNow(store, { ...ended, failure: failure ?? ended.failure });

	if (failure === null) {
		announceEnd(store, { ended: "done", failureKind: null, failure: null, resumesAt: null });
		sendQueue(store, startTurn);
		return;
	}

	announceEnd(store, { ended: "failed", failureKind: failureKind ?? "other", failure, resumesAt });
}

function failTurn(store: SessionStore, generation: number, failed: unknown): void {
	if (store.generation !== generation) {
		return;
	}

	const failure = NOT_STARTED.replace("{why}", failureMessage(failed));
	settleNow(store, { ...endedTurn(store.session, "failed", store.clock()), failure });
	announceEnd(store, { ended: "failed", failureKind: "other", failure, resumesAt: null });
}

interface TurnRequest {
	readonly asked: string;
	readonly generation: number;
	readonly isRetryAfterLostResume: boolean;
}

interface OwnedRun {
	active: ActiveTurn | null;
	resumeLost: boolean;
}

function applyOwnedPart(store: SessionStore, owned: OwnedRun, part: StreamPart): void {
	if ("resumeLost" in part) {
		owned.resumeLost = true;
		return;
	}

	if (owned.active === null || store.active !== owned.active || (owned.resumeLost && "failure" in part)) {
		return;
	}

	applyPart(store, owned.active, part);
}

function isRetriedFresh(owned: OwnedRun, turn: TurnRequest): boolean {
	return owned.resumeLost && !turn.isRetryAfterLostResume && turn.asked !== COMPACT_PROMPT;
}

function forgetLostResume(store: SessionStore, owned: OwnedRun, providerId: string): void {
	if (!owned.resumeLost) {
		return;
	}

	console.info(`[ink] ${providerId} resume ${store.resumes.get(providerId) ?? "none"} → none: not found`);
	store.resumes.delete(providerId);
}

async function answerTurn(store: SessionStore, startTurn: StartTurn, turn: TurnRequest): Promise<void> {
	const owned: OwnedRun = { active: null, resumeLost: false };
	const started = await startTurn(
		turn.asked,
		(providerId) => store.resumes.get(providerId) ?? null,
		(part) => applyOwnedPart(store, owned, part),
	);
	if (store.generation !== turn.generation) {
		started.run.stop();
		return;
	}

	owned.active = { run: started.run, providerId: started.providerId };
	store.active = owned.active;
	const answer = await started.run.done;
	if (store.active !== owned.active) {
		return;
	}

	forgetLostResume(store, owned, started.providerId);
	if (!isRetriedFresh(owned, turn)) {
		settleRun(store, { started, startTurn }, answer);
		return;
	}

	await answerTurn(store, startTurn, { ...turn, isRetryAfterLostResume: true });
}

function refusalOf(session: AssistantSession, asked: string): string | null {
	if (asked === "") {
		return NOTHING_TO_SEND;
	}

	return session.busy ? STILL_ANSWERING : null;
}

interface Sent {
	readonly said: string;
	readonly startedBy: TurnStarter;
}

function send(store: SessionStore, startTurn: StartTurn, { said, startedBy }: Sent): Promise<void> {
	const asked = said.trim();

	if (asked !== "" && store.session.busy && startedBy === "person") {
		enqueue(store, asked);
		return Promise.resolve();
	}

	const refusal = refusalOf(store.session, asked);
	if (refusal !== null) {
		return Promise.reject(new Error(refusal));
	}

	store.session = startedTurn(store.session, [asked], store.clock());
	return answer(store, startTurn, { asked, startedBy });
}

function writeQueued(store: SessionStore, queued: readonly QueuedMessage[], why: string): void {
	const was = store.session.queued.length;
	store.session = {
		...store.session,
		queued,
	};
	console.info(`[queue] ${was} → ${queued.length} queued (${why})`);
	notify(store);
}

function enqueue(store: SessionStore, text: string): void {
	store.queuedIdSequence += 1;
	const id = `${store.clock()}-${store.queuedIdSequence}`;
	writeQueued(store, [...store.session.queued, { id, text, isHeld: false }], `queued ${id} while the agent works`);
}

function changeQueue(store: SessionStore, startTurn: StartTurn, change: QueueChange): string | null {
	if (change.kind === "send-now") {
		return sendQueueNow(store, startTurn);
	}

	const { queued } = store.session;

	if (!queued.some(({ id }) => id === change.id)) {
		console.warn(`[queue] ${change.kind} ${change.id} refused: no such queued message`);
		return NO_SUCH_QUEUED;
	}

	if (change.kind === "remove") {
		writeQueued(store, without(queued, change.id), `removed ${change.id}`);
		return null;
	}

	if (change.kind === "hold") {
		writeQueued(
			store,
			patched(queued, change.id, { isHeld: change.isHeld }),
			`${change.isHeld ? "held" : "released"} ${change.id}`,
		);
		sendQueueIfIdle(store, startTurn);
		return null;
	}

	const edited = change.said.trim();

	if (edited === "") {
		writeQueued(store, without(queued, change.id), `edited ${change.id} to nothing`);
		return null;
	}

	writeQueued(store, patched(queued, change.id, { text: edited, isHeld: false }), `edited ${change.id}`);
	sendQueueIfIdle(store, startTurn);
	return null;
}

function without(queued: readonly QueuedMessage[], id: string): readonly QueuedMessage[] {
	return queued.filter((message) => message.id !== id);
}

function patched(
	queued: readonly QueuedMessage[],
	id: string,
	patch: Partial<Pick<QueuedMessage, "text" | "isHeld">>,
): readonly QueuedMessage[] {
	return queued.map((message) => (message.id === id ? { ...message, ...patch } : message));
}

function readyIn(queued: readonly QueuedMessage[]): readonly QueuedMessage[] {
	return queued.filter(({ isHeld }) => !isHeld);
}

function takeReadyTexts(store: SessionStore): readonly string[] {
	const ready = readyIn(store.session.queued);
	store.session = {
		...store.session,
		queued: store.session.queued.filter(({ isHeld }) => isHeld),
	};
	return ready.map(({ text }) => text);
}

function sendQueueIfIdle(store: SessionStore, startTurn: StartTurn): void {
	if (store.session.busy) {
		return;
	}

	sendQueue(store, startTurn);
}

function sendQueue(store: SessionStore, startTurn: StartTurn): void {
	if (readyIn(store.session.queued).length === 0) {
		return;
	}

	const texts = takeReadyTexts(store);
	store.session = startedTurn(store.session, texts, store.clock());
	console.info(`[queue] ${texts.length} → 0 ready (sent as the next turn)`);
	void answer(store, startTurn, { asked: texts.join("\n\n"), startedBy: "person" });
}

function sendQueueNow(store: SessionStore, startTurn: StartTurn): string | null {
	if (readyIn(store.session.queued).length === 0) {
		console.info("[queue] send now refused: nothing ready");
		return NOTHING_READY;
	}

	stop(store);
	sendQueue(store, startTurn);
	return null;
}

function handQueueToAgent(store: SessionStore): string | null {
	if (!store.session.busy || readyIn(store.session.queued).length === 0) {
		return null;
	}

	const texts = takeReadyTexts(store);
	store.session = heardMidTurn(store.session, texts, store.clock());
	console.info(`[queue] ${texts.length} → 0 ready (handed to the agent between steps)`);
	notify(store);
	const messages = texts.map(
		(text, messageIndex) => `${MESSAGE_HEAD.replace("{n}", String(messageIndex + 1))}\n${text}`,
	);
	return [HEARD_MID_TURN, ...messages].join("\n\n");
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
	return answer(store, startTurn, { asked: COMPACT_PROMPT, startedBy: "person" });
}

function answer(
	store: SessionStore,
	startTurn: StartTurn,
	{ asked, startedBy }: { readonly asked: string; readonly startedBy: TurnStarter },
): Promise<void> {
	notify(store);
	const generation = store.generation;
	const startedAt = store.clock();
	store.running = {
		id: `${startedAt}-${generation}`,
		isCompact: asked === COMPACT_PROMPT,
		startedBy,
		startedAt,
	};
	answerTurn(store, startTurn, { asked, generation, isRetryAfterLostResume: false }).catch((failed: unknown) =>
		failTurn(store, generation, failed),
	);
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
	void send(store, startTurn, { said: retried.asked, startedBy: "person" });
}

function stop(store: SessionStore): void {
	if (!store.session.busy) {
		return;
	}

	store.active?.run.stop();
	const stopped = endedTurn(store.session, "stopped", store.clock());
	settleNow(store, { ...stopped, failure: STOPPED });
	announceEnd(store, { ended: "stopped", failureKind: null, failure: null, resumesAt: null });
}
