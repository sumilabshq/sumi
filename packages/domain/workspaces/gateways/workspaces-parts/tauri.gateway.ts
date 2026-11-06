import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import {
	KEPT_CHATS,
	KEPT_LEGACY_CHAT_INDEX,
	KeptChatsDocSchema,
	KeptLegacyChatIndexSchema,
	TauriChatsGateway,
} from "../chats/tauri.gateway.js";
import { MemoryCurrentWorkspaceGateway } from "../current-workspace/memory.gateway.js";
import { TauriWorkspaceChatsGateway } from "../workspace-chats/tauri.gateway.js";
import { TauriWorkspacesGateway } from "../workspaces/tauri.gateway.js";
import { firstChats } from "./memory.gateway.js";
import type { WorkspacesParts } from "./workspaces-parts.gateway.js";

// TRADE-OFF: the docs are read after start, so the first frame shows a fresh chat and no workspace names; the picker is synchronous
export function tauriWorkspacesParts(workspaceId: string, store: StoreClient): WorkspacesParts {
	const root = workspaceRootOf(workspaceId);
	return {
		workspaceChats: new TauriWorkspaceChatsGateway(store),
		workspaces: new TauriWorkspacesGateway(store),
		currentWorkspace: new MemoryCurrentWorkspaceGateway({
			currentId: workspaceId,
			openingId: null,
		}),
		chats: new TauriChatsGateway(
			{
				chats: HeldDoc.reading({ store, root, kind: KEPT_CHATS, empty: KeptChatsDocSchema.parse({}) }),
				legacyIndex: HeldDoc.reading({
					store,
					root,
					kind: KEPT_LEGACY_CHAT_INDEX,
					empty: KeptLegacyChatIndexSchema.parse({}),
				}),
			},
			firstChats(),
		),
	};
}
