import { getCurrentWindow } from "@tauri-apps/api/window";
import { startStudio, startStudioApp, startSumiPlugins } from "@widgetarium/studio";
import type { ResolvedPlugins, StartedStudio, StudioStart } from "@widgetarium/studio";
import { setTracing } from "@widgetarium/core/trace.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { openAgentRelay } from "../agent/agent-relay.js";
import { tabLinksRenderer } from "../agent/tab-links.js";
import { appHost } from "@widgetarium/app-host/contract";
import { chatSessionLinkOf } from "../assistant/chat-session-link.js";
import { startTauriAssistant } from "../assistant/tauri-assistant.js";
import type { TauriAssistant } from "../assistant/tauri-assistant.js";
import { readChatLogs } from "../chat/tauri-chat-history.js";
import type { TauriChatLogs } from "../chat/tauri-chat-history.js";
import { TauriChatDraftShelf } from "../chat/tauri-chat-drafts.js";
import { tauriDraftFiles } from "../chat/tauri-draft-files.js";
import { TauriChatQueueShelf } from "../chat/tauri-chat-queues.js";
import { savesBeforeQuit } from "./saves-before-quit.js";
import { tauriStudioLent } from "./tauri-studio-lent.js";
import type { SaveForQuit } from "./saves-before-quit.js";
import { liveWindowLabels, ownWindowLabel } from "../chat/tauri-windows.js";
import type { HeldSettings } from "../settings/settings-doc.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { RemoteTransport, Runtime } from "@widgetarium/data-framework";
import { tauriStudioHost } from "../tauri-studio-host.js";
import { pluginStateOf } from "../plugins/plugin-state.js";
import { ipcTransport } from "../core-link/ipc-transport.js";
import { joinPlaces } from "../core-link/window-places.js";
import { tauriWorkspaceApps } from "../workspace/tauri-workspace-apps.js";
import { reopensOnWorkspaceSwitch } from "../workspace/workspace-switch.js";
import type { WorkspaceClient } from "../workspace/workspace-client.js";
import type { WorkspaceEntry } from "../workspace/workspace-docs.js";
import { TauriSecretVault } from "../secrets/tauri-secret-vault.js";
import { followStudioLogContext } from "../studio-log-context.js";

export interface StudioOpening {
	readonly project: WidgetariumProject;
	readonly store: StoreClient;
	readonly workspaces: WorkspaceClient;
	readonly settings: HeldSettings;
	readonly workspace: WorkspaceEntry;
}

type StudioStartedFields = Pick<
	StudioStart,
	"plugins" | "assistant" | "assistantHost" | "studioApp" | "core" | "platform"
>;

const PLUGIN_REFUSED = "[studio] workspace {workspace}: plugins: {refusal}";

interface StartedParts {
	readonly plugins: ResolvedPlugins;
	readonly studioApp: Runtime;
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
	readonly saveForQuit: SaveForQuit;
}

interface Flushed {
	flush(): Promise<void>;
	saveUntil(untilMs: number): Promise<readonly string[]>;
}

export async function openTauriStudio(opening: StudioOpening): Promise<StartedStudio> {
	setTracing(opening.settings.now().trace);
	const docs = await readWorkspaceDocs(opening);
	const joined = joinPlaces(opening.workspace.id);
	void getCurrentWindow().onCloseRequested(docs.flushAll);
	void savesBeforeQuit(docs.saveForQuit).catch((failure: unknown) => {
		console.error("[ink] quit handshake none → none: this window quits without saving first", failure);
	});
	const core = ipcTransport(opening.workspace.id);
	const plugins = await pluginsOf(opening);
	const studioApp = startTauriStudioApp(opening, core, plugins);
	followStudioLogContext(studioApp, opening.workspace.id);
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
	await assistant.port.shownRead();
	const started = startedStudioOf(opening, { plugins, studioApp, assistant, core });
	openAgentRelay(started.agentMcpServers, {
		queue: assistant.port,
		opensLink: async (href, opensNew) => {
			const answer = await studioApp.send(appHost.links.openLink, { href, opensNew });
			return answer.ok ? null : answer.reason;
		},
	});
	return started;
}

function startTauriStudioApp(
	{ workspace, store }: StudioOpening,
	core: RemoteTransport,
	plugins: ResolvedPlugins,
): Runtime {
	return startStudioApp({
		platform: "tauri",
		workspaceId: workspace.id,
		core,
		lent: tauriStudioLent(store),
		backgroundModules: plugins.backgroundModules,
		windowModules: plugins.windowModules,
	});
}

async function pluginsOf({ store, workspace }: StudioOpening): Promise<ResolvedPlugins> {
	const plugins = startSumiPlugins(await pluginStateOf(store, workspace.id), new TauriSecretVault(store));

	for (const refusal of plugins.refusals) {
		console.warn(PLUGIN_REFUSED.replace("{workspace}", workspace.id).replace("{refusal}", refusal));
	}

	return plugins;
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
		saveForQuit: async (untilMs) => {
			const unsaved = await Promise.all(flushedDocsOf(opening.settings, docs).map((doc) => doc.saveUntil(untilMs)));
			return unsaved.flat();
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

function studioHostOf({ project, workspaces }: StudioOpening, workspacesApp: Runtime): StudioHostPort {
	return tauriStudioHost(project, tauriWorkspaceApps({ workspaces, workspacesApp }));
}

function startedPartsFieldsOf({ plugins, assistant, studioApp, core }: StartedParts): StudioStartedFields {
	return {
		plugins,
		assistant: assistant.port,
		assistantHost: assistant.host,
		studioApp,
		platform: "tauri",
		core,
	};
}

async function tabFaviconOf(studioApp: Runtime, id: string): Promise<string | null> {
	const tabs = await studioApp.send(appHost.tabs.appTabs);

	if (!tabs.ok) {
		console.warn(`[agent] the icon of a tab link to ${id} stays a glyph: ${tabs.reason}`);
		return null;
	}

	return tabs.output.tabs.find((tab) => tab.id === id)?.favicon ?? null;
}
