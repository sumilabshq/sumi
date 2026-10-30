import { invoke } from "@tauri-apps/api/core";
import { HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { Invoke } from "@widgetarium/behaviors/tauri-store";
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
export function tauriWorkspacesParts(workspaceId: string, tauriCall: Invoke): WorkspacesParts {
	const store = new StoreClient(tauriCall);
	const root = workspaceRootOf(workspaceId);
	return {
		workspaceChats: new TauriWorkspaceChatsGateway(store),
		workspaces: new TauriWorkspacesGateway(tauriCall, store),
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

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too, as in the layout module
export function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}
