import { z } from "zod";
import type { AssistantSession, AssistantTurn, TurnRole } from "@widgetarium/core/engine/assistant-port.js";
import type { ChatHistory } from "../assistant/turn-session.js";
import { EMPTY_SESSION } from "../assistant/session-steps.js";
import { HeldDoc } from "../store/held-doc.js";
import { workspaceRootOf } from "../store/store-client.js";
import type { DocKind, StoreClient, WorkspaceRoot } from "../store/store-client.js";

const TURNS_REOPENED = 400;

const KEPT_ROLES: readonly TurnRole[] = ["user", "agent", "compact"];

const ChatIndexSchema = z.looseObject({
	currentId: z.string().nullable().catch(null),
	resumes: z.record(z.string(), z.string()).catch({}),
});

type ChatIndex = z.infer<typeof ChatIndexSchema>;

const CHAT_INDEX: DocKind<ChatIndex> = {
	file: "chat/index.json",
	v: 1,
	schema: ChatIndexSchema,
};

const TurnLineSchema = z.object({
	id: z.string().regex(/^\d+$/),
	turn: z.custom<AssistantTurn>(isTurn),
});

type TurnLine = z.infer<typeof TurnLineSchema>;

export interface TauriChatHistory extends ChatHistory {
	readonly index: HeldDoc<ChatIndex>;
}

export async function readChatHistory(store: StoreClient, workspaceId: string): Promise<TauriChatHistory> {
	const root = workspaceRootOf(workspaceId);
	const index = await HeldDoc.read({
		store,
		root,
		kind: CHAT_INDEX,
		empty: ChatIndexSchema.parse({}),
	});
	const sessionId = index.now().currentId ?? crypto.randomUUID();
	const turns = await keptTurns(store, root, sessionId);
	return chatHistoryOf({ store, root, index, sessionId, turns });
}

interface ChatLog {
	readonly store: StoreClient;
	readonly root: WorkspaceRoot;
	readonly index: HeldDoc<ChatIndex>;
	readonly sessionId: string;
	readonly turns: readonly AssistantTurn[];
}

function chatHistoryOf(log: ChatLog): TauriChatHistory {
	const held = {
		sessionId: log.sessionId,
		written: log.turns,
	};
	return {
		index: log.index,
		kept: {
			session: {
				...EMPTY_SESSION,
				turns: log.turns,
			},
			resumes: new Map(Object.entries(log.index.now().resumes)),
		},
		settled: (session, resumes) => {
			writeChangedTurns(log, held.sessionId, held.written, session);
			held.written = session.turns;
			log.index.change(
				{
					currentId: held.sessionId,
					resumes: Object.fromEntries(resumes),
				},
				`chat ${held.sessionId} at ${session.turns.length} turns`,
			);
		},
		cleared: () => {
			held.sessionId = crypto.randomUUID();
			held.written = [];
			log.index.change({ currentId: held.sessionId, resumes: {} }, "chat cleared");
		},
	};
}

function writeChangedTurns(
	log: ChatLog,
	sessionId: string,
	written: readonly AssistantTurn[],
	session: AssistantSession,
): void {
	if (session.busy) {
		return;
	}

	session.turns.forEach((turn, at) => {
		if (written[at] === turn) {
			return;
		}

		const line = {
			id: String(at),
			turn,
		};
		log.store.appendLine(log.root, chatFileOf(sessionId), line).catch((failure: unknown) => {
			console.error(`[ink] chat ${sessionId} lost turn ${at}`, failure);
		});
	});
}

async function keptTurns(
	store: StoreClient,
	root: WorkspaceRoot,
	sessionId: string,
): Promise<readonly AssistantTurn[]> {
	const page = await store.readLines(root, {
		file: chatFileOf(sessionId),
		schema: TurnLineSchema,
		before: null,
		limit: TURNS_REOPENED,
	});
	return [...page.lines].sort(byTurnIndex).map((line) => line.turn);
}

function byTurnIndex(one: TurnLine, other: TurnLine): number {
	return Number(one.id) - Number(other.id);
}

function chatFileOf(sessionId: string): string {
	return `chat/${sessionId}.jsonl`;
}

function isTurn(held: unknown): held is AssistantTurn {
	if (typeof held !== "object" || held === null) {
		return false;
	}

	const role: unknown = Reflect.get(held, "role");
	const text: unknown = Reflect.get(held, "text");
	const calls: unknown = Reflect.get(held, "calls");
	return KEPT_ROLES.some((kept) => kept === role) && typeof text === "string" && Array.isArray(calls);
}
