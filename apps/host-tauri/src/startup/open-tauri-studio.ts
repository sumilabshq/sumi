import { getCurrentWindow } from "@tauri-apps/api/window";
import { startStudio, startStudioApp } from "@widgetarium/studio";
import type { StartedStudio, StudioStart } from "@widgetarium/studio";
import { setTracing } from "@widgetarium/core/trace.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { openAgentTools } from "../agent/agent-tools.js";
import { tabLinksRenderer } from "../agent/tab-links.js";
import { ShowTabCommand } from "@widgetarium/app-host";
import { chatSessionLinkOf } from "../assistant/chat-session-link.js";
import { startTauriAssistant } from "../assistant/tauri-assistant.js";
import type { TauriAssistant } from "../assistant/tauri-assistant.js";
import { readChatLogs } from "../chat/tauri-chat-history.js";
import type { TauriChatLogs } from "../chat/tauri-chat-history.js";
import type { HeldSettings } from "../settings/settings-doc.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { StartedApp } from "@widgetarium/core/requests";
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

type StudioStartedFields = Pick<StudioStart, "assistant" | "assistantHost" | "studioApp">;

interface StartedParts {
	readonly studioApp: StartedApp;
	readonly assistant: TauriAssistant;
}

interface HeldWorkspaceDocs {
	readonly logs: TauriChatLogs;
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
	const studioApp = startTauriStudioApp(opening.workspace.id);
	reopensOnWorkspaceSwitch(studioApp, opening.workspace.id, () =>
		reopenWindow(async () => {
			await Promise.all([docs.flushAll(), joined.leave()]);
		}),
	);
	openAgentTools(studioApp);
	const assistant = startTauriAssistant({
		renderMarkdown: tabLinksRenderer((id) => void showLinkedTab(studioApp, id)),
		workspace: {
			client: opening.workspaces,
			opened: opening.workspace,
		},
		chats: {
			...chatSessionLinkOf(studioApp),
			historyOf: docs.logs.historyOf,
		},
	});
	await assistant.port.shownRead();
	return startedStudioOf(opening, { studioApp, assistant });
}

function startTauriStudioApp(workspaceId: string): StartedApp {
	return startStudioApp({
		platform: "tauri",
		workspaceId,
		places: ipcTransport(workspaceId),
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
	return [settings, docs.logs.sessions];
}

async function readHeldDocs({ store, workspace }: StudioOpening): Promise<HeldWorkspaceDocs> {
	return { logs: await readChatLogs(store, workspace.id) };
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

function startedPartsFieldsOf({ assistant, studioApp }: StartedParts): StudioStartedFields {
	return {
		assistant: assistant.port,
		assistantHost: assistant.host,
		studioApp,
	};
}

async function showLinkedTab(studioApp: StartedApp, id: string): Promise<void> {
	const shown = await studioApp.send(ShowTabCommand, { id });

	if (!shown.ok) {
		console.warn(`[agent] a tab link to ${id} was pressed, but the tab is not shown: ${shown.reason}`);
	}
}
