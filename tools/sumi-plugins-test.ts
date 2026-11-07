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
import { AppsSchema } from "@sumi/apps";
import { AppsModule } from "../plugins/apps/data/apps/module.ts";
import { ChatPlugin } from "../plugins/chat/src/plugin.ts";
import { CommandMenuPlugin, MenuDoorsSlot, MenuPagesSlot } from "../plugins/command-menu/src/index.ts";
import { MainPlugin } from "../plugins/main/src/plugin.ts";
import { BackgroundModulesSlot } from "../plugins/sumi-host/src/slots.ts";
import type { Plugin, SlotShape } from "@widgetarium/plugin-framework";
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
const APPS_SLOT_OWNERS = ["plugins/apps/", "plugins/terminal/", "plugins/browser-page/", "plugins/files/"];
const FILE_APP_IDS = ["file", "markdown-viewer", "code-viewer", "image-viewer", "video-viewer", "html-viewer"];
const MENU_SLOT_OWNERS = ["plugins/command-menu/", "plugins/chat/"];
const SCANNED_ROOTS = ["apps", "packages", "plugins"];
const HOST_ROOTS = ["apps/studio/src", "apps/tauri/src"];
const CHAT_PLUGIN_NAMES = ["@sumi/chat-plugin", "ChatPlugin"];
const CHAT_PIECES = [
	"AssistantModule(",
	"askComposerOf",
	"AskComposerContext.Provider",
	"AssistantPanel",
	'"chat" ? null',
	'CHAT_APP = "chat"',
];

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

function fillIdsOf(filler: Plugin, slot: SlotShape): readonly string[] {
	return filler.parts.fills.filter((fill) => fill.slot === slot).map(({ id }) => id);
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

function hostSourcesNaming(words: readonly string[]): readonly string[] {
	return HOST_ROOTS.flatMap((root) =>
		readdirSync(root, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && /\.(ts|tsx|mts)$/.test(entry.name))
			.map((entry) => path.join(entry.parentPath, entry.name))
			.filter((file) => !file.endsWith("sumi-plugins.ts"))
			.filter((file) => words.some((word) => readFileSync(file, "utf8").includes(word))),
	);
}

function tabPageDrawing(resolved: ResolvedPlugins, app: string): boolean {
	return resolved.tabPages.some((page) => page.draws(app));
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
	"the background modules slot holds the apps plugin's module, the chat plugin's questions and the old app's, none of the host's",
	resolved.backgroundModules.map(({ contract }) => contract.name),
	[
		AppsModule.definition.name,
		QuestionsModule.definition.name,
		PlacesModule.definition.name,
		TasksModule.definition.name,
	],
);
check(
	"the core starts every module it started before, each once, and the apps plugin's module",
	coreNamesNow.length === coreModulesBefore.length + 1 &&
		coreModulesBefore.every(({ definition }) => coreNamesNow.filter((name) => name === definition.name).length === 1),
	true,
);
const answeredApps = AppsSchema.parse(await appIdsAnsweredBy(resolved)).apps;
check(
	"the apps plugin's module answers the terminal and browser-page plugins' apps, read from the apps plugin's own slot",
	answeredApps.slice(0, 2),
	[TERMINAL_FACE, BROWSER_PAGE_FACE],
);
check(
	"the files plugin passes its file app and every viewer of its own slot on to the apps slot, registered once",
	answeredApps.slice(2).map(({ id }) => id),
	FILE_APP_IDS,
);
check(
	"the apps plugin's tab page draws the terminal, the browser page, the file app and every viewer",
	["terminal", "browser-page", ...FILE_APP_IDS].map((app) => tabPageDrawing(resolved, app)),
	["terminal", "browser-page", ...FILE_APP_IDS].map(() => true),
);
check(
	"the chat plugin draws the chat app's page itself, with no shell header, in the window",
	resolved.tabPages.filter((page) => page.draws("chat")).map(({ header }) => header),
	["none"],
);
check(
	"the chat plugin lends the window its Ask composer through the host's window providers slot",
	resolved.windowProviders.map(({ id }) => id),
	["chat/ask-composer"],
);
check(
	"only the host's plugin list names the chat plugin: no other host source imports it",
	hostSourcesNaming(CHAT_PLUGIN_NAMES),
	[],
);
check(
	"no host source starts the assistant, draws the chat, wires its composer or special-cases the chat app",
	hostSourcesNaming(CHAT_PIECES),
	[],
);
check(
	"the browser-page plugin serves its web-page module to every frame through the host's frame modules slot",
	resolved.frameModules.map(({ id, contract }) => [id, contract.name]),
	[["browser-page/web-page", "web-page"]],
);
check(
	"no host source names the web-page module, its package or its native pages",
	hostSourcesNaming(["@widgetarium/web-page", "WebPageModule", "NativeWebPages", "nativeWebPagesOver"]),
	[],
);
check(
	"the chat plugin serves one assistant per window through the host's window server modules slot",
	resolved.windowServerModules.map(({ id }) => id),
	["chat/assistant"],
);
check(
	"no source starts an assistant per chat: no per-chat app, no host narrowed to a chat outside the module's gateways",
	[
		...["ChatApps", "chatAppOf"].flatMap(sourcesNaming),
		...sourcesNaming("hostForChat").filter((file) => !file.includes("plugins/chat/data/assistant/gateways/")),
	],
	[],
);

const emptyProfile = resolvePlugins({ plugins: [] });
check(
	"a profile without the browser-page plugin serves frames no web-page module",
	emptyProfile.frameModules.length,
	0,
);
check(
	"a profile cannot turn off the host's always-on plugins: an empty one still starts the old app and the apps module",
	[emptyProfile.refusals, emptyProfile.backgroundModules.length],
	[[], 4],
);
check(
	"a profile without the terminal plugin has no terminal app, in the module and on the tab page",
	[await appIdsAnsweredBy(emptyProfile), tabPageDrawing(emptyProfile, "terminal")],
	[{ apps: [] }, false],
);
check(
	"no code outside the apps plugin and its fillers names the apps slot: the host never reads it",
	sourcesNaming("AppsSlot").filter((file) => !APPS_SLOT_OWNERS.some((owner) => file.startsWith(owner))),
	[],
);

check(
	"no code outside the command menu plugin and its fillers names its slots: the host never reads them",
	["MenuDoorsSlot", "MenuPagesSlot", "MenuRowSourcesSlot"].flatMap((word) =>
		sourcesNaming(word).filter((file) => !MENU_SLOT_OWNERS.some((owner) => file.startsWith(owner))),
	),
	[],
);
check(
	"the Ask door, ⌘I, and its page are the chat plugin's fills, and the menu fills no Ask of its own",
	[
		fillIdsOf(ChatPlugin, MenuDoorsSlot),
		fillIdsOf(ChatPlugin, MenuPagesSlot),
		fillIdsOf(CommandMenuPlugin, MenuDoorsSlot),
	],
	[["ask"], ["ask"], ["anywhere", "new-tab", "this-tab"]],
);
check(
	"questions is the chat plugin's background module, no longer the old app's",
	[fillIdsOf(ChatPlugin, BackgroundModulesSlot), fillIdsOf(MainPlugin, BackgroundModulesSlot)],
	[["questions"], ["places", "tasks"]],
);
check(
	"the built-in profile runs the command menu's module in the window and draws its layer",
	[resolved.windowModules.map(({ definition }) => definition.name), resolved.windowLayers.map(({ id }) => id)],
	[["command-menu"], ["command-menu/command-menu"]],
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
