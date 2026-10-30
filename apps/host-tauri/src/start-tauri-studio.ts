import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import "@widgetarium/studio/studio.css";
import "./host-page.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { followColourScheme } from "@widgetarium/core/app";
import { isCorePage, isTearOffGhostPage } from "@widgetarium/behaviors";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import type { StartedStudio } from "@widgetarium/studio";
import { openTauriStudio } from "./startup/open-tauri-studio.js";
import { TauriOpening } from "./startup/tauri-opening.js";
import { TauriStartup } from "./startup/tauri-startup.js";
import { StoreClient, hearStoreChangesWith } from "@widgetarium/behaviors/tauri-store";
import { WorkspaceClient } from "./workspace/workspace-client.js";
import { forwardStudioLogs } from "./studio-log.js";
import { profiledRoot, startStudioProfiler } from "./profiler/studio-profiler.js";
import { followWindowDrag } from "./window-drag.js";
import { startCore } from "./core-link/start-core.js";

const STUDIO_LOG_LINE = "plugin:studio-log|line";

export function startTauriStudio(project: WidgetariumProject): ReactElement {
	if (isTearOffGhostPage(location.search)) {
		return h(Fragment);
	}

	forwardLogsToHost();
	const ownLabel = getCurrentWebviewWindow().label;
	const profiler = startStudioProfiler(window, ownLabel);
	followColourScheme();
	followWindowDrag();
	hearStoreChangesWith({
		listen: hearTauriEvent,
		ownLabel,
	});
	if (isCorePage(location.search)) {
		startCore();
		return h(Fragment);
	}

	return profiledRoot(profiler, h(TauriStartup, { opening: startOpening(project) }));
}

function startOpening(project: WidgetariumProject): TauriOpening<StartedStudio> {
	const store = new StoreClient(tauriInvoke);
	const workspaces = new WorkspaceClient(tauriInvoke);
	const opening = new TauriOpening({
		store,
		workspaces,
		openStudio: (settings, workspace) => openTauriStudio({ project, store, workspaces, settings, workspace }),
	});
	void opening.start();
	return opening;
}

function forwardLogsToHost(): void {
	forwardStudioLogs({
		send: (level, line) => invoke(STUDIO_LOG_LINE, { level, line }),
		logged: console,
		page: window,
	});
}

function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}

function hearTauriEvent(event: string, heard: (payload: unknown) => void): void {
	void getCurrentWebviewWindow().listen(event, (got) => heard(got.payload));
}
