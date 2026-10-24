import { getCurrentWindow } from "@tauri-apps/api/window";
import { createStudioState, startLayoutApp, startStudio, startedAppHostParts } from "@widgetarium/studio";
import type { StartedStudio, StudioStart } from "@widgetarium/studio";
import { setTracing } from "@widgetarium/core/trace.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { startTauriAssistant } from "../assistant/tauri-assistant.js";
import type { TauriAssistant } from "../assistant/tauri-assistant.js";
import { startTauriBrowser } from "../browser/tauri-browser.js";
import { readChatLogs } from "../chat/tauri-chat-history.js";
import type { TauriChatLogs } from "../chat/tauri-chat-history.js";
import { TauriChatsGateway, readChats } from "../chat/tauri-chats.js";
import type { HeldChats } from "../chat/tauri-chats.js";
import { chatSessionLinkOf, workspacesPartsOf } from "@widgetarium/workspaces/gateways";
import type { WorkspacesParts } from "@widgetarium/workspaces/gateways";
import { TauriWorkspacesGateway } from "../workspace/tauri-workspaces.js";
import { readWorkspaceLooks } from "../workspace/workspace-looks.js";
import type { HeldLooks } from "../workspace/workspace-looks.js";
import { DEFAULT_PROFILE, readProfile } from "../profile/profile-docs.js";
import type { TauriProfile } from "../profile/profile-docs.js";
import { tauriProfileGateways } from "../profile/tauri-profile-gateways.js";
import { TauriEssentialsGateway, readEssentials } from "../session/tauri-essentials.js";
import type { HeldEssentials } from "../session/tauri-essentials.js";
import { TauriTabsColumnGateway, TauriTabsSessionGateway, readSession } from "../session/tauri-session.js";
import type { HeldSession } from "../session/tauri-session.js";
import type { HeldSettings } from "../settings/settings-doc.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { tauriStudioHost } from "../tauri-studio-host.js";
import { TauriWorkingFolderGateway } from "../workspace/tauri-working-folder.js";
import { tauriWorkspaceApps } from "../workspace/tauri-workspace-apps.js";
import type { WorkspaceClient } from "../workspace/workspace-client.js";
import type { WorkspaceEntry } from "../workspace/workspace-docs.js";

export interface StudioOpening {
	readonly project: WidgetariumProject;
	readonly store: StoreClient;
	readonly workspaces: WorkspaceClient;
	readonly settings: HeldSettings;
	readonly workspace: WorkspaceEntry;
}

type StudioStartedFields = Pick<StudioStart, "assistant" | "assistantGateways" | "workspaces">;

interface StartedParts {
	readonly workspacesParts: WorkspacesParts;
	readonly assistant: TauriAssistant;
}

interface HeldWorkspaceDocs {
	readonly session: HeldSession;
	readonly essentials: HeldEssentials;
	readonly profile: TauriProfile;
	readonly logs: TauriChatLogs;
	readonly chats: HeldChats;
	readonly looks: HeldLooks;
	readonly entries: readonly WorkspaceEntry[];
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
	void getCurrentWindow().onCloseRequested(docs.flushAll);
	const workspacesParts = tauriWorkspacesParts(opening, docs);
	const assistant = startTauriAssistant({
		workingFolderGateway: new TauriWorkingFolderGateway(opening.workspaces, opening.workspace),
		chats: {
			...chatSessionLinkOf(workspacesParts),
			historyOf: docs.logs.historyOf,
		},
	});
	await assistant.port.shownRead();
	return startedStudioOf(opening, docs, { workspacesParts, assistant });
}

function tauriWorkspacesParts({ workspaces, workspace }: StudioOpening, docs: WorkspaceDocs): WorkspacesParts {
	return workspacesPartsOf({
		workspacesGateway: new TauriWorkspacesGateway({
			workspaces,
			looks: docs.looks,
			entries: docs.entries,
			currentId: workspace.id,
			reopen: () => reopenWindow(docs),
		}),
		chatsGateway: new TauriChatsGateway(docs.chats, docs.logs.legacyChat),
	});
}

async function reopenWindow(docs: WorkspaceDocs): Promise<void> {
	await docs.flushAll();
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
	const { session, essentials, profile, logs, chats, looks } = docs;
	return [settings, session, essentials, profile.grants, profile.recentSites, logs.sessions, chats, looks];
}

async function readHeldDocs({ store, workspace, workspaces }: StudioOpening): Promise<HeldWorkspaceDocs> {
	const [session, essentials, profile, logs, chats, looks, entries] = await Promise.all([
		readSession(store, workspace.id),
		readEssentials(store),
		readProfile(store, DEFAULT_PROFILE),
		readChatLogs(store, workspace.id),
		readChats(store, workspace.id),
		readWorkspaceLooks(store),
		workspaces.list(),
	]);
	return { session, essentials, profile, logs, chats, looks, entries };
}

function startedStudioOf(opening: StudioOpening, docs: WorkspaceDocs, started: StartedParts): StartedStudio {
	const studio = studioHostOf(opening, docs, started.workspacesParts);
	const state = createStudioState();
	const browser = startTauriBrowser(tauriProfileGateways(docs.profile));
	const layoutApp = startLayoutApp({ platform: "tauri", workspaceId: opening.workspace.id });
	const kept = keptGatewaysOf(docs, started.workspacesParts);
	return startStudio(opening.project, {
		appId: opening.workspace.id,
		studio,
		state,
		layoutApp,
		browser,
		...startedPartsFieldsOf(started),
		appHost: startedAppHostParts({ state, browser, layoutApp, workspace: opening.workspace.id, studio, kept }),
	});
}

function studioHostOf(
	{ project, workspaces }: StudioOpening,
	docs: WorkspaceDocs,
	workspacesParts: WorkspacesParts,
): StudioHostPort {
	return tauriStudioHost(
		project,
		tauriWorkspaceApps({
			workspaces,
			reopen: () => reopenWindow(docs),
			nextName: () => workspacesParts.workspacesStore.nextUntitledName(),
		}),
	);
}

function keptGatewaysOf(docs: WorkspaceDocs, workspacesParts: WorkspacesParts) {
	return {
		tabsSessionGateway: new TauriTabsSessionGateway(docs.session),
		tabsColumnGateway: new TauriTabsColumnGateway(docs.session),
		essentialsGateway: new TauriEssentialsGateway(docs.essentials),
		activeChat: workspacesParts.activeChat,
	};
}

function startedPartsFieldsOf({ assistant, workspacesParts }: StartedParts): StudioStartedFields {
	return {
		assistant: assistant.port,
		assistantGateways: assistant.gateways,
		workspaces: workspacesParts,
	};
}
