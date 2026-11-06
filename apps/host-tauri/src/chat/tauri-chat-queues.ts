import { z } from "zod";
import type { QueuedMessage } from "@widgetarium/core/engine/assistant-port.js";
import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, WorkspaceRoot } from "@widgetarium/behaviors/tauri-store";
import type { ChatsLink } from "../assistant/chat-sessions.js";
import type { ChatHistory } from "../assistant/turn-session.js";
import { CHAT_ENTRY, ChatEntriesDocSchema } from "./tauri-chat-drafts.js";
import type { ChatDraftsAt, ChatEntriesDoc } from "./tauri-chat-drafts.js";

export interface QueuedFiles {
	readonly folder: string | null;
	write(path: string, data: Uint8Array): void;
	bytesOf(path: string): Uint8Array | null;
}

export interface ChatQueueKeeper {
	queuedOf(chatId: string, files: QueuedFiles): Promise<readonly QueuedMessage[]>;
	keep(chatId: string, queued: readonly QueuedMessage[], files: QueuedFiles): void;
}

export interface ChatQueuesAt extends ChatDraftsAt {
	readonly ownWindow: string;
	readonly liveWindows: () => Promise<readonly string[]>;
}

const KeptFileSchema = z.object({
	path: z.string().min(1),
	file: z.string().regex(/^chat\/queued\/[a-z0-9-]+\/[a-z0-9._-]+\.bin$/),
});

type KeptFile = z.infer<typeof KeptFileSchema>;

const KeptQueuedSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1),
	isHeld: z.boolean().catch(false),
	files: z.array(KeptFileSchema).catch([]),
});

type KeptQueued = z.infer<typeof KeptQueuedSchema>;

const KeptQueueSchema = z.array(KeptQueuedSchema).catch([]);

const CHAT_QUEUES: DocKind<ChatEntriesDoc> = {
	file: "chat/queues.json",
	v: 2,
	schema: ChatEntriesDocSchema,
};

const WINDOW_MARK = "@";
const BEFORE_ENTRIES = "queues";
const UNSAFE_IN_FILE = /[^a-z0-9._-]/g;
const UUID_PREFIX = /^[0-9a-f-]{36}-/;
const MOST_WRITE_TRIES = 4;
const RETRY_AFTER_MS = 2000;
const NOT_COPIED = "[queue] chat {chat}: {path} is not in memory, its message is kept without the file";
const NOT_WRITTEN = "[queue] chat {chat}: {path} could not be stored after {tries} tries";
const NOT_REMOVED = "[queue] chat {chat}: {path} could not be removed from the store";
const NOT_READ = "[queue] chat {chat}: {path} could not be read back, the message keeps naming it";

interface Restored {
	readonly message: QueuedMessage;
	readonly keptAs: KeptQueued;
}

export class TauriChatQueueShelf implements ChatQueueKeeper {
	private readonly writing = new Set<Promise<void>>();
	private readonly heard = new Map<string, readonly QueuedMessage[]>();

	private constructor(
		private readonly at: ChatQueuesAt,
		private readonly doc: HeldDoc<ChatEntriesDoc>,
	) {}

	static async read(at: ChatQueuesAt): Promise<TauriChatQueueShelf> {
		const doc = await HeldDoc.read({
			store: at.store,
			root: workspaceRootOf(at.workspaceId),
			kind: CHAT_QUEUES,
			empty: {},
		});
		const shelf = new TauriChatQueueShelf(at, doc);
		await shelf.takeEntriesFromBefore();
		return shelf;
	}

	async queuedOf(chatId: string, files: QueuedFiles): Promise<readonly QueuedMessage[]> {
		const own = queueIn(this.doc.now()[this.ownKeyOf(chatId)]);
		const orphaned = await this.takeOrphansOf(chatId);
		const restored = await Promise.all([...own, ...orphaned].map((queued) => this.restoredOf(chatId, queued, files)));
		const queued = restored.map(({ message }) => message);
		this.heard.set(chatId, queued);
		this.keepOwn(chatId, restored.map(({ keptAs }) => keptAs), `chat ${chatId} queue read back`);
		console.info(`[queue] chat ${chatId}: ${String(queued.length)} queued read back (${String(orphaned.length)} from closed windows), waiting`);
		return queued;
	}

