import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryDocStore } from "@sumi/contract";
import { AppProvider, app, localTransport, useQuery } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { AppInstallerModule } from "../packages/state/app-installer/module.ts";
import { MemoryAppsGateway } from "../packages/state/app-installer/gateways/apps/memory.gateway.ts";
import type { ReleaseRead } from "../packages/state/app-installer/gateways/apps/apps.gateway.ts";
import { InstallAppCommand } from "../packages/state/app-installer/generated/contract.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { AppFacesQuery, AppTabsQuery } from "../packages/domain/app-host/generated/contract.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { KeptBoardQuery, TasksModule as TasksContract } from "../packages/domain/tasks/generated/contract.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import { TASKS_DOC_KEY } from "../packages/domain/tasks/shared/schema/kept-board.schema.ts";
import { AppFramesProvider } from "../apps/studio/src/features/app-frame/ui/app-frames/app-frames-provider.tsx";
import { InstalledAppPage } from "../apps/studio/src/features/app-frame/ui/installed-app-page/installed-app-page.tsx";
import { frameServicesOf } from "../apps/studio/src/features/app-frame/lib/frame-services.ts";
import { appPageOf } from "../apps/studio/src/frame/app-page-of.tsx";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { reportsFailures } from "./page-harness.ts";
import { placedTabsOf, placesOver } from "./places-fixture.ts";
import { seededBoard } from "./tasks-fixture.ts";

declare global {
	interface Window {
		__TASKS_RELEASE__?: ReleaseRead;
		__tasksApp?: TasksAppDriver;
	}
}

interface TasksAppDriver {
	readonly install: () => Promise<unknown>;
	readonly reloadFrame: () => void;
	readonly writeOver: (baseRev: number) => Promise<unknown>;
	readonly read: () => Promise<unknown>;
}

reportsFailures();

const TASKS_FOLDER = "/releases/tasks";
const TAB_ID = "t1";
const READY_TASK = "T-147";
const WORKSPACE = "default";
const storage = new MemoryDocStore();
void storage.write(TASKS_DOC_KEY, seededBoard(Date.now()), 0);

const tasksLink = localTransport();
server()
	.modules(TasksModule)
	.listen(tasksLink)
	.start({
		env: {},
		scope: {
			workspaceId: WORKSPACE,
		},
		host: {
			storage,
		},
	});

const release = window.__TASKS_RELEASE__;
const apps = new MemoryAppsGateway({
	registry: {
		apps: [
			{
				id: "tasks",
				source: {
					kind: "folder",
					path: TASKS_FOLDER,
				},
			},
		],
	},
	folders: release === undefined ? {} : { [TASKS_FOLDER]: release },
	fileUrlOf: ({ id, version }, file) => `/apps/${id}/${version}/${file}`,
});
const tabs = new MemoryTabsGateway(
	placedTabsOf({
		tabs: [
			{
				id: TAB_ID,
				app: "tasks",
				pageId: null,
				label: null,
				lastAddress: READY_TASK,
			},
		],
		shownId: TAB_ID,
		minted: 1,
		closed: [],
	}),
);
const studio = app()
	.modules(
		AppInstallerModule.with({
			apps,
		}),
		AppHostModule,
		BrowserModule.with(fakeBrowser(new FakeBrowserPagesGateway()).parts),
		LayoutModule,
		WorkspacesModule.with(
			memoryWorkspacesParts({
				workspaces: [
					{
						id: WORKSPACE,
						name: "Widgetarium",
						icon: null,
					},
				],
				currentId: WORKSPACE,
				chats: {
					chats: [],
					openOnStartId: null,
				},
			}),
		),
	)
	.imports(placesOver(tabs), TasksContract.over(tasksLink))
	.start({ platform: "browser", scope: { workspaceId: WORKSPACE } });

let loads = 0;
const loadListeners = new Set<() => void>();

function onLoads(told: () => void): () => void {
	loadListeners.add(told);
	return () => loadListeners.delete(told);
}

async function outputOf(answer: Promise<{ ok: boolean; output?: unknown; reason?: string }>): Promise<unknown> {
	const settled = await answer;
	return settled.ok ? settled.output : { refused: settled.reason };
}

window.__tasksApp = {
	install: async () => {
		const installed = await outputOf(studio.send(InstallAppCommand, { id: "tasks" }));
		await studio.queryClient.invalidateQueries();
		return installed;
	},
	reloadFrame: () => {
		loads += 1;
		loadListeners.forEach((told) => told());
	},
	writeOver: async (baseRev) => {
		const held = await storage.read(TASKS_DOC_KEY);
		return frameServicesOf("tasks", studio.send.bind(studio))("storage", {
			op: "write",
			key: TASKS_DOC_KEY,
			doc: held.doc,
			baseRev,
		});
	},
	read: async () => {
		const [kept, appTabs] = await Promise.all([studio.send(KeptBoardQuery), studio.send(AppTabsQuery)]);
		return {
			rev: kept.ok ? kept.output.rev : kept.reason,
			statuses: kept.ok
				? Object.fromEntries(kept.output.board.tasks.map((task) => [`T-${task.number}`, task.status]))
				: {},
			tabs: appTabs.ok ? appTabs.output.tabs.map(({ app: tabApp, address }) => ({ app: tabApp, address })) : [],
			frame: document.querySelector("iframe")?.getAttribute("data-app-frame-src") ?? null,
			isBuiltIn: document.querySelector("[data-built-in-tasks]") !== null,
		};
	},
};

function TasksTab(): ReactElement {
	const generation = useSyncExternalStore(onLoads, () => loads);
	const { faces } = useQuery(AppFacesQuery).data;
	const builtIn = (): ReactElement => <p data-built-in-tasks="">The built-in Tasks page</p>;
	return (
		<AppFramesProvider>
			<div style={{ height: "640px" }}>
				{appPageOf({
					app: "tasks",
					faces,
					builtIn: {
						tasks: builtIn,
						canvas: builtIn,
						browser: builtIn,
						terminal: builtIn,
					},
					installed: () => <InstalledAppPage key={generation} app="tasks" tabId={TAB_ID} isShown />,
				})}
			</div>
		</AppFramesProvider>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(
		<AppProvider app={studio}>
			<TasksTab />
		</AppProvider>,
	);
}
