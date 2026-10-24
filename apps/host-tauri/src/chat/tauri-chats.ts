import { z } from "zod";
import { KeptChatSchema } from "@widgetarium/workspaces";
import type { KeptChats } from "@widgetarium/workspaces";
import { ChatsGateway } from "@widgetarium/workspaces/gateways";
import { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { validEntriesOf } from "../store/valid-entries.js";
import { workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { LegacyChat } from "./tauri-chat-history.js";

const ChatsDocSchema = z.looseObject({
	chats: z.array(KeptChatSchema).default([]),
	activeId: z.string().nullable().catch(null),
});

type ChatsDoc = z.infer<typeof ChatsDocSchema>;

const CHATS: DocKind<ChatsDoc> = {
	file: "chats.json",
	v: 1,
	schema: ChatsDocSchema,
	salvage: ChatsDocSchema.extend({ chats: validEntriesOf(KeptChatSchema) }),
};

export type HeldChats = HeldDoc<ChatsDoc>;

export function readChats(store: StoreClient, workspaceId: string): Promise<HeldChats> {
	return HeldDoc.read({
		store,
		root: workspaceRootOf(workspaceId),
		kind: CHATS,
		empty: ChatsDocSchema.parse({}),
	});
}

export class TauriChatsGateway extends ChatsGateway {
	constructor(
		private readonly chats: HeldChats,
		private readonly legacyChat: LegacyChat | null,
	) {
		super();
	}

	kept(): KeptChats | null {
		const { chats, activeId } = this.chats.now();
		if (chats.length > 0) {
			return { chats, activeId };
		}

		return this.legacyChat === null ? null : keptOfLegacy(this.legacyChat);
	}

	keep(chats: KeptChats): void {
		this.chats.change(chats, `${chats.chats.length} chats, active ${chats.activeId ?? "none"}`);
	}
}

function keptOfLegacy({ id }: LegacyChat): KeptChats {
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
