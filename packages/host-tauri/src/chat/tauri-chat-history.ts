import { z } from "zod";
import { AssistantTurnSchema } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantSession, AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";
import type { ChatHistory, KeptChat } from "../assistant/turn-session.js";
import { EMPTY_SESSION } from "../assistant/session-steps.js";
import { HeldDoc } from "../store/held-doc.js";
import { validValuesOf } from "../store/valid-entries.js";
import { workspaceRootOf } from "../store/store-client.js";
import type { DocKind, StoreClient, WorkspaceRoot } from "../store/store-client.js";

const TURNS_REOPENED = 400;

const LegacyIndexSchema = z.looseObject({
	currentId: z.string().nullable().catch(null),
	resumes: z.record(z.string(), z.string()).catch({}),
});

type LegacyIndex = z.infer<typeof LegacyIndexSchema>;

const LEGACY_INDEX: DocKind<LegacyIndex> = {
	file: "chat/index.json",
	v: 1,
	schema: LegacyIndexSchema,
};

const ChatSessionRecordSchema = z.object({
	logId: z.string().min(1),
	resumes: z.record(z.string(), z.string()).default({}),
});

type ChatSessionRecord = z.infer<typeof ChatSessionRecordSchema>;

const ChatSessionsDocSchema = z.looseObject({
	sessions: z.record(z.string(), ChatSessionRecordSchema).default({}),
});

type ChatSessionsDoc = z.infer<typeof ChatSessionsDocSchema>;

const CHAT_SESSIONS: DocKind<ChatSessionsDoc> = {
	file: "chat/sessions.json",
	v: 1,
	schema: ChatSessionsDocSchema,
	salvage: ChatSessionsDocSchema.extend({
		sessions: validValuesOf(
			ChatSessionRecordSchema.extend({
				resumes: z.record(z.string(), z.string()).catch({}),
			}),
		),
	}),
};

const TurnLineSchema = z.object({
	id: z.string().regex(/^\d+$/),
	turn: AssistantTurnSchema,
});

type TurnLine = z.infer<typeof TurnLineSchema>;

export interface LegacyChat {
	readonly id: string;
}

export interface TauriChatLogs {
	readonly sessions: HeldDoc<ChatSessionsDoc>;
	readonly legacyChat: LegacyChat | null;
	readonly historyOf: (chatId: string) => Promise<ChatHistory>;
}

interface ChatLogsAt {
	readonly store: StoreClient;
	readonly root: WorkspaceRoot;
	readonly sessions: HeldDoc<ChatSessionsDoc>;
}

interface ChatLog extends ChatLogsAt {
	readonly chatId: string;
	readonly turns: readonly AssistantTurn[];
}

export async function readChatLogs(store: StoreClient, workspaceId: string): Promise<TauriChatLogs> {
	const root = workspaceRootOf(workspaceId);
	const [sessions, legacy] = await Promise.all([
		HeldDoc.read({ store, root, kind: CHAT_SESSIONS, empty: ChatSessionsDocSchema.parse({}) }),
		store.readDoc(root, LEGACY_INDEX),
	]);
	return {
		sessions,
		legacyChat: legacyChatOf(sessions, legacy.doc),
		historyOf: (chatId) => readChatHistory({ store, root, sessions }, chatId),
	};
}

async function readChatHistory(logs: ChatLogsAt, chatId: string): Promise<ChatHistory> {
	const turns = await readKeptTurns(logs.store, logs.root, sessionOf(logs.sessions, chatId).logId);
	return new KeptChatHistory({ ...logs, chatId, turns });
}

function legacyChatOf(sessions: HeldDoc<ChatSessionsDoc>, legacy: LegacyIndex | null): LegacyChat | null {
	const id = legacy?.currentId ?? null;
	if (id === null || Object.keys(sessions.now().sessions).length > 0) {
		return null;
	}

	sessions.change(
		{ sessions: { [id]: { logId: id, resumes: legacy?.resumes ?? {} } } },
		`chat ${id} carried over from chat/index.json`,
	);
	return { id };
}

function sessionOf(sessions: HeldDoc<ChatSessionsDoc>, chatId: string): ChatSessionRecord {
	return sessions.now().sessions[chatId] ?? { logId: chatId, resumes: {} };
}

class KeptChatHistory implements ChatHistory {
	readonly kept: KeptChat;
	private logId: string;
	private written: readonly AssistantTurn[];

	constructor(private readonly log: ChatLog) {
		const session = sessionOf(log.sessions, log.chatId);
		this.logId = session.logId;
		this.written = log.turns;
		this.kept = {
			session: {
				...EMPTY_SESSION,
				turns: log.turns,
			},
			resumes: new Map(Object.entries(session.resumes)),
		};
	}

	settled(session: AssistantSession, resumes: ReadonlyMap<string, string>): void {
		this.appendChangedTurns(session);
		this.written = session.turns;
		this.keepSession(
			{ logId: this.logId, resumes: Object.fromEntries(resumes) },
			`chat ${this.log.chatId} at ${session.turns.length} turns`,
		);
	}

	cleared(): void {
		this.logId = crypto.randomUUID();
		this.written = [];
		this.keepSession({ logId: this.logId, resumes: {} }, `chat ${this.log.chatId} cleared`);
	}

	private appendChangedTurns(session: AssistantSession): void {
		if (session.busy) {
			return;
		}

		session.turns.forEach((turn, at) => {
			if (this.written[at] !== turn) {
				this.appendTurn(turn, at);
			}
		});
	}

	private appendTurn(turn: AssistantTurn, at: number): void {
		const line = {
			id: String(at),
			turn,
		};
		this.log.store.appendLine(this.log.root, chatFileOf(this.logId), line).catch((failure: unknown) => {
			console.error(`[ink] chat ${this.log.chatId} lost turn ${at}`, failure);
		});
	}

	private keepSession(session: ChatSessionRecord, reason: string): void {
		const { sessions, chatId } = this.log;
		sessions.change({ sessions: { ...sessions.now().sessions, [chatId]: session } }, reason);
	}
}

async function readKeptTurns(
	store: StoreClient,
	root: WorkspaceRoot,
	logId: string,
): Promise<readonly AssistantTurn[]> {
	const page = await store.readLines(root, {
		file: chatFileOf(logId),
		schema: TurnLineSchema,
		before: null,
		limit: TURNS_REOPENED,
	});
	return [...page.lines].sort(byTurnIndex).map((line) => line.turn);
}

function byTurnIndex(one: TurnLine, other: TurnLine): number {
	return Number(one.id) - Number(other.id);
}

function chatFileOf(logId: string): string {
	return `chat/${logId}.jsonl`;
}
