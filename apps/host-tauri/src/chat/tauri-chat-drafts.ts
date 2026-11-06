import { z } from "zod";
import { ClaudeOptionsSchema, DraftAttachmentSchema } from "@widgetarium/assistant";
import type { ClaudeOptions, DraftAttachment } from "@widgetarium/assistant";
import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient, WorkspaceRoot } from "@widgetarium/behaviors/tauri-store";

export type ClaudeChoices = Pick<ClaudeOptions, "mode" | "model" | "effort">;

export interface ChatDraft {
	readonly said: string;
	readonly attachments: readonly DraftAttachment[];
	readonly choices: ClaudeChoices | null;
	readonly provider: string | null;
}

export interface ChatDraftShelf {
	draftOf(chatId: string): ChatDraft | null;
	keep(chatId: string, draft: ChatDraft): void;
	problemOf(chatId: string): string | null;
}

export interface DraftFiles {
	write(root: WorkspaceRoot, path: string, bytes: Uint8Array): Promise<void>;
	read(root: WorkspaceRoot, path: string): Promise<Uint8Array>;
	remove(root: WorkspaceRoot, path: string): Promise<void>;
}

export interface ChatDraftsAt {
	readonly store: StoreClient;
	readonly files: DraftFiles;
	readonly workspaceId: string;
	readonly retryAfterMs?: readonly number[];
}

export type ChatEntriesDoc = Partial<Record<string, unknown>>;

const KeptAttachmentSchema = DraftAttachmentSchema.pick({
	name: true,
	kind: true,
	mime: true,
	path: true,
}).extend({ id: z.uuid() });

type KeptAttachment = z.infer<typeof KeptAttachmentSchema>;

const KeptChatDraftSchema = z.object({
	said: z.string().catch(""),
	attachments: z.array(KeptAttachmentSchema).catch([]),
	choices: ClaudeOptionsSchema.pick({
		mode: true,
		model: true,
		effort: true,
	})
		.nullable()
		.catch(null),
	provider: z.string().min(1).nullable().catch(null),
});

type KeptChatDraft = z.infer<typeof KeptChatDraftSchema>;

export const ChatEntriesDocSchema = z.record(z.string(), z.unknown());

const CHAT_DRAFTS: DocKind<ChatEntriesDoc> = {
	file: "chat/drafts.json",
	v: 2,
	schema: ChatEntriesDocSchema,
};

export const CHAT_ENTRY = "chat:";
const BEFORE_ENTRIES = "drafts";
const RETRY_AFTER_MS: readonly number[] = [1000, 5000, 30_000, 120_000];
const CHUNK = 0x8000;
const NOT_READ = "{names} could not be read back from disk ({why}). They stay in this draft and are tried again.";
const NOT_WRITTEN = "{name} could not be saved to disk ({why}). It stays attached and is tried again.";
const NOT_REMOVED = "[ink] chat {chat}: draft file of {name} could not be removed";

interface HeldChat {
	readonly draft: ChatDraft;
	readonly unread: readonly KeptAttachment[];
}

export class MemoryChatDraftShelf implements ChatDraftShelf {
	private readonly held = new Map<string, ChatDraft>();

	draftOf(chatId: string): ChatDraft | null {
		return this.held.get(chatId) ?? null;
	}

	keep(chatId: string, draft: ChatDraft): void {
		if (isEmptyDraft(draft)) {
			this.held.delete(chatId);
			return;
		}

		this.held.set(chatId, draft);
	}

	problemOf(): null {
		return null;
	}
}

export class TauriChatDraftShelf implements ChatDraftShelf {
	private readonly writing = new Set<Promise<void>>();
	private readonly held = new Map<string, HeldChat>();
	private readonly seen = new Map<string, string>();
	private readonly problems = new Map<string, string>();

	private constructor(
		private readonly at: ChatDraftsAt,
		private readonly doc: HeldDoc<ChatEntriesDoc>,
	) {}

	static async read(at: ChatDraftsAt): Promise<TauriChatDraftShelf> {
		const doc = await HeldDoc.read({
			store: at.store,
			root: workspaceRootOf(at.workspaceId),
			kind: CHAT_DRAFTS,
			empty: {},
		});
		const shelf = new TauriChatDraftShelf(at, doc);
		await shelf.followDoc();
		doc.watch(() => void shelf.followDoc());
		console.info(`[ink] chat drafts read back for ${String(shelf.held.size)} chats`);
		return shelf;
	}

	draftOf(chatId: string): ChatDraft | null {
		return this.held.get(chatId)?.draft ?? null;
	}

	problemOf(chatId: string): string | null {
		return this.problems.get(chatId) ?? null;
	}

