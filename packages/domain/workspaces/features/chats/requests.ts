import { PerCall, Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import { WorkspacesChangedEvent } from "../../gateways/workspaces/workspaces.events.js";
import { CurrentWorkspaceChangedEvent } from "../../gateways/current-workspace/current-workspace.events.js";
import { ChatsChangedEvent } from "../../gateways/chats/chats.events.js";
import { ChatMarksChangedEvent } from "../../gateways/chat-marks/chat-marks.events.js";
import { ChatMarksGateway } from "../../gateways/chat-marks/chat-marks.gateway.js";
import { ChatsGateway } from "../../gateways/chats/chats.gateway.js";
import { CurrentWorkspaceGateway } from "../../gateways/current-workspace/current-workspace.gateway.js";
import { WorkspacesGateway } from "../../gateways/workspaces/workspaces.gateway.js";
import { titleOf } from "../../shared/lib/chat-title.js";
import { currentWorkspaceOf } from "../../shared/lib/current-workspace.js";
import {
	ActiveChatSchema,
	ChatCrumbSchema,
	ChatIdSchema,
	ChatListSchema,
	ChatPinSchema,
	ChatTitleSchema,
	ChatTurnSchema,
} from "../../shared/schema/chat.schema.js";
import type {
	ChatListData,
	ChatMarkKind,
	ChatMarks,
	ChatRowData,
	ChatTurn,
	KeptChat,
	KeptChats,
} from "../../shared/schema/chat.schema.js";

const TITLE_MOST_CHARS = 80;
const UNKNOWN = "There is no chat {id}.";
const NO_TITLE = "A chat needs a title.";

export const ChatListQuery = query("chat-list")
	.output(ChatListSchema)
	.settlesNow()
	.inject({
		chats: ChatsGateway,
		chatMarks: ChatMarksGateway,
	})
	.handle((_input, { chats, chatMarks }) => chatListOf(chats.chats(), chatMarks.chatMarks()));

export const ActiveChatQuery = query("active-chat")
	.output(ActiveChatSchema)
	.settlesNow()
	.inject({ chats: ChatsGateway })
	.handle((_input, { chats }) => {
		const active = activeChatOf(chats.chats());
		return {
			id: active.id,
			title: titleOf(active),
		};
	});

export const ChatCrumbQuery = query("chat-crumb")
	.output(ChatCrumbSchema)
	.settlesNow()
	.inject({
		chats: ChatsGateway,
		workspaces: WorkspacesGateway,
		currentWorkspace: CurrentWorkspaceGateway,
	})
	.handle((_input, { chats, workspaces, currentWorkspace }) => ({
		workspace: currentWorkspaceOf(workspaces.workspaces(), currentWorkspace.currentWorkspace().currentId).name,
		chat: titleOf(activeChatOf(chats.chats())),
	}));

export const CreateChatCommand = command("create-chat")
	.idempotencyKey(PerCall)
	.inject({ chats: ChatsGateway })
	.handle((_input, { chats, invalidate }) => {
		invalidate(ChatListQuery);
		invalidate(ChatCrumbQuery);
		invalidate(ActiveChatQuery);
		const kept = chats.chats();
		const at = Date.now();
		const chat: KeptChat = {
			id: crypto.randomUUID(),
			title: null,
			isPinned: false,
			createdAt: at,
			lastAt: at,
		};
		const reason = `chats ${kept.chats.length} → ${kept.chats.length + 1}, active ${kept.activeId ?? "none"} → ${chat.id} (new chat)`;
		chats.saveChats(
			{
				chats: [...kept.chats, chat],
				activeId: chat.id,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const SelectChatCommand = command("select-chat")
	.input(ChatIdSchema)
	.idempotencyKey(Repeatable)
	.inject({
		chats: ChatsGateway,
		chatMarks: ChatMarksGateway,
	})
	.handle(({ id }, { chats, chatMarks, invalidate }) => {
		invalidate(ChatListQuery);
		invalidate(ChatCrumbQuery);
		invalidate(ActiveChatQuery);
		const kept = chats.chats();
		chatIn(kept, id);
		clearMark(chatMarks, id);
		const was = activeChatOf(kept).id;

		if (was === id) {
			console.info(`[widgetarium] select chat ${id} skipped: it is the active one`);
			return;
		}

		const reason = `chat active ${was} → ${id} (selected)`;
		chats.saveChats(
			{
				...kept,
				activeId: id,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const PinChatCommand = command("pin-chat")
	.input(ChatPinSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle(({ id, isPinned }, { chats, invalidate }) => {
		invalidate(ChatListQuery);
		invalidate(ChatCrumbQuery);
		invalidate(ActiveChatQuery);
		const kept = chats.chats();
		const was = chatIn(kept, id);

		if (was.isPinned === isPinned) {
			console.info(`[widgetarium] pin chat ${id} skipped: already ${isPinned ? "pinned" : "unpinned"}`);
			return;
		}

		const reason = `chat ${id} pinned ${String(was.isPinned)} → ${String(isPinned)}`;
		chats.saveChats(
			withChat(kept, {
				...was,
				isPinned,
			}),
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const RenameChatCommand = command("rename-chat")
	.input(ChatTitleSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle(({ id, title }, { chats, invalidate }) => {
		invalidate(ChatListQuery);
		invalidate(ChatCrumbQuery);
		invalidate(ActiveChatQuery);
		const trimmed = title.trim();

		if (trimmed === "") {
			return refuse(NO_TITLE);
		}

		const kept = chats.chats();
		const was = chatIn(kept, id);

		if (was.title === trimmed) {
			console.info(`[widgetarium] rename chat ${id} skipped: already ${trimmed}`);
			return;
		}

		const reason = `chat ${id} title ${titleOf(was)} → ${trimmed}`;
		chats.saveChats(
			withChat(kept, {
				...was,
				title: trimmed,
			}),
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const RecordChatTurnCommand = command("record-chat-turn")
	.input(ChatTurnSchema)
	.idempotencyKey(Repeatable)
	.inject({
		chats: ChatsGateway,
		chatMarks: ChatMarksGateway,
	})
	.handle((turn, { chats, chatMarks, invalidate }) => {
		invalidate(ChatListQuery);
		invalidate(ChatCrumbQuery);
		invalidate(ActiveChatQuery);
		const kept = chats.chats();
		const was = kept.chats.find((chat) => chat.id === turn.chatId);

		if (was === undefined) {
			return;
		}

		const marks = chatMarks.chatMarks();
		const mark = markOf(marks, turn.chatId);
		const now = chatAfterTurn(was, turn, mark);
		const nextMark = markAfter(mark, turn.isBusy, turn.chatId === activeChatOf(kept).id);

		if (JSON.stringify(now) !== JSON.stringify(was)) {
			const reason = `chat ${was.id} title ${titleOf(was)} → ${titleOf(now)}, last ${was.lastAt} → ${now.lastAt} (turn)`;
			chats.saveChats(withChat(kept, now), reason);
			console.info(`[widgetarium] ${reason}`);
		}

		if (nextMark !== mark) {
			const reason = `chat ${was.id} mark ${mark} → ${nextMark} (turn)`;
			chatMarks.saveChatMarks(withMark(marks, was.id, nextMark), reason);
			console.info(`[widgetarium] ${reason}`);
		}
	});

export const RereadChatsSubscriber = subscriber(ChatsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
	invalidate(ActiveChatQuery);
	invalidate(ChatCrumbQuery);
});

export const RereadChatListSubscriber = subscriber(ChatMarksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
});

export const RereadChatCrumbForWorkspacesSubscriber = subscriber(WorkspacesChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(ChatCrumbQuery);
	},
);

export const RereadChatCrumbForCurrentSubscriber = subscriber(CurrentWorkspaceChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(ChatCrumbQuery);
	},
);

function clearMark(chatMarks: ChatMarksGateway, id: string): void {
	const marks = chatMarks.chatMarks();
	const mark = markOf(marks, id);

	if (mark === "none") {
		return;
	}

	const reason = `chat ${id} mark ${mark} → none (selected)`;
	chatMarks.saveChatMarks(withMark(marks, id, "none"), reason);
	console.info(`[widgetarium] ${reason}`);
}

function chatListOf(kept: KeptChats, marks: ChatMarks): ChatListData {
	const activeId = activeChatOf(kept).id;
	const rowOf = (chat: KeptChat): ChatRowData => ({
		id: chat.id,
		title: titleOf(chat),
		isPinned: chat.isPinned,
		isActive: chat.id === activeId,
		mark: markOf(marks, chat.id),
	});
	const latestFirst = [...kept.chats].sort((one, other) => other.lastAt - one.lastAt);
	return {
		pinned: latestFirst.filter((chat) => chat.isPinned).map(rowOf),
		recents: latestFirst.filter((chat) => !chat.isPinned).map(rowOf),
	};
}

function activeChatOf({ chats, activeId }: KeptChats): KeptChat {
	const active = chats.find((chat) => chat.id === activeId) ?? latestOf(chats);

	if (active === null) {
		throw new Error("the chats gateway always holds one chat");
	}

	return active;
}

function latestOf(chats: readonly KeptChat[]): KeptChat | null {
	return chats.reduce<KeptChat | null>(
		(latest, chat) => (latest === null || chat.lastAt > latest.lastAt ? chat : latest),
		null,
	);
}

function chatIn(kept: KeptChats, id: string): KeptChat {
	const found = kept.chats.find((chat) => chat.id === id);
	return found ?? refuse(UNKNOWN.replace("{id}", id));
}

function withChat(kept: KeptChats, changed: KeptChat): KeptChats {
	return {
		chats: kept.chats.map((chat) => (chat.id === changed.id ? changed : chat)),
		activeId: activeChatOf(kept).id,
	};
}

function markOf(marks: ChatMarks, id: string): ChatMarkKind {
	return marks[id] ?? "none";
}

function withMark(marks: ChatMarks, id: string, mark: ChatMarkKind): ChatMarks {
	const others = Object.entries(marks).filter(([held]) => held !== id);
	return Object.fromEntries(mark === "none" ? others : [...others, [id, mark]]);
}

function chatAfterTurn(chat: KeptChat, { isBusy, firstAsked }: ChatTurn, mark: ChatMarkKind): KeptChat {
	return {
		...chat,
		title: chat.title ?? titleOfAsk(firstAsked),
		lastAt: isBusy && mark !== "running" ? Date.now() : chat.lastAt,
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

function markAfter(mark: ChatMarkKind, isBusy: boolean, isActive: boolean): ChatMarkKind {
	if (isBusy) {
		return "running";
	}

	if (mark === "running") {
		return isActive ? "none" : "unread";
	}

	return mark;
}
