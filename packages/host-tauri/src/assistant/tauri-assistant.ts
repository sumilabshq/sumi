import { Channel, invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ClaudeOptionsHeld, tauriAssistantGateways } from "@widgetarium/assistant/gateways";
import type { AssistantGateways, FolderPicker, WorkingFolderGateway } from "@widgetarium/assistant/gateways";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { tauriAssistantBridge } from "./assistant-bridge.js";
import type { AssistantBridge, TauriIpc } from "./assistant-bridge.js";
import type { LentFolders } from "./tauri-assistant-port.js";
import { tauriAssistantPort } from "./tauri-assistant-port.js";
import { TauriFileDropGateway } from "./tauri-file-drop.js";
import type { ChatSpot, WebviewDragSource } from "./tauri-file-drop.js";
import { tauriPrivateFolder } from "./tauri-private-folder.js";
import type { ChatHistory } from "./turn-session.js";

export interface TauriAssistant {
	readonly port: AssistantPort;
	readonly gateways: AssistantGateways;
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
	readonly workingFolderGateway: WorkingFolderGateway;
	readonly ipc?: TauriIpc;
	readonly page?: object;
	readonly history?: ChatHistory;
	readonly drags?: WebviewDragSource;
	readonly chat?: ChatSpot;
}

export function startTauriAssistant({
	workingFolderGateway,
	ipc = tauriIpc,
	page = window,
	history,
	drags = webviewDrags,
	chat = chatColumn,
}: TauriAssistantAsk): TauriAssistant {
	const bridge = tauriAssistantBridge(ipc);
	const privateFolder = tauriPrivateFolder(bridge);
	const folders = folderLending(bridge);
	const claudeOptions = new ClaudeOptionsHeld();
	const port = tauriAssistantPort({
		bridge,
		attachments: privateFolder,
		folders,
		claude: claudeOptions,
		...(history === undefined ? {} : { history }),
	});
	const folder = attachmentsFolderIn(page);
	return {
		port,
		gateways: tauriAssistantGateways({
			port,
			attachments: folder === null ? null : { privateFolder, folder },
			folderPicker: folders,
			claudeOptions,
			workingFolderGateway,
			fileDropGateway: new TauriFileDropGateway(drags, chat, bridge),
		}),
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