	keep(chatId: string, draft: ChatDraft): void {
		const was = this.held.get(chatId);
		const next: HeldChat = {
			draft,
			unread: was?.unread ?? [],
		};
		const written = this.writeFilesOf(chatId, was?.draft.attachments ?? [], draft.attachments);
		const kept = keptOf(next);
		this.remember(chatId, next, kept);
		this.doc.change(
			{
				[entryKeyOf(chatId)]: kept ?? undefined,
				[BEFORE_ENTRIES]: undefined,
			},
			`chat ${chatId} draft kept`,
		);

		if (written.length > 0 || (was?.draft.attachments.length ?? 0) !== draft.attachments.length) {
			this.track(Promise.all(written).then(() => this.doc.flush()));
		}
	}

	async flush(): Promise<void> {
		await Promise.all([...this.writing]);
		await this.doc.flush();
	}

	private async followDoc(): Promise<void> {
		const entries = entriesOf(this.doc.now());
		const changed = [...entries].filter(([chatId, kept]) => this.seen.get(chatId) !== JSON.stringify(kept));
		const gone = [...this.seen.keys()].filter((chatId) => !entries.has(chatId));

		for (const chatId of gone) {
			this.seen.delete(chatId);
			this.held.delete(chatId);
		}

		await Promise.all(changed.map(([chatId, kept]) => this.load(chatId, kept)));
	}

	private async load(chatId: string, kept: KeptChatDraft): Promise<void> {
		this.seen.set(chatId, JSON.stringify(kept));
		const read = await Promise.all(kept.attachments.map((attachment) => this.attachmentOf(chatId, attachment)));
		const attachments = read.flatMap(({ attachment }) => (attachment === null ? [] : [attachment]));
		const unread = kept.attachments.filter((_attachment, at) => read[at]?.attachment === null);
		this.held.set(chatId, {
			draft: {
				said: kept.said,
				choices: kept.choices,
				provider: kept.provider,
				attachments,
			},
			unread,
		});
		this.reportUnread(chatId, unread, read.find(({ failure }) => failure !== null)?.failure ?? null);
	}

	private reportUnread(chatId: string, unread: readonly KeptAttachment[], failure: string | null): void {
		if (unread.length === 0) {
			this.problems.delete(chatId);
			return;
		}

		const said = NOT_READ.replace("{names}", unread.map(({ name }) => name).join(", ")).replace("{why}", failure ?? "");
		this.problems.set(chatId, said);
		console.error(`[ink] chat ${chatId}: ${said}`);
		this.retry(chatId, 0, () => this.retryUnread(chatId));
	}

	private async retryUnread(chatId: string): Promise<boolean> {
		const held = this.held.get(chatId);

		if (held === undefined || held.unread.length === 0) {
			return true;
		}

		const read = await Promise.all(held.unread.map((attachment) => this.attachmentOf(chatId, attachment)));
		const found = read.flatMap(({ attachment }) => (attachment === null ? [] : [attachment]));
		const unread = held.unread.filter((_attachment, at) => read[at]?.attachment === null);
		const now = this.held.get(chatId) ?? held;
		this.held.set(chatId, {
			draft: {
				...now.draft,
				attachments: [...found, ...now.draft.attachments],
			},
			unread,
		});

		if (unread.length === 0) {
			this.problems.delete(chatId);
			console.info(`[ink] chat ${chatId}: ${String(found.length)} attached files read back on a retry`);
		}

		return unread.length === 0;
	}

	private async attachmentOf(
		chatId: string,
		kept: KeptAttachment,
	): Promise<{ readonly attachment: DraftAttachment | null; readonly failure: string | null }> {
		if (kept.kind === "folder") {
			return {
				attachment: {
					...kept,
					bytes: new Uint8Array(),
					preview: null,
				},
				failure: null,
			};
		}

		try {
			const bytes = await this.at.files.read(this.root(), draftFileOf(chatId, kept.id));
			return {
				attachment: {
					...kept,
					bytes,
					preview: kept.kind === "image" ? `data:${kept.mime};base64,${base64Of(bytes)}` : null,
				},
				failure: null,
			};
		} catch (failure: unknown) {
			return {
				attachment: null,
				failure: messageOf(failure),
			};
		}
	}

	private remember(chatId: string, next: HeldChat, kept: KeptChatDraft | null): void {
		if (kept === null) {
			this.held.delete(chatId);
			this.seen.delete(chatId);
			return;
		}

		this.held.set(chatId, next);
		this.seen.set(chatId, JSON.stringify(KeptChatDraftSchema.parse(kept)));
	}

