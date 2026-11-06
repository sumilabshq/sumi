import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { z } from "zod";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { app, localTransport } from "@widgetarium/data-framework";
import type { ListeningTransport, StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import type { SumiProfile } from "@widgetarium/plugin-framework";
import {
	CloseWindowCommand,
	ForgetRunningTurnsCommand,
	KeepLiveWindowsCommand,
	PlacesModule as PlacesContract,
} from "@widgetarium/places";
import { ReconcileTasksCommand, SweepStaleTasksCommand, TasksModule as TasksContract } from "@widgetarium/tasks";
import { AppCallerAuthenticate } from "@widgetarium/studio";
import { HOST_CAPABILITY_MODULES } from "../plugins/host-capabilities.js";
import { BUILT_IN_PROFILE, resolvePlugins } from "../plugins/sumi-plugins.js";
import { workspaceProfileOf } from "../plugins/workspace-profile.js";
import { serveCore } from "./core-calls.js";
import { tasksBoardFileOver } from "./tasks-board-file.js";
import { CORE_LIVE_WINDOWS, CORE_WINDOW_CLOSED_EVENT, LiveWindowsSchema } from "./core-wire.js";

const NOT_KEPT = "[studio-core] workspace {workspace}: the open windows were not checked ({reason})";
const TURNS_KEPT = "[studio-core] workspace {workspace}: running marks of the last run stay ({reason})";
const NOT_CLOSED = "[studio-core] workspace {workspace}: window {window} closed but stays listed ({reason})";
const NOT_RECONCILED = "[tasks] workspace {workspace}: tasks in progress before this start stay in progress ({reason})";
const RECONCILED = "[tasks] workspace {workspace}: {count} tasks in progress → blocked (the app started, no turn runs)";
const NOT_COLD =
	"[tasks] workspace {workspace}: tasks in progress stay in progress (the core reloaded; the open windows may still run their turns)";
const NOT_SWEPT = "[tasks] workspace {workspace}: stale tasks stay open ({reason})";
const SWEPT = "[tasks] workspace {workspace}: {count} stale tasks → cancelled (the {when} sweep)";
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;
const SERVING = "[studio-core] workspace {workspace}: none → serving, plugins {plugins}";
const PLUGIN_REFUSED = "[studio-core] workspace {workspace}: plugins: {refusal}";
const PROFILE_UNREAD = "[studio-core] workspace {workspace}: sumi.profile.json not read, the built-in plugins start";

export function startCore(): void {
	const served = new Map<string, StartedApp>();
	const store = new StoreClient((command, args) => invoke(command, args));
	serveCore((workspace, listener) => {
		void profileOrBuiltIn(store, workspace).then((profile) => {
			const places = coreServedOver({ workspace, listener, store, profile });
			served.set(workspace, places);
			console.info(SERVING.replace("{workspace}", workspace).replace("{plugins}", profile.plugins.join(", ")));
			void keepLiveWindows(places, workspace);
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
	readonly listener: ListeningTransport;
	readonly store: StoreClient;
	readonly profile: SumiProfile;
}

async function profileOrBuiltIn(store: StoreClient, workspace: string): Promise<SumiProfile> {
	try {
		return await workspaceProfileOf(store, workspace);
	} catch (failure) {
		console.error(PROFILE_UNREAD.replace("{workspace}", workspace), failure);
		return BUILT_IN_PROFILE;
	}
}

function coreServedOver({ workspace, listener, store, profile }: CoreServing): StartedApp {
	const own = localTransport();
	// TRADE-OFF: modules from a plugin slot lose typed host needs; start() still refuses a missing one.
	server()
		.modules(...HOST_CAPABILITY_MODULES, ...sharedModulesOf(workspace, profile))
		.listen(listener)
		.listen(own)
		.start({
			env: {
				PLACES_STORE: "tauri",
				FILES_STORE: "tauri",
				TERMINAL_STORE: "tauri",
			},
			scope: { workspaceId: workspace },
			host: {
				store,
				file: tasksBoardFileOver(own),
				authenticate: new AppCallerAuthenticate(),
			},
		});
	return app().imports(PlacesContract.over(own), TasksContract.over(own)).start();
}

function sharedModulesOf(workspace: string, profile: SumiProfile): readonly ServerSideModule[] {
	const resolved = resolvePlugins(profile);

	for (const refusal of resolved.refusals) {
		console.error(PLUGIN_REFUSED.replace("{workspace}", workspace).replace("{refusal}", refusal));
	}

	return resolved.sharedModules;
}

function closeEverywhere(served: ReadonlyMap<string, StartedApp>, window: string): void {
	for (const [workspace, places] of served) {
		void places.send(CloseWindowCommand, { window }).then((answered) => {
			if (!answered.ok) {
				console.warn(
					NOT_CLOSED.replace("{workspace}", workspace).replace("{window}", window).replace("{reason}", answered.reason),
				);
			}
		});
	}
}

async function keepLiveWindows(places: StartedApp, workspace: string): Promise<void> {
	const live = LiveWindowsSchema.parse(await invoke(CORE_LIVE_WINDOWS));
	const answered = await places.send(KeepLiveWindowsCommand, { windows: live });

	if (!answered.ok) {
		console.warn(NOT_KEPT.replace("{workspace}", workspace).replace("{reason}", answered.reason));
	}
}

async function forgetRunningTurns(places: StartedApp, workspace: string): Promise<void> {
	const answered = await places.send(ForgetRunningTurnsCommand);

	if (!answered.ok) {
		console.warn(TURNS_KEPT.replace("{workspace}", workspace).replace("{reason}", answered.reason));
	}
}

async function superviseTasks(core: StartedApp, workspace: string): Promise<void> {
	await reconcileTasks(core, workspace);
	await sweepStaleTasks(core, workspace, "start");
	setInterval(() => void sweepStaleTasks(core, workspace, "six-hourly"), SWEEP_EVERY_MS);
}

async function reconcileTasks(core: StartedApp, workspace: string): Promise<void> {
	if (isCoreReloaded()) {
		console.info(NOT_COLD.replace("{workspace}", workspace));
		return;
	}

	const answered = await core.send(ReconcileTasksCommand, { liveChats: [] });

	if (!answered.ok) {
		console.warn(NOT_RECONCILED.replace("{workspace}", workspace).replace("{reason}", answered.reason));
		return;
	}

	console.info(RECONCILED.replace("{workspace}", workspace).replace("{count}", String(answered.output.changed)));
}

async function sweepStaleTasks(core: StartedApp, workspace: string, when: string): Promise<void> {
	const answered = await core.send(SweepStaleTasksCommand);

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
