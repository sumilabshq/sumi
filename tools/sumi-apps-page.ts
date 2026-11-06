import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { app, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport } from "../packages/shared/data-framework/src/index.ts";
import type { WidgetariumProject } from "../packages/shared/core/src/app/widgetarium-project.ts";
import { corePack } from "../packages/shared/packs/core/src/index.ts";
import type { RegisteredApp } from "../packages/shared/app-registry/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { AppTabsQuery, OpenChatCommand, ShowTabCommand } from "../packages/domain/app-host/generated/contract.ts";
import { ChooseThemeCommand } from "../packages/state/appearance/generated/contract.ts";
import { startStudioAppearance } from "../apps/studio/src/tabs/studio-appearance.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { CommandMenuModule } from "../packages/domain/command-menu/module.ts";
import { CommandMenuResultsQuery } from "../packages/domain/command-menu/index.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { AppTabQuery, PlacesModule } from "../packages/state/places/generated/contract.ts";
import { TasksModule } from "../packages/domain/tasks/index.ts";
import { WidgetariumStudio, startStudio } from "../apps/studio/src/legacy/widgetarium-studio.ts";
import { restoreTabs } from "../apps/studio/src/tabs/studio-app.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { echoAssistantPort } from "./echo-assistant-port.ts";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";
import { SUMI_APPS_WORKSPACE, SUMI_CHAT_TAB } from "./sumi-apps-seed.ts";

declare global {
	interface Window {
		__SUMI_APP_ORIGIN__?: string;
		__sumiApps?: SumiAppsDriver;
	}
}

interface SumiAppsDriver {
	readonly showTab: (id: string) => Promise<unknown>;
	readonly openChat: () => Promise<unknown>;
	readonly tab: (id: string) => Promise<unknown>;
	readonly tabs: () => Promise<unknown>;
	readonly menuResults: (text: string) => Promise<unknown>;
	readonly chooseTheme: (choice: "system" | "light" | "dark") => Promise<unknown>;
}

reportsFailures();

const PROJECT: WidgetariumProject = {
	app: {
		name: SUMI_APPS_WORKSPACE,
		iconHref: "",
	},
	routes: [],
	widgets: {},
	handlers: {},
	packs: [corePack],
};

const overHttp = orpcTransport(location.origin);
const NOT_ABORTED = new AbortController().signal;
// TRADE-OFF: no abort, like the Tauri IPC transport; an aborted call leaves app-host/held-tabs stale
const core: RemoteTransport = {
	call: (call) =>
		overHttp.call({
			...call,
			signal: NOT_ABORTED,
		}),
	changes: (hear) => overHttp.changes(hear),
};
const studioApp = app()
	.modules(
		LayoutModule,
		BrowserModule.with(fakeBrowser(new FakeBrowserPagesGateway()).parts),
		WorkspacesModule.with(
			memoryWorkspacesParts({
				workspaces: [
					{
						id: SUMI_APPS_WORKSPACE,
						name: "Sumi apps",
						icon: null,
					},
				],
				currentId: SUMI_APPS_WORKSPACE,
				chats: {
					chats: [
						{
							id: SUMI_CHAT_TAB,
							title: "End to end",
							createdAt: 1,
							lastAt: 1,
						},
					],
					openOnStartId: null,
				},
			}),
		),
		AppHostModule,
		CommandMenuModule,
	)
	.imports(PlacesModule.over(core), TasksModule.over(core))
	.start({
		platform: "browser",
		scope: {
			workspaceId: SUMI_APPS_WORKSPACE,
		},
	});
async function outputOf(answer: Promise<{ ok: boolean; output?: unknown; reason?: string }>): Promise<unknown> {
	const settled = await answer;
	return settled.ok ? settled.output : { refused: settled.reason };
}

function servedPageUrlOf({ id, ui }: RegisteredApp): string {
	return `${window.__SUMI_APP_ORIGIN__ ?? ""}/apps/${id}/${ui}`;
}

const appearance = startStudioAppearance(window);
const driver: SumiAppsDriver = {
	showTab: (id) => outputOf(studioApp.send(ShowTabCommand, { id })),
	tab: (id) => outputOf(studioApp.send(AppTabQuery, { id })),
	tabs: () => outputOf(studioApp.send(AppTabsQuery)),
	menuResults: (text) =>
		outputOf(
			studioApp.send(CommandMenuResultsQuery, {
				text,
				door: "anywhere",
				pageId: null,
			}),
		),
	chooseTheme: (choice) => outputOf(appearance.appearanceApp.send(ChooseThemeCommand, { choice })),
	openChat: () =>
		outputOf(
			studioApp.send(OpenChatCommand, {
				chatId: SUMI_CHAT_TAB,
				paneId: null,
			}),
		),
};
void restoreTabs(studioApp).then(() => {
	window.__sumiApps = driver;
});

const root = document.getElementById("root");

try {
	const echo = echoAssistantPort();
	const started = startStudio(PROJECT, {
		appId: SUMI_APPS_WORKSPACE,
		core,
		studioApp,
		appearance,
		assistant: echo,
		assistantHost: {
			kind: "web",
			webAssistant: echo,
		},
		appPageUrlOf: servedPageUrlOf,
	});

	if (root !== null) {
		createRoot(root).render(h(WidgetariumStudio, { started }));
	}
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}