	private writeFilesOf(chatId: string, was: readonly DraftAttachment[], next: readonly DraftAttachment[]): Promise<void>[] {
		for (const removed of filesOutside(was, next)) {
			const removing = this.at.files.remove(this.root(), draftFileOf(chatId, removed.id));
			this.track(removing.catch((failure: unknown) => console.error(NOT_REMOVED.replace("{chat}", chatId).replace("{name}", removed.name), failure)));
		}

		return filesOutside(next, was).map((added) => this.writeFile(chatId, added));
	}

	private async writeFile(chatId: string, added: DraftAttachment): Promise<void> {
		try {
			await this.at.files.write(this.root(), draftFileOf(chatId, added.id), added.bytes);
		} catch (failure: unknown) {
			const said = NOT_WRITTEN.replace("{name}", added.name).replace("{why}", messageOf(failure));
			this.problems.set(chatId, said);
			console.error(`[ink] chat ${chatId}: ${said}`, failure);
			this.retry(chatId, 0, () => this.retryWrite(chatId, added));
		}
	}

	private async retryWrite(chatId: string, added: DraftAttachment): Promise<boolean> {
		const isStillAttached = this.held.get(chatId)?.draft.attachments.some(({ id }) => id === added.id) ?? false;

		if (!isStillAttached) {
			return true;
		}

		try {
			await this.at.files.write(this.root(), draftFileOf(chatId, added.id), added.bytes);
			this.problems.delete(chatId);
			console.info(`[ink] chat ${chatId}: ${added.name} saved to disk on a retry`);
			return true;
		} catch {
			return false;
		}
	}

	private retry(chatId: string, attempt: number, tryAgain: () => Promise<boolean>): void {
		const delays = this.at.retryAfterMs ?? RETRY_AFTER_MS;
		const delay = delays[Math.min(attempt, delays.length - 1)] ?? 0;
		setTimeout(() => {
			void tryAgain().then((isDone) => {
				if (!isDone) {
					console.warn(`[ink] chat ${chatId}: retry ${String(attempt + 1)} failed, trying again in ${String(delay)} ms`);
					this.retry(chatId, attempt + 1, tryAgain);
				}
			});
		}, delay);
	}

	private track(work: Promise<unknown>): void {
		const held = work.then(() => undefined).finally(() => this.writing.delete(held));
		this.writing.add(held);
	}

	private root(): WorkspaceRoot {
		return workspaceRootOf(this.at.workspaceId);
	}
}

export function entriesOf(doc: ChatEntriesDoc): ReadonlyMap<string, KeptChatDraft> {
	const before = z.record(z.string(), z.unknown()).catch({}).parse(doc[BEFORE_ENTRIES] ?? {});
	const keyed = Object.entries(doc).flatMap(([key, value]): [string, unknown][] =>
		key.startsWith(CHAT_ENTRY) ? [[key.slice(CHAT_ENTRY.length), value]] : [],
	);
	return new Map(
		[...Object.entries(before), ...keyed].flatMap(([chatId, value]): [string, KeptChatDraft][] => {
			const parsed = KeptChatDraftSchema.safeParse(value);
			return value !== null && parsed.success ? [[chatId, parsed.data]] : [];
		}),
	);
}

export function entryKeyOf(chatId: string): string {
	return `${CHAT_ENTRY}${chatId}`;
}

function keptOf({ draft, unread }: HeldChat): KeptChatDraft | null {
	if (isEmptyDraft(draft) && unread.length === 0) {
		return null;
	}

	return {
		said: draft.said,
		choices: draft.choices,
		provider: draft.provider,
		attachments: [
			...unread,
			...draft.attachments.map(({ id, name, kind, mime, path }) => ({
				id,
				name,
				kind,
				mime,
				path,
			})),
		],
	};
}

function isEmptyDraft({ said, attachments, choices, provider }: ChatDraft): boolean {
	return said === "" && attachments.length === 0 && choices === null && provider === null;
}

function filesOutside(attachments: readonly DraftAttachment[], other: readonly DraftAttachment[]): readonly DraftAttachment[] {
	return attachments.filter((one) => one.kind !== "folder" && !other.some(({ id }) => id === one.id));
}

function draftFileOf(chatId: string, attachmentId: string): string {
	return `chat/drafts/${chatId}/${attachmentId}.bin`;
}

function messageOf(failure: unknown): string {
	return failure instanceof Error ? failure.message : String(failure);
}

function base64Of(bytes: Uint8Array): string {
	const parts: string[] = [];

	for (let at = 0; at < bytes.length; at += CHUNK) {
		parts.push(String.fromCharCode(...bytes.subarray(at, at + CHUNK)));
	}

	return btoa(parts.join(""));
}