	keep(chatId: string, queued: readonly QueuedMessage[], files: QueuedFiles): void {
		if (this.heard.get(chatId) === queued) {
			return;
		}

		this.heard.set(chatId, queued);
		const was = queueIn(this.doc.now()[this.ownKeyOf(chatId)]);
		const keptFiles = new Map(was.flatMap(({ files: kept }) => kept.map((file): [string, KeptFile] => [file.path, file])));
		const next = queued.map((message) => this.keptOf(chatId, message, { files, keptFiles }));
		const stillNamed = new Set(next.flatMap(({ files: kept }) => kept.map(({ file }) => file)));

		for (const gone of [...keptFiles.values()].filter(({ file }) => !stillNamed.has(file))) {
			const removing = this.at.files.remove(this.root(), gone.file);
			this.track(removing.catch((failure: unknown) => console.error(NOT_REMOVED.replace("{chat}", chatId).replace("{path}", gone.path), failure)));
		}

		this.keepOwn(chatId, next, `chat ${chatId} queue ${String(was.length)} → ${String(next.length)}`);
	}

	async flush(): Promise<void> {
		await Promise.all([...this.writing]);
		await this.doc.flush();
	}

	private async takeOrphansOf(chatId: string): Promise<readonly KeptQueued[]> {
		const live = new Set(await this.at.liveWindows());
		const prefix = `${CHAT_ENTRY}${chatId}${WINDOW_MARK}`;
		const orphanKeys = Object.keys(this.doc.now()).filter(
			(key) => key.startsWith(prefix) && key !== this.ownKeyOf(chatId) && !live.has(key.slice(prefix.length)),
		);
		const taken = await Promise.all(
			orphanKeys.map(async (key) => {
				const held = await this.at.store.takeEntry(this.root(), CHAT_QUEUES, key, `window ${this.at.ownWindow} took ${key}`);
				this.doc.change({ [key]: undefined }, `${key} taken`);
				return queueIn(held);
			}),
		);
		return taken.flat();
	}

	private async takeEntriesFromBefore(): Promise<void> {
		if (this.doc.now()[BEFORE_ENTRIES] === undefined) {
			return;
		}

		const held = await this.at.store.takeEntry(this.root(), CHAT_QUEUES, BEFORE_ENTRIES, "queues moved to one entry per chat");
		const before = z.record(z.string(), z.unknown()).catch({}).parse(held ?? {});
		this.doc.change(
			{
				[BEFORE_ENTRIES]: undefined,
				...Object.fromEntries(Object.entries(before).map(([chatId, queue]) => [this.ownKeyOf(chatId), queueIn(queue)])),
			},
			"queues moved to one entry per chat",
		);
	}

	private keptOf(
		chatId: string,
		{ id, text, isHeld }: QueuedMessage,
		{ files, keptFiles }: { readonly files: QueuedFiles; readonly keptFiles: ReadonlyMap<string, KeptFile> },
	): KeptQueued {
		const named = pathsIn(text, files.folder).flatMap((path): KeptFile[] => {
			const known = keptFiles.get(path);

			if (known !== undefined) {
				return [known];
			}

			const bytes = files.bytesOf(path);

			if (bytes === null) {
				console.warn(NOT_COPIED.replace("{chat}", chatId).replace("{path}", path));
				return [];
			}

			const file = queuedFileOf(chatId, path);
			this.track(this.writeWithRetries({ chatId, path, file, bytes }, 1));
			return [
				{
					path,
					file,
				},
			];
		});
		return {
			id,
			text,
			isHeld,
			files: named,
		};
	}

