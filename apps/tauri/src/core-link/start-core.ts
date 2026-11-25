import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { z } from "zod";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { localTransport, mountOrStop, runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { navigation as placesContract } from "@widgetarium/navigation/contract";
import { tasks } from "@widgetarium/tasks/contract";
import { AppCallerAuthenticate, startBackendServers, startSumiPlugins } from "@widgetarium/studio";
import type { ResolvedPlugins } from "@widgetarium/studio";
import { HOST_CAPABILITY_MODULES } from "../plugins/host-capabilities.js";
import { pluginStateOf } from "../plugins/plugin-state.js";
import { serveCore } from "./core-calls.js";
import type { CoreListener } from "./core-calls.js";
import { tasksBoardFileOver } from "./tasks-board-file.js";
import { CORE_LIVE_WINDOWS, CORE_WINDOW_CLOSED_EVENT, LiveWindowsSchema } from "./core-wire.js";
import { windowsLeftBehind } from "./joined-windows.js";
import type { JoinedWindow } from "./joined-windows.js";
import { TauriSecretVault } from "../secrets/tauri-secret-vault.js";
import { chatFacts } from "@sumi/chat-facts/contract";

const NOT_KEPT = "[studio-core] workspace {workspace}: the open windows were not checked ({reason})";
const TURNS_KEPT = "[studio-core] workspace {workspace}: running marks of the last run stay ({reason})";
const NOT_CLOSED = "[studio-core] workspace {workspace}: window {window} closed but stays listed ({reason})";
const LEFT_BEHIND =
	"[studio-core] workspace {workspace}: window {window} → none (it joined workspace {latest} later; its holds here end)";
const NOT_RECONCILED = "[tasks] workspace {workspace}: tasks in progress before this start stay in progress ({reason})";
const RECONCILED = "[tasks] workspace {workspace}: {count} tasks in progress → blocked (the app started, no turn runs)";
const NOT_COLD =
	"[tasks] workspace {workspace}: tasks in progress stay in progress (the core reloaded; the open windows may still run their turns)";
const NOT_SWEPT = "[tasks] workspace {workspace}: stale tasks stay open ({reason})";
const SWEPT = "[tasks] workspace {workspace}: {count} stale tasks → cancelled (the {when} sweep)";
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;
const LIVE_WINDOWS_EVERY_MS = 15 * 1000;
const CORE_IPC = "the core IPC";
const SERVING = "[studio-core] workspace {workspace}: none → serving, plugins {plugins}";
const PLUGIN_REFUSED = "[studio-core] workspace {workspace}: plugins: {refusal}";
const PLUGIN_NOTED = "[studio-core] workspace {workspace}: plugins: {note}";
const NOT_STARTED = "[studio-core] workspace {workspace}: none → failed, every call answers unreachable";

export function startCore(): void {
	const served = new Map<string, Runtime>();
	const store = new StoreClient((command, args) => invoke(command, args));
	serveCore((workspace, listener) => {
		void pluginsOrFailed(store, workspace, listener).then((plugins) => {
			if (plugins === null) {
				return;
			}

			const places = coreServedOrFailed({ workspace, listener, store, plugins });

			if (places === null) {
				return;
			}

			served.set(workspace, places);
			console.info(SERVING.replace("{workspace}", workspace).replace("{plugins}", plugins.startedIds.join(", ")));
			places.routes.watch(placesContract.windows.all, undefined, () => void keepWindowsInOneWorkspace(served));
			void keepLiveWindows(places, workspace);
			setInterval(() => void keepLiveWindows(places, workspace), LIVE_WINDOWS_EVERY_MS);
			void forgetRunningTurns(places, workspace);
			void superviseTasks(places, workspace);
		});
	});
	void getCurrentWebviewWindow().listen(CORE_WINDOW_CLOSED_EVENT, (event) => {
		const window = z.string().safeParse(event.payload);

		if (window.success) {
			closeEverywhere(served, window.data);
		}
	});
}

interface CoreServing {
	readonly workspace: string;
	readonly listener: CoreListener;
	readonly store: StoreClient;
	readonly plugins: ResolvedPlugins;
}

async function pluginsOrFailed(
	store: StoreClient,
	workspace: string,
	listener: CoreListener,
): Promise<ResolvedPlugins | null> {
	try {
		const plugins = startSumiPlugins(await pluginStateOf(store, workspace), new TauriSecretVault(store));

		for (const refusal of plugins.refusals) {
			console.error(PLUGIN_REFUSED.replace("{workspace}", workspace).replace("{refusal}", refusal));
		}

		for (const note of plugins.notes) {
			console.info(PLUGIN_NOTED.replace("{workspace}", workspace).replace("{note}", note));
		}

		return plugins;
	} catch (failure) {
		console.error(NOT_STARTED.replace("{workspace}", workspace), failure);
		listener.fail(failure);
		return null;
	}
}

function coreServedOrFailed(serving: CoreServing): Runtime | null {
	try {
		return coreServedOver(serving);
	} catch (failure) {
		console.error(NOT_STARTED.replace("{workspace}", serving.workspace), failure);
		serving.listener.fail(failure);
		return null;
	}
}

function coreServedOver({ workspace, listener, store, plugins }: CoreServing): Runtime {
	const own = localTransport();
	const offers = {
		store,
		file: tasksBoardFileOver(own),
	};
	const core = runtime()
		.modules(...HOST_CAPABILITY_MODULES, ...plugins.backgroundModules.map(({ moduleOf }) => moduleOf(offers)))
		.start({
			platform: "server",
			env: {
				FILES_STORE: "tauri",
				TERMINAL_STORE: "tauri",
				HAPTICS_HOST: "tauri",
			},
			scope: { workspaceId: workspace },
		});
	const authenticate = new AppCallerAuthenticate();
	return mountOrStop(core, (started) => {
		const exposed = started.expose({ adapter: CORE_IPC, authenticate });
		own.serve(started, { authenticate });
		startBackendServers({
			workspaceId: workspace,
			core: own,
			backgroundModules: plugins.backgroundModules,
			servers: plugins.servers,
		});
		const places = runtime()
			.imports(placesContract({ over: own }), chatFacts({ over: own }), tasks({ over: own }))
			.start();
		listener.serve(exposed);
		return places;
	});
}

function closeEverywhere(served: ReadonlyMap<string, Runtime>, window: string): void {
	for (const [workspace, places] of served) {
		void places.send(placesContract.windows.closeWindow, { window }).then((answered) => {
			if (!answered.ok) {
				console.warn(
					NOT_CLOSED.replace("{workspace}", workspace).replace("{window}", window).replace("{reason}", answered.reason),
				);
			}
		});
	}
}

async function keepWindowsInOneWorkspace(served: ReadonlyMap<string, Runtime>): Promise<void> {
	const joined = (await Promise.all([...served].map(([workspace, places]) => joinedIn(places, workspace)))).flat();

	for (const stale of windowsLeftBehind(joined)) {
		console.info(
			LEFT_BEHIND.replace("{workspace}", stale.workspace)
				.replace("{window}", stale.label)
				.replace("{latest}", stale.latest),
		);
		await served.get(stale.workspace)?.send(placesContract.windows.closeWindow, { window: stale.label });
	}
}

async function joinedIn(places: Runtime, workspace: string): Promise<readonly JoinedWindow[]> {
	const all = await places.send(placesContract.windows.all);
	return all.ok ? all.output.windows.map(({ label, openedAt }) => ({ workspace, label, openedAt })) : [];
}

async function keepLiveWindows(places: Runtime, workspace: string): Promise<void> {
	const live = LiveWindowsSchema.parse(await invoke(CORE_LIVE_WINDOWS));
	const answered = await places.send(placesContract.windows.keepLiveWindows, { windows: live });

	if (!answered.ok) {
		console.warn(NOT_KEPT.replace("{workspace}", workspace).replace("{reason}", answered.reason));
	}
}

async function forgetRunningTurns(places: Runtime, workspace: string): Promise<void> {
	const answered = await places.send(chatFacts.turns.forgetRunningTurns);

	if (!answered.ok) {
		console.warn(TURNS_KEPT.replace("{workspace}", workspace).replace("{reason}", answered.reason));
	}
}

async function superviseTasks(core: Runtime, workspace: string): Promise<void> {
	await reconcileTasks(core, workspace);
	await sweepStaleTasks(core, workspace, "start");
	setInterval(() => void sweepStaleTasks(core, workspace, "six-hourly"), SWEEP_EVERY_MS);
}

async function reconcileTasks(core: Runtime, workspace: string): Promise<void> {
	if (isCoreReloaded()) {
		console.info(NOT_COLD.replace("{workspace}", workspace));
		return;
	}

	const answered = await core.send(tasks.supervision.reconcile, { liveChats: [] });

	if (!answered.ok) {
		console.warn(NOT_RECONCILED.replace("{workspace}", workspace).replace("{reason}", answered.reason));
		return;
	}

	console.info(RECONCILED.replace("{workspace}", workspace).replace("{count}", String(answered.output.changed)));
}

async function sweepStaleTasks(core: Runtime, workspace: string, when: string): Promise<void> {
	const answered = await core.send(tasks.supervision.sweepStale);

	if (!answered.ok) {
		console.warn(NOT_SWEPT.replace("{workspace}", workspace).replace("{reason}", answered.reason));
		return;
	}

	console.info(
		SWEPT.replace("{workspace}", workspace).replace("{count}", String(answered.output.changed)).replace("{when}", when),
	);
}

// TRADE-OFF: the page's navigation type, because every studio window is live before the core on a cold start too
function isCoreReloaded(): boolean {
	return performance
		.getEntriesByType("navigation")
		.some((entry) => entry instanceof PerformanceNavigationTiming && entry.type === "reload");
}
