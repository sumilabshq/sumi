import { ONE_CHAT } from "@widgetarium/core/engine/active-chat-port.js";
import type { ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { EMPTY_SESSION } from "./session-steps.js";
import { NO_CHAT_HISTORY, createTurnSession } from "./turn-session.js";
import type { ChatHistory, StartTurn, TurnSession } from "./turn-session.js";

export type StartChatTurn = (chatId: string, ...asked: Parameters<StartTurn>) => ReturnType<StartTurn>;

export interface ChatSessionLink {
	readonly activeChat: ActiveChatPort;
	readonly onSessionChanged: (chatId: string, session: AssistantSession) => void;
}

export interface ChatsLink extends ChatSessionLink {
	readonly historyOf: (chatId: string) => Promise<ChatHistory>;
}

export const ONE_CHAT_LINK: ChatsLink = {
	activeChat: ONE_CHAT,
	historyOf: () => Promise.resolve(NO_CHAT_HISTORY),
	onSessionChanged: () => undefined,
};

export class ChatSessions {
	private readonly ready = new Map<string, TurnSession>();
	private readonly loading = new Map<string, Promise<TurnSession>>();
	private readonly watchers = new Set<() => void>();

	constructor(
		private readonly link: ChatsLink,
		private readonly startTurn: StartChatTurn,
		private readonly clock: () => number = Date.now,
	) {
		link.activeChat.watch(() => this.followActive());
	}

	now = (): AssistantSession => this.ready.get(this.shownId())?.now() ?? EMPTY_SESSION;

	watch = (changed: () => void): (() => void) => {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	};

	shownSession(): Promise<TurnSession> {
		return this.sessionOf(this.shownId());
	}

	shownIfReady(): TurnSession | null {
		return this.ready.get(this.shownId()) ?? null;
	}

	private shownId(): string {
		return this.link.activeChat.now().id;
	}

	private followActive(): void {
		const activeId = this.shownId();
		this.tell();
		this.sessionOf(activeId).catch((failure: unknown) => {
			console.error(`[ink] chat ${activeId} could not be read`, failure);
		});
	}

	private sessionOf(chatId: string): Promise<TurnSession> {
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
		const session = createTurnSession((...asked) => this.startTurn(chatId, ...asked), this.clock, history);
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

	private tellIfShown(chatId: string): void {
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
