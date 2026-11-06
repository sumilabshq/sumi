import { PerCall, Repeatable, command, query, subscriber } from "@widgetarium/framework";
import type { Send } from "@widgetarium/framework";
import { KeepChatTabsCommand, RecordTabTurnCommand } from "@widgetarium/places";
import { WorkspacesChangedEvent } from "../../gateways/workspaces/workspaces.events.js";
import { CurrentWorkspaceChangedEvent } from "../../gateways/current-workspace/current-workspace.events.js";
import { ChatsChangedEvent } from "../../gateways/chats/chats.events.js";
import { ChatsGateway } from "../../gateways/chats/chats.gateway.js";
import { CurrentWorkspaceGateway } from "../../gateways/current-workspace/current-workspace.gateway.js";
import { WorkspacesGateway } from "../../gateways/workspaces/workspaces.gateway.js";
import { titleOf } from "../../shared/lib/chat-title.js";
import { currentWorkspaceOf } from "../../shared/lib/current-workspace.js";
import {
	ChatIdSchema,
	ChatRecordsSchema,
	ChatToOpenSchema,
	ChatTurnSchema,
	NewChatSchema,
	WorkspaceCrumbSchema,
} from "../../shared/schema/chat.schema.js";
import type { KeptChat, KeptChats } from "../../shared/schema/chat.schema.js";

const TITLE_MOST_CHARS = 80;

export const ChatRecordsQuery = query("chat-records")
	.output(ChatRecordsSchema)
	.settlesNow()
	.inject({ chats: ChatsGateway })
	.handle((_input, { chats }) => ({
		isRead: chats.isLoaded(),
		chats: chats.chats().chats.map((chat) => ({
			id: chat.id,
			title: titleOf(chat),
			lastAt: chat.lastAt,
		})),
	}));

export const WorkspaceCrumbQuery = query("workspace-crumb")
	.output(WorkspaceCrumbSchema)
	.settlesNow()
	.inject({
		workspaces: WorkspacesGateway,
		currentWorkspace: CurrentWorkspaceGateway,
	})
	.handle((_input, { workspaces, currentWorkspace }) => ({
		workspace: currentWorkspaceOf(workspaces.workspaces(), currentWorkspace.currentWorkspace().currentId).name,
	}));

export const CreateChatCommand = command("create-chat")
	.input(NewChatSchema)
	.output(ChatIdSchema)
	.idempotencyKey(PerCall)
	.inject({ chats: ChatsGateway })
	.handle(async ({ title }, { chats, invalidate, send }) => {
		invalidate(ChatRecordsQuery);
		const kept = chats.chats();
		const chat = newChatOf(title);
		const reason = `chats ${kept.chats.length} → ${kept.chats.length + 1} (new chat ${chat.id})`;
		chats.saveChats(
			{
				...kept,
				chats: [...kept.chats, chat],
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
		await keepTabOf(send, chat);
		return { id: chat.id };
	});

export const ForgetChatToOpenCommand = command("forget-chat-to-open")
	.input(ChatIdSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle(({ id }, { chats }) => {
		const kept = chats.chats();

		if (kept.openOnStartId !== id) {
			console.info(
				`[widgetarium] forget chat to open ${id} skipped: the one asked now is ${kept.openOnStartId ?? "none"}`,
			);
			return;
		}

		const reason = `chat to open on start ${kept.openOnStartId} → none (opened)`;
		chats.saveChats(
			{
				...kept,
				openOnStartId: null,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const ChatToOpenQuery = query("chat-to-open")
	.output(ChatToOpenSchema)
	.settlesNow()
	.inject({ chats: ChatsGateway })
	.handle((_input, { chats }) => {
		if (!chats.isLoaded()) {
			return {
				isRead: false,
				id: null,
			};
		}

		const { chats: held, openOnStartId } = chats.chats();
		return {
			isRead: true,
			id: held.some((chat) => chat.id === openOnStartId) ? openOnStartId : null,
		};
	});

export const RecordChatTurnCommand = command("record-chat-turn")
	.input(ChatTurnSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle(async (turn, { chats, invalidate, send }) => {
		invalidate(ChatRecordsQuery);
		const kept = chats.chats();
		const was = kept.chats.find((chat) => chat.id === turn.chatId);

		if (was === undefined) {
			console.info(`[widgetarium] chat turn of ${turn.chatId} skipped: no such chat in this workspace`);
			return;
		}

		const title = was.title ?? titleOfAsk(turn.firstAsked);
		const marks = await send(RecordTabTurnCommand, { id: was.id, title, isBusy: turn.isBusy, isSeen: turn.isSeen });
		const isStarting = turn.isBusy && marks.was !== null && marks.was !== "running";
		const now = chats.chats().chats.find((chat) => chat.id === was.id) ?? was;
		saveTurned(chats, now, chatAfterTurn(now, { title: now.title ?? title, isStarting }));
	});

export const RereadChatsSubscriber = subscriber(ChatsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatRecordsQuery);
	invalidate(ChatToOpenQuery);
});

export const RereadCrumbForWorkspacesSubscriber = subscriber(WorkspacesChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(WorkspaceCrumbQuery);
	},
);

export const RereadCrumbForCurrentSubscriber = subscriber(CurrentWorkspaceChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(WorkspaceCrumbQuery);
	},
);

async function keepTabOf(send: Send, chat: KeptChat): Promise<void> {
	try {
		await send(KeepChatTabsCommand, { chats: [{ id: chat.id, title: chat.title }] });
	} catch (failure: unknown) {
		console.error(`[widgetarium] chat ${chat.id} kept with no tab yet; the next restore gives it one`, failure);
	}
}

function newChatOf(title: string | null): KeptChat {
	const at = Date.now();
	return {
		id: crypto.randomUUID(),
		title: title?.trim() || null,
		createdAt: at,
		lastAt: at,
	};
}

function saveTurned(chats: ChatsGateway, was: KeptChat, now: KeptChat): void {
	if (now.title === was.title && now.lastAt === was.lastAt) {
		return;
	}

	const reason = `chat ${was.id} title ${titleOf(was)} → ${titleOf(now)}, last ${was.lastAt} → ${now.lastAt} (turn)`;
	chats.saveChats(withChat(chats.chats(), now), reason);
	console.info(`[widgetarium] ${reason}`);
}

function withChat(kept: KeptChats, changed: KeptChat): KeptChats {
	return {
		...kept,
		chats: kept.chats.map((chat) => (chat.id === changed.id ? changed : chat)),
	};
}

interface TurnChange {
	readonly title: string | null;
	readonly isStarting: boolean;
}

function chatAfterTurn(chat: KeptChat, { title, isStarting }: TurnChange): KeptChat {
	return {
		...chat,
		title,
		lastAt: isStarting ? Date.now() : chat.lastAt,
	};
}

function titleOfAsk(asked: string | null): string | null {
	const [firstLine = ""] = (asked ?? "").trim().split("\n");
	const line = firstLine.trim();

	if (line === "") {
		return null;
	}

	return line.length <= TITLE_MOST_CHARS ? line : `${line.slice(0, TITLE_MOST_CHARS - 1).trimEnd()}…`;
}
