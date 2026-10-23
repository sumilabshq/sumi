import { createElement as h } from "react";
import type { ReactElement } from "react";
import "@widgetarium/studio/studio.css";
import "./host-page.css";
import { invoke } from "@tauri-apps/api/core";
import { followColourScheme } from "@widgetarium/core/app";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { openTauriStudio } from "./startup/open-tauri-studio.js";
import { TauriOpening } from "./startup/tauri-opening.js";
import { TauriStartup } from "./startup/tauri-startup.js";
import { StoreClient } from "./store/store-client.js";
import { WorkspaceClient } from "./workspace/workspace-client.js";
import { forwardStudioLogs } from "./studio-log.js";
import { followWindowDrag } from "./window-drag.js";

const STUDIO_LOG_LINE = "plugin:studio-log|line";

export function startTauriStudio(project: WidgetariumProject): ReactElement {
	forwardStudioLogs({
		send: (level, line) => invoke(STUDIO_LOG_LINE, { level, line }),
		logged: console,
		page: window,
	});
	followColourScheme();
	followWindowDrag();
	const store = new StoreClient(tauriInvoke);
	const workspaces = new WorkspaceClient(tauriInvoke);
	const opening = new TauriOpening({
		store,
		workspaces,
		openStudio: (settings, workspace) => openTauriStudio({ project, store, workspaces, settings, workspace }),
	});
	void opening.start();
	return h(TauriStartup, { opening });
}

function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}
