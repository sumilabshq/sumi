import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { Channel, invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { tauriAssistantBridge } from "./assistant-bridge.js";
import type { AssistantBridge, TauriIpc } from "./assistant-bridge.js";
import type { LentFolders } from "./tauri-assistant-port.js";
import { tauriAssistantPort } from "./tauri-assistant-port.js";
import type { TauriAssistantPort } from "./tauri-assistant-port.js";
import { TauriFileDrops } from "./tauri-file-drop.js";
import type { ChatSpot, WebviewDragSource } from "./tauri-file-drop.js";
import { tauriPrivateFolder } from "./tauri-private-folder.js";
import type { ChatsLink } from "./chat-sessions.js";
import { MemoryChatDraftShelf } from "../chat/tauri-chat-drafts.js";
import { queueKeptLink } from "../chat/tauri-chat-queues.js";
import type { ChatQueueKeeper } from "../chat/tauri-chat-queues.js";
import type { ChatDraftShelf } from "../chat/tauri-chat-drafts.js";
import type { ClaudeOptionsCell } from "./claude-options-cell.js";
import type { TauriPrivateFolder } from "./tauri-private-folder.js";
import { browserUsageMemory, claudeOptionsKeptIn } from "./kept-usage.js";
import type { UsageMemory } from "./kept-usage.js";
import { workspaceFolderCell } from "./workspace-folder-cell.js";
import type { WorkspaceFolderCell } from "./workspace-folder-cell.js";
import type { WorkspaceClient } from "../workspace/workspace-client.js";
import type { WorkspaceEntry } from "../workspace/workspace-docs.js";

export interface FolderPicker {
	pick(): Promise<string | null>;
	lend(paths: readonly string[]): void;
}

export interface TauriWorkspaceFolders {
	readonly client: Pick<WorkspaceClient, "chooseFolder" | "attachFolder">;
	readonly opened: WorkspaceEntry;
}

export interface SharedWorkspaceFolder {
	readonly client: TauriWorkspaceFolders["client"];
	readonly folder: WorkspaceFolderCell<WorkspaceEntry>;
}

export type TauriAssistantHost = {
	readonly kind: "tauri";
	readonly tauriAssistant: TauriAssistantPort;
	readonly tauriAttachments: {
		readonly folder: string | null;
		readonly files: TauriPrivateFolder;
	};
	readonly folders: FolderPicker;
	readonly claudeOptions: ClaudeOptionsCell;
	readonly drops: TauriFileDrops;
	readonly workspace: SharedWorkspaceFolder;
	readonly chatDrafts: ChatDraftShelf;
};

export interface TauriAssistant {
	readonly port: TauriAssistantPort;
	readonly host: TauriAssistantHost;
}

const ATTACHMENTS_GLOBAL = "__WIDGETARIUM_ATTACHMENTS__";

const CHAT_COLUMN = ".wg-studio-ai";

const webviewDrags: WebviewDragSource = {
	onDragDropEvent: (handler) => getCurrentWebview().onDragDropEvent(handler),
};

const chatColumn: ChatSpot = {
	rect: () => document.querySelector(CHAT_COLUMN)?.getBoundingClientRect() ?? null,
	scale: () => window.devicePixelRatio,
};

const tauriIpc: TauriIpc = {
	invoke: (command, args, options) => invoke(command, args, options),
	channel: (onMessage) => {
		const channel = new Channel<unknown>();
		channel.onmessage = onMessage;
		return channel;
	},
};

export function attachmentsFolderIn(page: object): string | null {
	const folder: unknown = Reflect.get(page, ATTACHMENTS_GLOBAL);
	return typeof folder === "string" && folder !== "" ? folder : null;
}

export interface TauriAssistantAsk {
	readonly workspace: TauriWorkspaceFolders;
	readonly chatDrafts?: ChatDraftShelf;
	readonly chatQueues?: ChatQueueKeeper;
	readonly ipc?: TauriIpc;
	readonly page?: object;
	readonly chats?: ChatsLink;
	readonly drags?: WebviewDragSource;
	readonly chat?: ChatSpot;
	readonly usageMemory?: UsageMemory;
	readonly renderMarkdown?: RenderMarkdown;
}

export function startTauriAssistant({
	workspace,
	chatDrafts = new MemoryChatDraftShelf(),
	chatQueues,
	ipc = tauriIpc,
	page = window,
	chats,
	drags = webviewDrags,
	chat = chatColumn,
	usageMemory = browserUsageMemory(),
	renderMarkdown,
}: TauriAssistantAsk): TauriAssistant {
	const bridge = tauriAssistantBridge(ipc);
	const privateFolder = tauriPrivateFolder(bridge);
	const folders = folderLending(bridge);
	const claudeOptions = claudeOptionsKeptIn(usageMemory);
	const folder = attachmentsFolderIn(page);
	const kept = chats === undefined || chatQueues === undefined ? chats : queueKeptLink(chats, chatQueues, { ...privateFolder, folder });
	const port = tauriAssistantPort({
		bridge,
		attachments: privateFolder,
		folders,
		claude: claudeOptions,
		...(kept === undefined ? {} : { chats: kept }),
		...(renderMarkdown === undefined ? {} : { renderMarkdown }),
	});
	return {
		port,
		host: {
			kind: "tauri",
			tauriAssistant: port,
			tauriAttachments: {
				folder,
				files: privateFolder,
			},
			folders,
			claudeOptions,
			drops: new TauriFileDrops(drags, chat, bridge),
			workspace: {
				client: workspace.client,
				folder: workspaceFolderCell(workspace.opened),
			},
			chatDrafts,
		},
	};
}

export function folderLending(bridge: Pick<AssistantBridge, "pickFolder">): FolderPicker & LentFolders {
	const held: { lent: readonly string[] } = { lent: [] };
	return {
		pick: () => bridge.pickFolder(),
		lend: (paths) => {
			held.lent = paths;
		},
		take: () => {
			const lent = held.lent;
			held.lent = [];
			return lent;
		},
	};
}
