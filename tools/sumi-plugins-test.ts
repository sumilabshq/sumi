import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks/module";
import { TerminalModule } from "@widgetarium/terminal/module";
import { server } from "@widgetarium/data-framework/server";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { AppsModule } from "../plugins/apps/data/apps/module.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import type { ResolvedPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { HOST_CAPABILITY_MODULES } from "../apps/tauri/src/plugins/host-capabilities.ts";
import { workspaceProfileOf } from "../apps/tauri/src/plugins/workspace-profile.ts";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";
import { BROWSER_PAGE_FACE, TERMINAL_FACE } from "./plugin-apps-fixture.ts";

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
const APPS_SLOT_OWNERS = ["plugins/apps/", "plugins/terminal/", "plugins/browser-page/"];
const SCANNED_ROOTS = ["apps", "packages", "plugins"];

function coreModulesOf(resolved: ResolvedPlugins): readonly ServerSideModule[] {
	return [...HOST_CAPABILITY_MODULES, ...resolved.backgroundModules.map(({ moduleOf }) => moduleOf(offers))];
}

async function appIdsAnsweredBy(resolved: ResolvedPlugins): Promise<unknown> {
	const core = server()
		.modules(...coreModulesOf(resolved))
		.start({
			env: {},
			scope: { workspaceId: "sumi-plugins" },
			host: {
				authenticate: new AppCallerAuthenticate(),
			},
		});
	const answered = await core.answer({
		name: "apps/apps",
		input: undefined,
		idempotencyKey: null,
		signal: new AbortController().signal,
	});
	core.stop();
	return answered.ok ? answered.output : answered.reason;
}

function sourcesNaming(word: string): readonly string[] {
	return SCANNED_ROOTS.flatMap((root) =>
		readdirSync(root, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && /\.(ts|tsx|mts)$/.test(entry.name))
			.map((entry) => path.join(entry.parentPath, entry.name))
			.filter((file) => !/node_modules|\/dist\/|\/target\//.test(file))
			.filter((file) => readFileSync(file, "utf8").includes(word)),
	);
}

const resolved = resolvePlugins(BUILT_IN_PROFILE);
const coreModulesNow = coreModulesOf(resolved);
const coreModulesBefore = [PlacesModule, FileSystemModule, QuestionsModule, TerminalModule, ...APP_MODULES];
const coreNamesNow = coreModulesNow.map(({ definition }) => definition.name);

check("the built-in profile resolves with no refusal", resolved.refusals, []);
check(
	"the host runs the machine capabilities itself: files and terminal sessions",
	HOST_CAPABILITY_MODULES.map(({ definition }) => definition.name),
	[FileSystemModule.definition.name, TerminalModule.definition.name],
);
check(
	"the background modules slot holds the apps plugin's module and the old app's, none of the host's",
	resolved.backgroundModules.map(({ contract }) => contract.name),
	[
		AppsModule.definition.name,
		PlacesModule.definition.name,
		QuestionsModule.definition.name,
		TasksModule.definition.name,
	],
);
check(
	"the core starts every module it started before, each once, and the apps plugin's module",
	coreNamesNow.length === coreModulesBefore.length + 1 &&
		coreModulesBefore.every(({ definition }) => coreNamesNow.filter((name) => name === definition.name).length === 1),
	true,
);
check(
	"the apps plugin's module answers the terminal and browser-page plugins' apps, read from the apps plugin's own slot",
	await appIdsAnsweredBy(resolved),
	{ apps: [TERMINAL_FACE, BROWSER_PAGE_FACE] },
);
check(
	"the apps plugin's tab page draws the terminal and the browser page",
	[resolved.tabPage?.draws("terminal"), resolved.tabPage?.draws("browser-page")],
	[true, true],
);

const emptyProfile = resolvePlugins({ plugins: [] });
check(
	"a profile cannot turn off the host's always-on plugins: an empty one still starts the old app and the apps module",
	[emptyProfile.refusals, emptyProfile.backgroundModules.length],
	[[], 4],
);
check(
	"a profile without the terminal plugin has no terminal app, in the module and on the tab page",
	[await appIdsAnsweredBy(emptyProfile), emptyProfile.tabPage?.draws("terminal")],
	[{ apps: [] }, false],
);
check(
	"no code outside the apps plugin and its fillers names the apps slot: the host never reads it",
	sourcesNaming("AppsSlot").filter((file) => !APPS_SLOT_OWNERS.some((owner) => file.startsWith(owner))),
	[],
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
