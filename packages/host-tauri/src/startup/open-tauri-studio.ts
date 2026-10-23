import { getCurrentWindow } from "@tauri-apps/api/window";
import { createStudioState, startStudio, startedAppHostParts } from "@widgetarium/studio";
import type { StartedStudio } from "@widgetarium/studio";
import { setTracing } from "@widgetarium/core/trace.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { startTauriAssistant } from "../assistant/tauri-assistant.js";
import { startTauriBrowser } from "../browser/tauri-browser.js";
import { readChatHistory } from "../chat/tauri-chat-history.js";
import type { TauriChatHistory } from "../chat/tauri-chat-history.js";
import { DEFAULT_PROFILE, readProfile } from "../profile/profile-docs.js";
import type { TauriProfile } from "../profile/profile-docs.js";
import { tauriProfileGateways } from "../profile/tauri-profile-gateways.js";
import { TauriTabsColumnGateway, TauriTabsSessionGateway, readSession } from "../session/tauri-session.js";
import type { HeldSession } from "../session/tauri-session.js";
import type { HeldSettings } from "../settings/settings-doc.js";
import { settingsPxMemory } from "../settings/settings-px-memory.js";
import type { StoreClient } from "../store/store-client.js";
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

interface WorkspaceDocs {
	readonly session: HeldSession;
	readonly profile: TauriProfile;
	readonly history: TauriChatHistory;
	readonly flushAll: () => Promise<void>;
}

export async function openTauriStudio(opening: StudioOpening): Promise<StartedStudio> {
	setTracing(opening.settings.now().trace);
	const docs = await readWorkspaceDocs(opening);
	void getCurrentWindow().onCloseRequested(docs.flushAll);
	return startedStudioOf(opening, docs);
}

async function readWorkspaceDocs({ store, settings, workspace }: StudioOpening): Promise<WorkspaceDocs> {
	const [session, profile, history] = await Promise.all([
		readSession(store, workspace.id),
		readProfile(store, DEFAULT_PROFILE),
		readChatHistory(store, workspace.id),
	]);
	const held = [settings, session, profile.grants, profile.recentSites, history.index];
	return {
		session,
		profile,
		history,
		flushAll: async () => {
			await Promise.all(held.map((doc) => doc.flush()));
		},
	};
}

function startedStudioOf(opening: StudioOpening, docs: WorkspaceDocs): StartedStudio {
	const { project, workspaces, settings, workspace } = opening;
	const reopen = async (): Promise<void> => {
		await docs.flushAll();
		window.location.reload();
	};
	const studio = tauriStudioHost(project, tauriWorkspaceApps({ workspaces, reopen }));
	const state = createStudioState(settingsPxMemory(settings, "chatWidthPx"));
	const browser = startTauriBrowser(tauriProfileGateways(docs.profile));
	const assistant = startTauriAssistant({
		workingFolderGateway: new TauriWorkingFolderGateway(workspaces, workspace),
		history: docs.history,
	});
	const kept = {
		tabsSessionGateway: new TauriTabsSessionGateway(docs.session),
		tabsColumnGateway: new TauriTabsColumnGateway(docs.session),
	};
	return startStudio(project, {
		appId: workspace.id,
		studio,
		state,
		browser,
		assistant: assistant.port,
		assistantGateways: assistant.gateways,
		appHost: startedAppHostParts({ state, browser, workspace: workspace.id, studio, kept }),
	});
}
