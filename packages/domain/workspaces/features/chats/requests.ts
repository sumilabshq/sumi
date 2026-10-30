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
	ChatRecordsSchema,
	ChatToOpenSchema,
	ChatTurnSchema,
	NewChatSchema,
	WorkspaceCrumbSchema,
} from "../../shared/schema/chat.schema.js";
import type { ChatMarkKind, ChatMarks, ChatTurn, KeptChat, KeptChats } from "../../shared/schema/chat.schema.js";

const TITLE_MOST_CHARS = 80;
const UNKNOWN = "There is no chat {id}.";

export const ChatRecordsQuery = query("chat-records")
	.output(ChatRecordsSchema)
	.settlesNow()
	.inject({
		chats: ChatsGateway,
		chatMarks: ChatMarksGateway,
	})
	.handle((_input, { chats, chatMarks }) => ({
		isRead: chats.isLoaded(),
		chats: chats.chats().chats.map((chat) => ({
			id: chat.id,
			title: titleOf(chat),
			lastAt: chat.lastAt,
			mark: markOf(chatMarks.chatMarks(), chat.id),
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
	.handle(({ title }, { chats, invalidate }) => {
		invalidate(ChatRecordsQuery);
		const kept = chats.chats();
		const at = Date.now();
		const chat: KeptChat = {
			id: crypto.randomUUID(),
			title: title?.trim() || null,
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
		invalidate(ChatRecordsQuery);
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

export const RecordChatTurnCommand = command("record-chat-turn")
	.input(ChatTurnSchema)
	.idempotencyKey(Repeatable)
	.inject({
		chats: ChatsGateway,
		chatMarks: ChatMarksGateway,
	})
	.handle((turn, { chats, chatMarks, invalidate }) => {
		invalidate(ChatRecordsQuery);
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
	invalidate(ChatRecordsQuery);
	invalidate(ChatToOpenQuery);
});

export const RereadChatListSubscriber = subscriber(ChatMarksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatRecordsQuery);
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
