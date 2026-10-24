import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { KeptChats } from "../../shared/schema/chat.schema.js";
import { KEPT_CHATS, KeptChatsDocSchema } from "../chats/tauri.gateway.js";
import type { KeptChatsDoc } from "../chats/tauri.gateway.js";
import { WorkspaceChatsGateway } from "./workspace-chats.gateway.js";

export class TauriWorkspaceChatsGateway extends WorkspaceChatsGateway {
	constructor(private readonly store: StoreClient) {
		super();
	}

	async chatsIn(workspaceId: string): Promise<KeptChats> {
		const { chats, activeId } = (await this.docOf(workspaceId)).now();
		return {
			chats,
			activeId,
		};
	}

	async saveActiveChatIn(workspaceId: string, chatId: string, reason: string): Promise<void> {
		const doc = await this.docOf(workspaceId);
		doc.change({ activeId: chatId }, reason);
		await doc.flush();
	}

	private docOf(workspaceId: string): Promise<HeldDoc<KeptChatsDoc>> {
		return HeldDoc.read({
			store: this.store,
			root: workspaceRootOf(workspaceId),
			kind: KEPT_CHATS,
			empty: KeptChatsDocSchema.parse({}),
		});
	}
}
