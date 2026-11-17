import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import type { Send } from "@widgetarium/data-framework";
import { workspacesChanged } from "../../gateways/workspaces/workspaces.events.js";
import { currentWorkspaceChanged } from "../../gateways/current-workspace/current-workspace.events.js";
import { chatsChanged } from "../../gateways/chats/chats.events.js";
import { ChatsGateway } from "../../gateways/chats/chats.gateway.js";
import { titleOf, withCapitalFirst } from "../../shared/lib/chat-title.js";
import { currentWorkspaceOf } from "../../shared/lib/current-workspace.js";
import {
	ChatArchivingSchema,
	ChatIdSchema,
	ChatRecordsSchema,
	ChatRenamedSchema,
	ChatRenamingSchema,
	ChatToOpenSchema,
	ChatTurnSchema,
	NewChatSchema,
	WorkspaceCrumbSchema,
} from "../../shared/schema/chat.schema.js";
import type { KeptChat, KeptChats } from "../../shared/schema/chat.schema.js";
import { chatFacts } from "@sumi/chat-facts/contract";

const TITLE_MOST_CHARS = 80;

export const chatRecords = query()
	.public()
	.output(ChatRecordsSchema)
	.settlesNow()
	.handle((_input, { chats }) => ({
		isRead: chats.isLoaded(),
		chats: chats.chats().chats.map((chat) => ({
			id: chat.id,
			title: titleOf(chat),
			titleBy: chat.titleBy,
			lastAt: chat.lastAt,
			isArchived: chat.archivedAt !== null,
		})),
	}));

export const workspaceCrumb = query()
	.public()
	.output(WorkspaceCrumbSchema)
	.settlesNow()
	.handle((_input, { workspaces, currentWorkspace }) => ({
		workspace: currentWorkspaceOf(workspaces.workspaces(), currentWorkspace.currentWorkspace().currentId).name,
	}));

export const createChat = command()
	.public()
	.input(NewChatSchema)
	.output(ChatIdSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ title }, { chats, invalidate, send, ownWindow }) => {
		invalidate(chatRecords);
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
		await keepTabOf(send, chat, ownWindow.placesWindow());
		return { id: chat.id };
	});

export const forgetToOpen = command()
	.public()
	.input(ChatIdSchema)
	.idempotencyKey(Repeatable)
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

export const chatToOpen = query()
	.public()
	.output(ChatToOpenSchema)
	.settlesNow()
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

export const recordTurn = command()
	.public()
	.input(ChatTurnSchema)
	.idempotencyKey(Repeatable)
	.handle(async (turn, { chats, invalidate, send }) => {
		invalidate(chatRecords);
		const kept = chats.chats();
		const was = kept.chats.find((chat) => chat.id === turn.chatId);

		if (was === undefined) {
			console.info(`[widgetarium] chat turn of ${turn.chatId} skipped: no such chat in this workspace`);
			return;
		}

		const title = was.title ?? titleOfAsk(turn.firstAsked);
		const marks = await send(chatFacts.turns.recordTurn, {
			id: was.id,
			title,
			isBusy: turn.isBusy,
			isSeen: turn.isSeen,
		});
		const isStarting = turn.isBusy && marks.was !== null && marks.was !== "running";
		const now = chats.chats().chats.find((chat) => chat.id === was.id) ?? was;
		saveTurned(chats, now, chatAfterTurn(now, { title: now.title ?? title, isStarting }));
	});

export const renameChat = command()
	.public()
	.input(ChatRenamingSchema)
	.output(ChatRenamedSchema)
	.idempotencyKey(Repeatable)
	.handle(({ id, title: asked, by }, { chats, invalidate }) => {
		invalidate(chatRecords);
		const kept = chats.chats();
		const was = kept.chats.find((chat) => chat.id === id);
		const title = withCapitalFirst(asked);

		if (was === undefined) {
			return refuse(`no chat ${id} in this workspace`);
		}

		if (by === "auto" && was.titleBy === "person") {
			console.info(`[widgetarium] auto title of chat ${id} skipped: the person named it ${titleOf(was)}`);
			return { isRenamed: false };
		}

		if (was.title === title && was.titleBy === by) {
			return { isRenamed: false };
		}

		const reason = `chat ${id} title ${titleOf(was)} (${was.titleBy}) → ${title} (${by})`;
		chats.saveChats(withChat(kept, { ...was, title, titleBy: by }), reason);
		console.info(`[widgetarium] ${reason}`);
		return { isRenamed: true };
	});

export const archiveChat = command()
	.public()
	.input(ChatArchivingSchema)
	.idempotencyKey(Repeatable)
	.handle(({ id, isArchived }, { chats, invalidate }) => {
		invalidate(chatRecords);
		const kept = chats.chats();
		const was = kept.chats.find((chat) => chat.id === id);

		if (was === undefined) {
			return refuse(`no chat ${id} in this workspace`);
		}

		if ((was.archivedAt !== null) === isArchived) {
			console.info(`[widgetarium] chat ${id} archived ${isArchived} skipped: it is so already`);
			return;
		}

		const reason = `chat ${id} archived ${!isArchived} → ${isArchived}`;
		chats.saveChats(withChat(kept, { ...was, archivedAt: isArchived ? Date.now() : null }), reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const deleteChat = command()
	.public()
	.input(ChatIdSchema)
	.idempotencyKey(Repeatable)
	.handle(({ id }, { chats, invalidate }) => {
		invalidate(chatRecords);
		const kept = chats.chats();

		if (!kept.chats.some((chat) => chat.id === id)) {
			console.info(`[widgetarium] delete chat ${id} skipped: no such chat in this workspace`);
			return;
		}

		const reason = `chats ${kept.chats.length} → ${kept.chats.length - 1} (deleted chat ${id})`;
		chats.saveChats(
			{
				chats: kept.chats.filter((chat) => chat.id !== id),
				openOnStartId: kept.openOnStartId === id ? null : kept.openOnStartId,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const rereadChats = subscriber(chatsChanged).handle((_input, { invalidate }) => {
	invalidate(chatRecords);
	invalidate(chatToOpen);
});

export const rereadCrumbForWorkspaces = subscriber(workspacesChanged).handle((_input, { invalidate }) => {
	invalidate(workspaceCrumb);
});

export const rereadCrumbForCurrent = subscriber(currentWorkspaceChanged).handle((_input, { invalidate }) => {
	invalidate(workspaceCrumb);
});

async function keepTabOf(send: Send, chat: KeptChat, window: string): Promise<void> {
	try {
		await send(chatFacts.turns.keepChatTabs, { window, chats: [{ id: chat.id, title: chat.title }] });
	} catch (failure: unknown) {
		console.error(`[widgetarium] chat ${chat.id} kept with no tab yet; the next restore gives it one`, failure);
	}
}

function newChatOf(title: string | null): KeptChat {
	const at = Date.now();
	return {
		id: crypto.randomUUID(),
		title: title?.trim() || null,
		titleBy: "ask",
		createdAt: at,
		lastAt: at,
		archivedAt: null,
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

	const title = line.length <= TITLE_MOST_CHARS ? line : `${line.slice(0, TITLE_MOST_CHARS - 1).trimEnd()}…`;
	return withCapitalFirst(title);
}
