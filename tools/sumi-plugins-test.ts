import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks/module";
import { TerminalModule } from "@widgetarium/terminal/module";
import { server } from "@widgetarium/data-framework/server";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { HOST_CAPABILITY_MODULES } from "../apps/tauri/src/plugins/host-capabilities.ts";
import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/tauri/src/plugins/sumi-plugins.ts";
import { workspaceProfileOf } from "../apps/tauri/src/plugins/workspace-profile.ts";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";

const boardText: { text: string | null } = {
	text: null,
};
const offers = {
	store: new StoreClient(new FakeStore().invoke),
	file: {
		read: () => Promise.resolve(boardText.text),
		write: (text: string) => {
			boardText.text = text;
			return Promise.resolve();
		},
	},
};
const resolved = resolvePlugins(BUILT_IN_PROFILE);
const sharedModules = resolved.sharedModules.map((moduleOf) => moduleOf(offers));
const coreModulesBefore = [PlacesModule, FileSystemModule, QuestionsModule, TerminalModule, ...APP_MODULES];
const coreModulesNow = [...HOST_CAPABILITY_MODULES, ...sharedModules];
const coreNamesNow = coreModulesNow.map(({ definition }) => definition.name);

check("the built-in profile resolves with no refusal", resolved.refusals, []);
check(
	"the host runs the machine capabilities itself: files and terminal sessions",
	HOST_CAPABILITY_MODULES.map(({ definition }) => definition.name),
	[FileSystemModule.definition.name, TerminalModule.definition.name],
);
check(
	"the main plugin fills only the old app's modules, none of the host's",
	sharedModules.map(({ definition }) => definition.name),
	[PlacesModule.definition.name, QuestionsModule.definition.name, TasksModule.definition.name],
);
check(
	"the core still starts every module it started before, each once",
	coreNamesNow.length === coreModulesBefore.length &&
		coreModulesBefore.every(({ definition }) => coreNamesNow.filter((name) => name === definition.name).length === 1),
	true,
);

check(
	"the built-in profile draws the terminal plugin's app",
	resolved.apps.map(({ id, title, icon }) => [id, title, icon]),
	[["terminal", "Terminal", "terminal"]],
);

const emptyProfile = resolvePlugins({ plugins: [] });
check(
	"a profile cannot turn off the host's always-on plugins: an empty one still starts the old app, with no terminal app",
	[emptyProfile.refusals, emptyProfile.sharedModules.length, emptyProfile.apps.length],
	[[], 3, 0],
);

const startedCore = server()
	.modules(...coreModulesNow)
	.start({
		env: {},
		scope: { workspaceId: "sumi-plugins" },
		host: {
			authenticate: new AppCallerAuthenticate(),
		},
	});
const routedCodes = await Promise.all(
	coreModulesBefore.map(async (module) => {
		const answered = await startedCore.answer({
			name: module.handlers[0]?.request.name ?? "",
			input: undefined,
			idempotencyKey: null,
			signal: new AbortController().signal,
			headers: new Headers({ "x-sumi-app": "tasks" }),
		});
		return answered.ok ? "answered" : answered.code;
	}),
);
check(
	"a core started from the host's capabilities and the slot answers a call of every module (demo with memory stores)",
	routedCodes.includes("not-found"),
	false,
);
startedCore.stop();

const profileFiles = new FakeStore();
profileFiles.put("workspace:research:sumi.profile.json", {
	v: 1,
	plugins: ["ghost"],
});
const profileStore = new StoreClient(profileFiles.invoke, undefined);
const researchProfile = await workspaceProfileOf(profileStore, "research");
const defaultProfile = await workspaceProfileOf(profileStore, "default");
check(
	"each workspace reads its own sumi.profile.json, and one without the file gets the built-in plugins",
	[researchProfile, defaultProfile],
	[{ plugins: ["ghost"] }, BUILT_IN_PROFILE],
);
check(
	"a plugin listed by one workspace is resolved for that workspace only",
	[resolvePlugins(researchProfile).refusals, resolvePlugins(defaultProfile).refusals],
	[["sumi.profile.json lists plugin ghost, which is not installed"], []],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("sumi plugins: all checks passed");
