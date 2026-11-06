import { getCurrentWindow } from "@tauri-apps/api/window";
import { nativeWebPagesOver, startStudio, startStudioApp } from "@widgetarium/studio";
import type { StartedStudio, StudioStart } from "@widgetarium/studio";
import { setTracing } from "@widgetarium/core/trace.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { openAgentTools } from "../agent/agent-tools.js";
import { tabLinksRenderer } from "../agent/tab-links.js";
import { AppTabsQuery } from "@widgetarium/app-host";
import { chatSessionLinkOf } from "../assistant/chat-session-link.js";
import { startTauriAssistant } from "../assistant/tauri-assistant.js";
import type { TauriAssistant } from "../assistant/tauri-assistant.js";
import { readChatLogs } from "../chat/tauri-chat-history.js";
import type { TauriChatLogs } from "../chat/tauri-chat-history.js";
import { TauriChatDraftShelf } from "../chat/tauri-chat-drafts.js";
import { tauriDraftFiles } from "../chat/tauri-draft-files.js";
import { TauriChatQueueShelf } from "../chat/tauri-chat-queues.js";
import { savesBeforeQuit } from "./saves-before-quit.js";
import { liveWindowLabels, ownWindowLabel } from "../chat/tauri-windows.js";
import type { HeldSettings } from "../settings/settings-doc.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { RemoteTransport, StartedApp } from "@widgetarium/core/requests";
import { tauriStudioHost } from "../tauri-studio-host.js";
import { ipcTransport } from "../core-link/ipc-transport.js";
import { joinPlaces } from "../core-link/window-places.js";
import { tauriWorkspaceApps } from "../workspace/tauri-workspace-apps.js";
import { reopensOnWorkspaceSwitch } from "../workspace/workspace-switch.js";
import type { WorkspaceClient } from "../workspace/workspace-client.js";
import type { WorkspaceEntry } from "../workspace/workspace-docs.js";

export interface StudioOpening {
	readonly project: WidgetariumProject;
	readonly store: StoreClient;
	readonly workspaces: WorkspaceClient;
	readonly settings: HeldSettings;
	readonly workspace: WorkspaceEntry;
}

type StudioStartedFields = Pick<StudioStart, "assistant" | "assistantHost" | "studioApp" | "core" | "nativeWebPages">;

interface StartedParts {
	readonly studioApp: StartedApp;
	readonly assistant: TauriAssistant;
	readonly core: RemoteTransport;
}

interface HeldWorkspaceDocs {
	readonly logs: TauriChatLogs;
	readonly chatDrafts: TauriChatDraftShelf;
	readonly chatQueues: TauriChatQueueShelf;
}

interface WorkspaceDocs extends HeldWorkspaceDocs {
	readonly flushAll: () => Promise<void>;
}

interface Flushed {
	flush(): Promise<void>;
}

export async function openTauriStudio(opening: StudioOpening): Promise<StartedStudio> {
	setTracing(opening.settings.now().trace);
	const docs = await readWorkspaceDocs(opening);
	const joined = joinPlaces(opening.workspace.id);
	void getCurrentWindow().onCloseRequested(docs.flushAll);
	savesBeforeQuit(docs.flushAll);
	const core = ipcTransport(opening.workspace.id);
	const studioApp = startTauriStudioApp(opening.workspace.id, core);
	reopensOnWorkspaceSwitch(studioApp, opening.workspace.id, () =>
		reopenWindow(async () => {
			await Promise.all([docs.flushAll(), joined.leave()]);
		}),
	);
	const assistant = startTauriAssistant({
		chatDrafts: docs.chatDrafts,
		chatQueues: docs.chatQueues,
		renderMarkdown: tabLinksRenderer((id) => tabFaviconOf(studioApp, id)),
		workspace: {
			client: opening.workspaces,
			opened: opening.workspace,
		},
		chats: {
			...chatSessionLinkOf(studioApp),
			historyOf: docs.logs.historyOf,
		},
	});
	openAgentTools(studioApp, assistant.port);
	await assistant.port.shownRead();
	return startedStudioOf(opening, { studioApp, assistant, core });
}

function startTauriStudioApp(workspaceId: string, core: RemoteTransport): StartedApp {
	return startStudioApp({
		platform: "tauri",
		workspaceId,
		core,
	});
}

async function reopenWindow(leaveWindow: () => Promise<void>): Promise<void> {
	await leaveWindow();
	window.location.reload();
}

async function readWorkspaceDocs(opening: StudioOpening): Promise<WorkspaceDocs> {
	const docs = await readHeldDocs(opening);
	return {
		...docs,
		flushAll: async () => {
			await Promise.all(flushedDocsOf(opening.settings, docs).map((doc) => doc.flush()));
		},
	};
}

function flushedDocsOf(settings: HeldSettings, docs: HeldWorkspaceDocs): readonly Flushed[] {
	return [settings, docs.logs.sessions, docs.chatDrafts, docs.chatQueues];
}

async function readHeldDocs({ store, workspace }: StudioOpening): Promise<HeldWorkspaceDocs> {
	const kept = {
		store,
		files: tauriDraftFiles,
		workspaceId: workspace.id,
	};
	const [logs, chatDrafts, chatQueues] = await Promise.all([
		readChatLogs(store, workspace.id),
		TauriChatDraftShelf.read(kept),
		TauriChatQueueShelf.read({
			...kept,
			ownWindow: ownWindowLabel(),
			liveWindows: liveWindowLabels,
		}),
	]);
	return {
		logs,
		chatDrafts,
		chatQueues,
	};
}

function startedStudioOf(opening: StudioOpening, started: StartedParts): StartedStudio {
	return startStudio(opening.project, {
		appId: opening.workspace.id,
		studio: studioHostOf(opening, started.studioApp),
		...startedPartsFieldsOf(started),
	});
}

function studioHostOf({ project, workspaces }: StudioOpening, workspacesApp: StartedApp): StudioHostPort {
	return tauriStudioHost(project, tauriWorkspaceApps({ workspaces, workspacesApp }));
}

function startedPartsFieldsOf({ assistant, studioApp, core }: StartedParts): StudioStartedFields {
	return {
		assistant: assistant.port,
		assistantHost: assistant.host,
		studioApp,
		nativeWebPages: nativeWebPagesOver(studioApp),
		core,
	};
}

async function tabFaviconOf(studioApp: StartedApp, id: string): Promise<string | null> {
	const tabs = await studioApp.send(AppTabsQuery);

	if (!tabs.ok) {
		console.warn(`[agent] the icon of a tab link to ${id} stays a glyph: ${tabs.reason}`);
		return null;
	}

	return tabs.output.tabs.find((tab) => tab.id === id)?.favicon ?? null;
}
