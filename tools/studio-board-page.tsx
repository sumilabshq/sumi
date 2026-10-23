import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { NO_ASSISTANT } from "../packages/core/src/engine/assistant-port.js";
import { NO_STUDIO_HOST } from "../packages/core/src/engine/studio-host.js";
import type { WidgetariumProject } from "../packages/core/src/app/widgetarium-project.js";
import { corePack } from "../packages/packs/core/src/index.js";
import { BESIDE_TRAFFIC_LIGHTS } from "../packages/host-tauri/src/tauri-studio-host.js";
import { WidgetariumStudio, startStudio } from "../apps/studio/src/legacy/widgetarium-studio.js";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.js";
import { NO_ESSENTIALS, SwitchedChat, exactAppHostParts } from "./studio-exact-fixture.ts";
import { boardWorkspacesParts } from "./board-workspaces-fixture.ts";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

const PROJECT: WidgetariumProject = {
	app: { name: "Default", iconHref: "" },
	routes: [{ path: "/", params: [], board: { v: 2, tiles: [], layout: { dir: "column", of: [] } } }],
	widgets: {},
	handlers: {},
	packs: [corePack],
};

const state = createStudioState();
const workspaces = boardWorkspacesParts("board");
const started = startStudio(PROJECT, {
	assistant: { ...NO_ASSISTANT, can: true },
	state,
	appId: "Default",
	studio: { ...NO_STUDIO_HOST, insets: () => BESIDE_TRAFFIC_LIGHTS },
	appHost: new URLSearchParams(location.search).has("bare")
		? exactAppHostParts(state, new SwitchedChat(), NO_ESSENTIALS)
		: exactAppHostParts(state),
	workspaces,
});
Reflect.set(window, "__studio", { workspaces, state });

const root = document.getElementById("root");
if (root === null) {
	throw new Error("the page holds no #root");
}

try {
	createRoot(root).render(h(WidgetariumStudio, { started }));
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}
