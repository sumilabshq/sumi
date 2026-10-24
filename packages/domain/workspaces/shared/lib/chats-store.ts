import { NEW_CHAT_TITLE } from "@widgetarium/core/engine/active-chat-port.js";
import type { ActiveChat } from "@widgetarium/core/engine/active-chat-port.js";
import type { ChatMarkKind, KeptChat, KeptChats } from "../schema/chat.schema.js";
import { Watchers } from "./watchers.js";

export interface ChatTurnState {
	readonly isBusy: boolean;
	readonly firstAsked: string | null;
}

interface ChatsMoment {
	readonly kept: KeptChats;
	readonly marks: ReadonlyMap<string, ChatMarkKind>;
}

const TITLE_MOST_CHARS = 80;
const UNKNOWN = "There is no chat {id}.";
const NO_TITLE = "A chat needs a title.";

export class ChatsStore {
	private readonly watchers = new Watchers();
	private readonly keptWatchers = new Watchers();
	private moment: ChatsMoment;
	private active: ActiveChat;

	constructor(
		kept: KeptChats | null,
		private readonly clock: () => number = Date.now,
	) {
		this.moment = { kept: withOneActive(kept, clock()), marks: new Map() };
		this.active = activeOf(this.moment.kept);
	}

	now = (): KeptChats => this.moment.kept;

	markOf = (id: string): ChatMarkKind => this.moment.marks.get(id) ?? "none";

	activeChat = (): ActiveChat => this.active;

	watch = (changed: () => void): (() => void) => this.watchers.watch(changed);

	watchKept = (changed: () => void): (() => void) => this.keptWatchers.watch(changed);

	create(): string {
		const at = this.clock();
		const chat: KeptChat = {
			id: crypto.randomUUID(),
			title: null,
			isPinned: false,
			createdAt: at,
			lastAt: at,
		};
		const { kept, marks } = this.moment;
		this.become({ kept: { chats: [...kept.chats, chat], activeId: chat.id }, marks }, `new chat ${chat.id}`);
		return chat.id;
	}

	select(id: string): void {
		this.chatOf(id);
		this.become(
			{
				kept: { ...this.moment.kept, activeId: id },
				marks: withMark(this.moment.marks, id, "none"),
			},
			`select ${id}`,
		);
	}

	pin(id: string, isPinned: boolean): void {
		this.becomeKept(
			this.withChanged(id, (chat) => ({ ...chat, isPinned })),
			`${isPinned ? "pin" : "unpin"} ${id}`,
		);
	}

	rename(id: string, title: string): string | null {
		const trimmed = title.trim();
		if (trimmed === "") {
			return NO_TITLE;
		}

		this.becomeKept(
			this.withChanged(id, (chat) => ({ ...chat, title: trimmed })),
			`rename ${id}`,
		);
		return null;
	}

	recordTurnState(id: string, { isBusy, firstAsked }: ChatTurnState): void {
		if (!this.moment.kept.chats.some((chat) => chat.id === id)) {
			return;
		}

		const mark = this.markOf(id);
		const kept = this.withChanged(id, (chat) => ({
			...chat,
			title: chat.title ?? titleOfAsk(firstAsked),
			lastAt: isBusy && mark !== "running" ? this.clock() : chat.lastAt,
		}));
		this.become(
			{ kept, marks: withMark(this.moment.marks, id, markAfter(mark, isBusy, id === kept.activeId)) },
			`turn state of ${id}`,
		);
	}

	private chatOf(id: string): KeptChat {
		const found = this.moment.kept.chats.find((chat) => chat.id === id);
		if (found === undefined) {
			throw new Error(UNKNOWN.replace("{id}", id));
		}

		return found;
	}

	private withChanged(id: string, step: (chat: KeptChat) => KeptChat): KeptChats {
		this.chatOf(id);
		return {
			...this.moment.kept,
			chats: this.moment.kept.chats.map((chat) => (chat.id === id ? step(chat) : chat)),
		};
	}

	private becomeKept(kept: KeptChats, reason: string): void {
		this.become({ ...this.moment, kept }, reason);
	}

	private followActive(kept: KeptChats): void {
		const active = activeOf(kept);
		if (active.id !== this.active.id || active.title !== this.active.title) {
			this.active = active;
		}
	}

	private become(next: ChatsMoment, reason: string): void {
		const isKeptChanged = JSON.stringify(next.kept) !== JSON.stringify(this.moment.kept);
		const isMarksChanged = JSON.stringify([...next.marks]) !== JSON.stringify([...this.moment.marks]);
		if (!isKeptChanged && !isMarksChanged) {
			return;
		}

		console.info(`[widgetarium] chats ${summaryOf(this.moment)} → ${summaryOf(next)} (${reason})`);
		this.moment = next;
		this.followActive(next.kept);
		if (isKeptChanged) {
			this.keptWatchers.tell();
		}

		this.watchers.tell();
	}
}

export function titleOf(chat: KeptChat): string {
	return chat.title ?? NEW_CHAT_TITLE;
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

function withMark(
	marks: ReadonlyMap<string, ChatMarkKind>,
	id: string,
	mark: ChatMarkKind,
): ReadonlyMap<string, ChatMarkKind> {
	const next = new Map(marks);
	if (mark === "none") {
		next.delete(id);
		return next;
	}

	next.set(id, mark);
	return next;
}

function withOneActive(kept: KeptChats | null, at: number): KeptChats {
	const chats = kept?.chats ?? [];
	const latest = latestOf(chats);
	if (latest === null) {
		const chat: KeptChat = {
			id: crypto.randomUUID(),
			title: null,
			isPinned: false,
			createdAt: at,
			lastAt: at,
		};
		return { chats: [chat], activeId: chat.id };
	}

	return { chats, activeId: chats.find((chat) => chat.id === kept?.activeId)?.id ?? latest.id };
}

function latestOf(chats: readonly KeptChat[]): KeptChat | null {
	return chats.reduce<KeptChat | null>(
		(latest, chat) => (latest === null || chat.lastAt > latest.lastAt ? chat : latest),
		null,
	);
}

function activeOf(kept: KeptChats): ActiveChat {
	const chat = kept.chats.find((held) => held.id === kept.activeId) ?? kept.chats[0];
	if (chat === undefined) {
		throw new Error("a chats store always holds one chat");
	}

	return { id: chat.id, title: titleOf(chat) };
}

function summaryOf({ kept, marks }: ChatsMoment): string {
	return `${kept.chats.length} chats, active ${kept.activeId ?? "none"}, marks ${JSON.stringify([...marks])}`;
}
