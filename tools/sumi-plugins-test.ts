import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks/module";
import { TerminalModule } from "@widgetarium/terminal/module";
import { server } from "@widgetarium/data-framework/server";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { HOST_CAPABILITY_MODULES } from "../apps/host-tauri/src/plugins/host-capabilities.ts";
import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/host-tauri/src/plugins/sumi-plugins.ts";
import { workspaceProfileOf } from "../apps/host-tauri/src/plugins/workspace-profile.ts";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";

const resolved = resolvePlugins(BUILT_IN_PROFILE);
const coreModulesBefore = [PlacesModule, FileSystemModule, QuestionsModule, ...APP_MODULES];
const coreModulesNow = [...HOST_CAPABILITY_MODULES, ...resolved.sharedModules];

check("the built-in profile resolves with no refusal", resolved.refusals, []);
check(
	"the host runs the machine capabilities itself: files and terminal sessions",
	HOST_CAPABILITY_MODULES.length === 2 &&
		HOST_CAPABILITY_MODULES[0] === FileSystemModule &&
		HOST_CAPABILITY_MODULES[1] === TerminalModule,
	true,
);
check(
	"the main plugin fills only the old app's modules, none of the host's",
	resolved.sharedModules.length === 3 &&
		resolved.sharedModules[0] === PlacesModule &&
		resolved.sharedModules[1] === QuestionsModule &&
		resolved.sharedModules[2] === TasksModule,
	true,
);
check(
	"the core still starts every module it started before, each once",
	coreModulesNow.length === coreModulesBefore.length &&
		coreModulesBefore.every((module) => coreModulesNow.filter((now) => now === module).length === 1),
	true,
);

const mainOff = resolvePlugins({ plugins: ["sumi-host"], locked: ["sumi-host", "main"] });
check(
	"turning the locked main plugin off is refused, and its modules do not start",
	[mainOff.refusals, mainOff.sharedModules],
	[["sumi.profile.json locks plugin main, which it does not enable: a locked plugin cannot be disabled"], []],
);

const boardText: { text: string | null } = {
	text: null,
};
const startedCore = server()
	.modules(...coreModulesNow)
	.start({
		env: {},
		scope: { workspaceId: "sumi-plugins" },
		host: {
			file: {
				read: () => Promise.resolve(boardText.text),
				write: (text: string) => {
					boardText.text = text;
					return Promise.resolve();
				},
			},
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
	plugins: ["sumi-host"],
	locked: [],
});
const profileStore = new StoreClient(profileFiles.invoke, undefined);
const researchProfile = await workspaceProfileOf(profileStore, "research");
const defaultProfile = await workspaceProfileOf(profileStore, "default");
check(
	"each workspace reads its own sumi.profile.json, and one without the file gets the built-in plugins",
	[researchProfile, defaultProfile],
	[
		{
			plugins: ["sumi-host"],
			locked: [],
		},
		BUILT_IN_PROFILE,
	],
);
check(
	"a workspace that does not enable main starts none of the old app's modules",
	resolvePlugins(researchProfile).sharedModules.length,
	0,
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("sumi plugins: all checks passed");
