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
	ChatIdSchema,
	ChatToOpenSchema,
	ChatListSchema,
	ChatPinSchema,
	ChatPlaceSchema,
	ChatTitleSchema,
	ChatTurnSchema,
	NewChatSchema,
	WorkspaceCrumbSchema,
} from "../../shared/schema/chat.schema.js";
import type {
	ChatListData,
	ChatMarkKind,
	ChatMarks,
	ChatPlace,
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
	.handle(({ title }, { chats, invalidate }) => {
		invalidate(ChatListQuery);
		const kept = chats.chats();
		const at = Date.now();
		const chat: KeptChat = {
			id: crypto.randomUUID(),
			title: title?.trim() || null,
			isPinned: false,
			createdAt: at,
			lastAt: at,
		};
		const reason = `chats ${kept.chats.length} → ${kept.chats.length + 1} (new chat ${chat.id})`;
		chats.saveChats(
			{
				...kept,
				chats: [...kept.chats, chat],
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
		return { id: chat.id };
	});

export const MarkChatSeenCommand = command("mark-chat-seen")
	.input(ChatIdSchema)
	.idempotencyKey(Repeatable)
	.inject({
		chats: ChatsGateway,
		chatMarks: ChatMarksGateway,
	})
	.handle(({ id }, { chats, chatMarks, invalidate }) => {
		invalidate(ChatListQuery);
		chatIn(chats.chats(), id);
		clearMark(chatMarks, id);
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

export const PinChatCommand = command("pin-chat")
	.input(ChatPinSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle(({ id, isPinned }, { chats, invalidate }) => {
		invalidate(ChatListQuery);
		const was = chatIn(chats.chats(), id);

		if (was.isPinned === isPinned) {
			console.info(`[widgetarium] pin chat ${id} skipped: already ${isPinned ? "pinned" : "unpinned"}`);
			return;
		}

		savePinnedOrder(chats, {
			id,
			to: isPinned ? { list: "pinned", before: null } : { list: "recents" },
		});
	});

export const PlaceChatCommand = command("place-chat")
	.input(ChatPlaceSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle((place, { chats, invalidate }) => {
		invalidate(ChatListQuery);
		savePinnedOrder(chats, place);
	});

export const RenameChatCommand = command("rename-chat")
	.input(ChatTitleSchema)
	.idempotencyKey(Repeatable)
	.inject({ chats: ChatsGateway })
	.handle(({ id, title }, { chats, invalidate }) => {
		invalidate(ChatListQuery);
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
		const kept = chats.chats();
		const was = kept.chats.find((chat) => chat.id === turn.chatId);

		if (was === undefined) {
			return;
		}

		const marks = chatMarks.chatMarks();
		const mark = markOf(marks, turn.chatId);
		const now = chatAfterTurn(was, turn, mark);
		const nextMark = markAfter(mark, turn.isBusy, turn.isSeen);

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
	invalidate(ChatToOpenQuery);
});

export const RereadChatListSubscriber = subscriber(ChatMarksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatListQuery);
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
	const rowOf = (chat: KeptChat): ChatRowData => ({
		id: chat.id,
		title: titleOf(chat),
		isPinned: chat.isPinned,
		mark: markOf(marks, chat.id),
	});
	const latestFirst = [...kept.chats].sort((one, other) => other.lastAt - one.lastAt);
	return {
		pinned: pinnedChatsOf(kept).map(rowOf),
		recents: latestFirst.filter((chat) => !chat.isPinned).map(rowOf),
	};
}

function savePinnedOrder(chats: ChatsGateway, place: ChatPlace): void {
	const kept = chats.chats();
	chatIn(kept, place.id);
	const before = pinnedChatsOf(kept).map((chat) => chat.id);
	const after = pinnedIdsWithPlace(before, place);

	if (before.join() === after.join()) {
		console.info(`[widgetarium] place chat ${place.id} skipped: nothing moves`);
		return;
	}

	const reason = `pinned chats [${before.join(", ")}] → [${after.join(", ")}] (chat ${place.id} to ${place.to.list})`;
	chats.saveChats(withPinnedOrder(kept, after), reason);
	console.info(`[widgetarium] ${reason}`);
}

function pinnedChatsOf({ chats }: KeptChats): readonly KeptChat[] {
	const rankOf = (chat: KeptChat): number => chat.pinRank ?? Number.MAX_SAFE_INTEGER;
	return chats
		.filter((chat) => chat.isPinned)
		.sort((one, other) => rankOf(one) - rankOf(other) || other.lastAt - one.lastAt);
}

function pinnedIdsWithPlace(pinnedIds: readonly string[], { id, to }: ChatPlace): readonly string[] {
	const others = pinnedIds.filter((one) => one !== id);

	if (to.list === "recents") {
		return others;
	}

	const at = to.before === null ? -1 : others.indexOf(to.before);
	return at === -1 ? [...others, id] : [...others.slice(0, at), id, ...others.slice(at)];
}

function withPinnedOrder(kept: KeptChats, pinnedIds: readonly string[]): KeptChats {
	return {
		...kept,
		chats: kept.chats.map((chat) => {
			const rank = pinnedIds.indexOf(chat.id);
			return rank === -1 ? withoutPinRank(chat) : { ...chat, isPinned: true, pinRank: rank };
		}),
	};
}

function withoutPinRank({ pinRank: _rank, ...chat }: KeptChat): KeptChat {
	return {
		...chat,
		isPinned: false,
	};
}

function chatIn(kept: KeptChats, id: string): KeptChat {
	const found = kept.chats.find((chat) => chat.id === id);
	return found ?? refuse(UNKNOWN.replace("{id}", id));
}

function withChat(kept: KeptChats, changed: KeptChat): KeptChats {
	return {
		...kept,
		chats: kept.chats.map((chat) => (chat.id === changed.id ? changed : chat)),
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

function markAfter(mark: ChatMarkKind, isBusy: boolean, isSeen: boolean): ChatMarkKind {
	if (isBusy) {
		return "running";
	}

	if (mark === "running") {
		return isSeen ? "none" : "unread";
	}

	return mark;
}
