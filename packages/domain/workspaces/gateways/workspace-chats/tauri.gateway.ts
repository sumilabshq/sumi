import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { KeptChats } from "../../shared/schema/chat.schema.js";
import { KEPT_CHATS, KeptChatsDocSchema } from "../chats/tauri.gateway.js";
import type { KeptChatsDoc } from "../chats/tauri.gateway.js";
import { WorkspaceChatsGateway } from "./workspace-chats.gateway.js";

const DOC_FRESH_MS = 5000;

type ReadDoc = {
	doc: Promise<HeldDoc<KeptChatsDoc>>;
	readAt: number;
};

export class TauriWorkspaceChatsGateway extends WorkspaceChatsGateway {
	private readonly readDocs = new Map<string, ReadDoc>();

	constructor(private readonly store: StoreClient) {
		super();
	}

	async chatsIn(workspaceId: string): Promise<KeptChats> {
		const { chats, openOnStartId } = (await this.docOf(workspaceId)).now();
		return {
			chats,
			openOnStartId: openOnStartId ?? null,
		};
	}

	async saveChatToOpenIn(workspaceId: string, chatId: string, reason: string): Promise<void> {
		const doc = await this.docOf(workspaceId);
		doc.change({ openOnStartId: chatId, activeId: null }, reason);
		await doc.flush();
	}

	private docOf(workspaceId: string): Promise<HeldDoc<KeptChatsDoc>> {
		const kept = this.readDocs.get(workspaceId);
		const now = Date.now();

		if (kept !== undefined && now - kept.readAt < DOC_FRESH_MS) {
			return kept.doc;
		}

		// TRADE-OFF: no disk watch, so another window's edit shows after DOC_FRESH_MS.
		const doc = this.docReadFromDisk(workspaceId);
		this.readDocs.set(workspaceId, {
			doc,
			readAt: now,
		});
		return doc;
	}

	private docReadFromDisk(workspaceId: string): Promise<HeldDoc<KeptChatsDoc>> {
		return HeldDoc.read({
			store: this.store,
			root: workspaceRootOf(workspaceId),
			kind: KEPT_CHATS,
			empty: KeptChatsDocSchema.parse({}),
		});
	}
}
