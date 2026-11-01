import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import { ONE_CHAT } from "@widgetarium/core/engine/focused-chat-port.js";
import type { FocusedChatPort } from "@widgetarium/core/engine/focused-chat-port.js";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import type { ChatQuestions } from "./chat-questions.js";
import { NO_CHAT_TASKS } from "./chat-tasks.js";
import type { ChatTasks, Nudge } from "./chat-tasks.js";
import { EMPTY_SESSION } from "./session-steps.js";
import { NO_CHAT_HISTORY, createTurnSession } from "./turn-session.js";
import type { ChatHistory, SettledTurn, StartTurn, TurnListener, TurnSession } from "./turn-session.js";

export type StartChatTurn = (chatId: string, ...asked: Parameters<StartTurn>) => ReturnType<StartTurn>;

export interface ChatSessionLink {
	readonly focusedChat: FocusedChatPort;
	readonly onSessionChanged: (chatId: string, session: AssistantSession) => void;
	readonly tasks?: ChatTasks;
	readonly questions?: ChatQuestions;
}

export interface ChatsLink extends ChatSessionLink {
	readonly historyOf: (chatId: string) => Promise<ChatHistory>;
}

const NO_FOCUSED_CHAT = "no chat stands on this window's board";
const CHAT_GONE = "the chat is gone";
const WRITING_IN_IT = "you were writing in it";

export const ONE_CHAT_LINK: ChatsLink = {
	focusedChat: ONE_CHAT,
	historyOf: () => Promise.resolve(NO_CHAT_HISTORY),
	onSessionChanged: () => undefined,
};

export class ChatSessions {
	private readonly ready = new Map<string, TurnSession>();
	private readonly loading = new Map<string, Promise<TurnSession>>();
	private readonly watchers = new Set<() => void>();
	private readonly chatWatchers = new Map<string, Set<() => void>>();
	private readonly draftReaders = new Set<(chatId: string) => boolean>();
	private readonly tasks: ChatTasks;

	constructor(
		private readonly link: ChatsLink,
		private readonly startTurn: StartChatTurn,
		private readonly clock: () => number = Date.now,
	) {
		this.tasks = link.tasks ?? NO_CHAT_TASKS;
		link.focusedChat.watch(() => this.followFocused());
	}

	now = (): AssistantSession => this.shownIfReady()?.now() ?? EMPTY_SESSION;

	watch = (changed: () => void): (() => void) => {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	};

	nowOf(chatId: string): AssistantSession {
		return this.ready.get(chatId)?.now() ?? EMPTY_SESSION;
	}

	watchChat(chatId: string, changed: () => void): () => void {
		const watchers = this.chatWatchers.get(chatId) ?? new Set<() => void>();
		watchers.add(changed);
		this.chatWatchers.set(chatId, watchers);
		this.sessionOf(chatId).catch((failure: unknown) => {
			console.error(`[ink] chat ${chatId} could not be read`, failure);
		});
		return () => void watchers.delete(changed);
	}

	lendDrafts(isDrafted: (chatId: string) => boolean): void {
		this.draftReaders.add(isDrafted);
	}

	readyOf(chatId: string): TurnSession | null {
		return this.ready.get(chatId) ?? null;
	}

	shownSession(): Promise<TurnSession> {
		const shownId = this.shownId();
		return shownId === null ? Promise.reject(new Error(NO_FOCUSED_CHAT)) : this.sessionOf(shownId);
	}

	async readShown(): Promise<void> {
		const shownId = this.shownId();

		if (shownId === null) {
			return;
		}

		await this.sessionOf(shownId);
	}

	shownIfReady(): TurnSession | null {
		const shownId = this.shownId();
		return shownId === null ? null : (this.ready.get(shownId) ?? null);
	}

	private shownId(): string | null {
		return this.link.focusedChat.now()?.id ?? null;
	}

	private followFocused(): void {
		const shownId = this.shownId();
		this.tell();

		if (shownId === null) {
			return;
		}

		this.sessionOf(shownId).catch((failure: unknown) => {
			console.error(`[ink] chat ${shownId} could not be read`, failure);
		});
	}

	sessionOf(chatId: string): Promise<TurnSession> {
		const ready = this.ready.get(chatId);
		if (ready !== undefined) {
			return Promise.resolve(ready);
		}

		const loading = this.loading.get(chatId) ?? this.load(chatId);
		this.loading.set(chatId, loading);
		return loading;
	}

	private async load(chatId: string): Promise<TurnSession> {
		try {
			return this.startSession(chatId, await this.link.historyOf(chatId));
		} finally {
			this.loading.delete(chatId);
		}
	}

	private startSession(chatId: string, history: ChatHistory): TurnSession {
		const session = createTurnSession((...asked) => this.startTurn(chatId, ...asked), {
			clock: this.clock,
			history,
			listener: this.turnListenerOf(chatId),
		});
		session.watch(() => {
			this.link.onSessionChanged(chatId, session.now());
			this.tellIfShown(chatId);
		});
		this.ready.set(chatId, session);
		this.link.onSessionChanged(chatId, session.now());
		console.info(`[ink] chat ${chatId} opened with ${session.now().turns.length} turns`);
		this.tellIfShown(chatId);
		return session;
	}

	private turnListenerOf(chatId: string): TurnListener {
		return {
			settled: (turn) => void this.settleTasks(chatId, turn),
			cleared: () => void this.tasks.release(chatId, "cleared"),
		};
	}

	private isDrafted(chatId: string): boolean {
		return [...this.draftReaders].some((isDrafted) => isDrafted(chatId));
	}

	private async settleTasks(chatId: string, turn: SettledTurn): Promise<void> {
		const nudge = await this.tasks.settle(chatId, turn, {
			isDrafted: this.isDrafted(chatId),
			isBusy: this.ready.get(chatId)?.now().busy ?? false,
		});

		if (nudge !== null) {
			this.sendNudge(chatId, turn.turn, nudge);
		}
	}

	private sendNudge(chatId: string, turn: string, nudge: Nudge): void {
		const session = this.ready.get(chatId);

		if (session === undefined) {
			void this.tasks.unsent(nudge, CHAT_GONE);
			return;
		}

		const noNudgeReason = noNudgeReasonOf(session, turn);

		if (noNudgeReason !== null) {
			console.info(`[tasks] chat ${chatId}: turn ${turn} left ${nudge.task} in progress → no nudge (${noNudgeReason})`);
			return;
		}

		if (this.isDrafted(chatId)) {
			void this.tasks.unsent(nudge, WRITING_IN_IT);
			return;
		}

		console.info(`[tasks] chat ${chatId}: turn ${turn} ended with ${nudge.task} in progress → nudged`);
		session.sendFromHost(nudge.message).catch((failure: unknown) => {
			console.warn(`[tasks] chat ${chatId}: the nudge was not sent`, failure);
			void this.tasks.unsent(nudge, failureMessage(failure));
		});
	}

	private tellIfShown(chatId: string): void {
		for (const changed of [...(this.chatWatchers.get(chatId) ?? [])]) {
			changed();
		}

		if (chatId === this.shownId()) {
			this.tell();
		}
	}

	private tell(): void {
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function noNudgeReasonOf(session: TurnSession, turn: string): string | null {
	if (session.now().busy) {
		return "the chat is answering again; that turn settles it";
	}

	return session.lastEndedTurn() === turn ? null : "the chat was cleared or a newer turn ended";
}