	private async writeWithRetries(
		written: { readonly chatId: string; readonly path: string; readonly file: string; readonly bytes: Uint8Array },
		tries: number,
	): Promise<void> {
		try {
			await this.at.files.write(this.root(), written.file, written.bytes);
		} catch (failure: unknown) {
			if (tries >= MOST_WRITE_TRIES) {
				const said = NOT_WRITTEN.replace("{chat}", written.chatId).replace("{path}", written.path);
				console.error(said.replace("{tries}", String(tries)), failure);
				return;
			}

			await new Promise((waited) => setTimeout(waited, RETRY_AFTER_MS));
			await this.writeWithRetries(written, tries + 1);
		}
	}

	private async restoredOf(chatId: string, kept: KeptQueued, files: QueuedFiles): Promise<Restored> {
		const moved = await Promise.all(kept.files.map((file) => this.movedBack(chatId, file, files)));
		const text = moved.reduce((said, { from, to }) => said.replaceAll(from, to), kept.text);
		return {
			message: {
				id: kept.id,
				text,
				isHeld: kept.isHeld,
			},
			keptAs: {
				...kept,
				text,
				files: moved.map(({ to, file }) => ({
					path: to,
					file,
				})),
			},
		};
	}

	private async movedBack(
		chatId: string,
		kept: KeptFile,
		files: QueuedFiles,
	): Promise<{ readonly from: string; readonly to: string; readonly file: string }> {
		try {
			const bytes = await this.at.files.read(this.root(), kept.file);
			const to = freshPathOf(kept.path, files.folder);
			files.write(to, bytes);
			return {
				from: kept.path,
				to,
				file: kept.file,
			};
		} catch (failure: unknown) {
			console.warn(NOT_READ.replace("{chat}", chatId).replace("{path}", kept.path), failure);
			return {
				from: kept.path,
				to: kept.path,
				file: kept.file,
			};
		}
	}

	private keepOwn(chatId: string, next: readonly KeptQueued[], reason: string): void {
		this.doc.change({ [this.ownKeyOf(chatId)]: next.length === 0 ? undefined : [...next] }, reason);
	}

	private ownKeyOf(chatId: string): string {
		return `${CHAT_ENTRY}${chatId}${WINDOW_MARK}${this.at.ownWindow}`;
	}

	private root(): WorkspaceRoot {
		return workspaceRootOf(this.at.workspaceId);
	}

	private track(work: Promise<unknown>): void {
		const held = work.then(() => undefined).finally(() => this.writing.delete(held));
		this.writing.add(held);
	}
}

export function queueKeptLink(chats: ChatsLink, queues: ChatQueueKeeper, files: QueuedFiles): ChatsLink {
	return {
		...chats,
		historyOf: async (chatId) => withQueued(await chats.historyOf(chatId), await queues.queuedOf(chatId, files)),
		onSessionChanged: (chatId, session) => {
			queues.keep(chatId, session.queued, files);
			chats.onSessionChanged(chatId, session);
		},
	};
}

function withQueued(history: ChatHistory, queued: readonly QueuedMessage[]): ChatHistory {
	return {
		kept: {
			...history.kept,
			session: {
				...history.kept.session,
				queued,
			},
		},
		settled: (session, resumes) => history.settled(session, resumes),
		cleared: () => history.cleared(),
	};
}

function queueIn(held: unknown): readonly KeptQueued[] {
	return KeptQueueSchema.parse(held ?? []);
}

function pathsIn(text: string, folder: string | null): readonly string[] {
	if (folder === null) {
		return [];
	}

	const marker = `: ${folder}/`;
	return text.split("\n").flatMap((line) => {
		const at = line.indexOf(marker);
		return at === -1 ? [] : [line.slice(at + 2)];
	});
}

function queuedFileOf(chatId: string, path: string): string {
	const name = (path.split("/").at(-1) ?? "file").toLowerCase().replace(UNSAFE_IN_FILE, "_");
	return `chat/queued/${chatId}/${name}.bin`;
}

function freshPathOf(path: string, folder: string | null): string {
	const name = (path.split("/").at(-1) ?? "file").replace(UUID_PREFIX, "");
	return `${folder ?? path.slice(0, path.lastIndexOf("/"))}/${crypto.randomUUID()}-${name}`;
}
