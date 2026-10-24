import { z } from "zod";
import { validEntriesOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { KeptChatSchema } from "../../shared/schema/chat.schema.js";
import type { KeptChats } from "../../shared/schema/chat.schema.js";
import { ChatsGateway } from "./chats.gateway.js";

export const KeptChatsDocSchema = z.looseObject({
	chats: z.array(KeptChatSchema).default([]),
	activeId: z.string().nullable().catch(null),
});

export type KeptChatsDoc = z.infer<typeof KeptChatsDocSchema>;

export const KEPT_CHATS: DocKind<KeptChatsDoc> = {
	file: "chats.json",
	v: 1,
	schema: KeptChatsDocSchema,
	salvage: KeptChatsDocSchema.extend({ chats: validEntriesOf(KeptChatSchema) }),
};

export const KeptLegacyChatIndexSchema = z.looseObject({
	currentId: z.string().nullable().catch(null),
});

export type KeptLegacyChatIndex = z.infer<typeof KeptLegacyChatIndexSchema>;

export const KEPT_LEGACY_CHAT_INDEX: DocKind<KeptLegacyChatIndex> = {
	file: "chat/index.json",
	v: 1,
	schema: KeptLegacyChatIndexSchema,
};

export interface TauriChatsDocs {
	readonly chats: HeldDoc<KeptChatsDoc>;
	readonly legacyIndex: HeldDoc<KeptLegacyChatIndex>;
}

export class TauriChatsGateway extends ChatsGateway {
	constructor(
		private readonly docs: TauriChatsDocs,
		private readonly first: KeptChats,
	) {
		super();
	}

	chats(): KeptChats {
		const { chats, activeId } = this.docs.chats.now();

		if (chats.length > 0) {
			return {
				chats,
				activeId,
			};
		}

		const legacyId = this.docs.legacyIndex.now().currentId;
		return legacyId === null ? this.first : keptOfLegacy(legacyId);
	}

	saveChats(chats: KeptChats, reason: string): void {
		this.docs.chats.change(chats, reason);
		void this.docs.chats.flush();
	}

	chatsChanged(listener: () => void): () => void {
		const stopChats = this.docs.chats.watch(listener);
		const stopLegacy = this.docs.legacyIndex.watch(listener);
		return () => {
			stopChats();
			stopLegacy();
		};
	}
}

function keptOfLegacy(id: string): KeptChats {
	return {
		chats: [
			{
				id,
				title: null,
				isPinned: false,
				createdAt: 0,
				lastAt: 0,
			},
		],
		activeId: id,
	};
}
