import { artboards } from "../plugins/canvas/data/artboards/generated/module.ts";
import { runtime } from "@widgetarium/data-framework";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { fileSystem } from "@widgetarium/file-system/implementation";
import { navigation as places } from "@widgetarium/navigation/implementation";
import { questions } from "@widgetarium/questions/implementation";
import { tasks } from "@widgetarium/tasks/implementation";
import { haptics } from "@widgetarium/haptics/implementation";
import { terminal } from "@widgetarium/terminal/implementation";
import type { ServerSideModule } from "@widgetarium/data-framework";
import { AppsSchema } from "@sumi/apps/contract";
import { apps as appsModule } from "../plugins/apps/data/apps/generated/module.ts";
import type { WindowOffers } from "../plugins/sumi-host/src/index.ts";
import { localTransport } from "@widgetarium/data-framework";
import { MemoryPluginStateStore, PLUGIN_STATE_FILE } from "@widgetarium/plugin-framework";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import type { ResolvedPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { frameCoreModulesOf } from "../apps/studio/src/tabs/studio-app.ts";
import { HOST_CAPABILITY_MODULES } from "../apps/tauri/src/plugins/host-capabilities.ts";
import { workspacePluginStateOf } from "../apps/tauri/src/plugins/workspace-plugin-state.ts";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { FakeStore, quietly } from "./host-tauri-fake-store.ts";
import { check, tally } from "./check-helpers.ts";
import { BROWSER_PAGE_FACE, BUILT_IN_FACES, TERMINAL_FACE } from "./plugin-apps-fixture.ts";

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
const SUMI_PLUGINS_TEST = "the sumi-plugins test";
const APPS_SLOT_OWNERS = [
	"plugins/apps/",
	"plugins/terminal/",
	"plugins/browser-page/",
	"plugins/files/",
	"plugins/main/",
	"plugins/ai/chat/",
	"plugins/git/",
	"plugins/tasks/",
	"plugins/canvas/",
];
const VIEWER_APP_IDS = ["markdown-viewer", "code-viewer", "image-viewer", "video-viewer", "html-viewer"];
const MENU_SLOT_OWNERS = ["plugins/command-menu/", "plugins/ai/chat/"];
const SCANNED_ROOTS = ["apps", "packages", "plugins"];
const HOST_ROOTS = ["apps/studio/src", "apps/tauri/src"];
const CHAT_PLUGIN_NAMES = ["@sumi/chat-plugin"];
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
	const core = runtime()
		.modules(...coreModulesOf(resolved))
		.start({
			platform: "server",
			env: {},
			scope: { workspaceId: "sumi-plugins" },
		});
	const answered = await core.expose({ adapter: SUMI_PLUGINS_TEST, authenticate: new AppCallerAuthenticate() }).answer({
		name: "apps.apps.all",
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

const TAB_OFFERS: WindowOffers = {
	workspaceId: "sumi-plugins",
	platform: "browser",
	windowApp: runtime().start({ platform: "browser", scope: { workspaceId: "sumi-plugins" } }),
	core: localTransport(),
	windowServer: localTransport(),
	focusedChatId: () => null,
};

async function tabModuleNamesOf(resolved: ResolvedPlugins, app: string): Promise<readonly string[]> {
	const page = resolved.tabPages.find((each) => each.draws(app));

	if (page === undefined) {
		return [];
	}

	const { modules } = await page.modulesOf({ app, tabId: "tab-1" }, TAB_OFFERS);
	return modules.map(({ definition }) => definition.name);
}

const resolved = startSumiPlugins(builtInPluginState());
const coreModulesNow = coreModulesOf(resolved);
const coreModulesBefore = [places, fileSystem, questions, terminal, ...APP_MODULES];
const coreNamesNow = coreModulesNow.map(({ definition }) => definition.name);

check("the built-in profile resolves with no refusal", resolved.refusals, []);
check(
	"the host runs the machine capabilities itself: files, terminal sessions and trackpad haptics",
	HOST_CAPABILITY_MODULES.map(({ definition }) => definition.name),
	[fileSystem.definition.name, terminal.definition.name, haptics.definition.name],
);
check(
	"the backend holds the apps plugin's places and apps, the chat plugin's questions, the tasks plugin's tasks and the canvas plugin's artboards, none of the host's",
	resolved.backgroundModules.map(({ contract }) => contract.name),
	[
		places.definition.name,
		appsModule.definition.name,
		questions.definition.name,
		tasks.definition.name,
		artboards.definition.name,
	],
);
check(
	"the core starts every module it started before, each once, the apps plugin's module and the canvas plugin's artboards",
	coreNamesNow.length === coreModulesBefore.length + 2 &&
		coreModulesBefore.every(({ definition }) => coreNamesNow.filter((name) => name === definition.name).length === 1),
	true,
);
const answeredApps = AppsSchema.parse(await appIdsAnsweredBy(resolved)).apps;
const answeredFaceOf = (id: string) => answeredApps.find((face) => face.id === id) ?? null;
check(
	"the apps plugin's module answers the terminal and browser-page plugins' apps, read from the apps plugin's own slot",
	[answeredFaceOf("terminal"), answeredFaceOf("browser-page")],
	[TERMINAL_FACE, BROWSER_PAGE_FACE],
);
check(
	"the apps module answers canvas, browser, tasks and chat from their owners' fills, as any other app",
	["canvas", "browser", "tasks", "chat"].map((id) => answeredFaceOf(id)),
	["canvas", "browser", "tasks", "chat"].map((id) => BUILT_IN_FACES.find((face) => face.id === id) ?? id),
);
check(
	"the files plugin passes every viewer of its own slot on to the apps slot, registered once, beside the unlisted file link app",
	answeredApps.map(({ id }) => id).filter((id) => VIEWER_APP_IDS.includes(id) || id === "file"),
	["file", ...VIEWER_APP_IDS],
);
check("the file link app is unlisted", answeredFaceOf("file")?.isListed, false);
check(
	"the apps module is the only list of apps: no other module answers app faces",
	sourcesNaming("AppFacesQuery").filter((file) => !file.includes("/generated/")),
	[],
);
check(
	"the apps plugin's tab page draws the terminal, the browser page and every viewer",
	["terminal", "browser-page", ...VIEWER_APP_IDS].map((app) => tabPageDrawing(resolved, app)),
	["terminal", "browser-page", ...VIEWER_APP_IDS].map(() => true),
);
check(
	"each viewer tab runs its own file-page module, the terminal's tab none",
	await Promise.all(["terminal", ...VIEWER_APP_IDS].map((app) => tabModuleNamesOf(resolved, app))),
	[[], ...VIEWER_APP_IDS.map(() => ["file-page"])],
);
check(
	"a frame reaches the host's capabilities and every module a plugin registers in the background, and no other",
	frameCoreModulesOf(resolved.backgroundModules).map(({ module }) => module.name),
	["file-system", "terminal", "haptics", ...resolved.backgroundModules.map(({ contract }) => contract.name)],
);
check(
	"the registered background modules include places, tasks, questions and apps, so no host list names them",
	["navigation", "tasks", "questions", "apps"].every((name) =>
		frameCoreModulesOf(resolved.backgroundModules).some(({ module }) => module.name === name),
	),
	true,
);
check(
	"the chat plugin draws the chat app's page itself, with no shell header, in the window",
	resolved.tabPages.filter((page) => page.draws("chat")).map(({ header }) => header),
	["none"],
);
check(
	"the chat plugin lends the window its Ask composer through the host's window providers slot",
	resolved.windowProviders.map(({ id }) => id),
	["chat.provider-0"],
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
	[["browser-page.web-page", "web-page"]],
);
check(
	"no host source names the web-page module, its package or its native pages",
	hostSourcesNaming(["@widgetarium/web-page", "WebPageModule", "NativeWebPages", "nativeWebPagesOver"]),
	[],
);
check(
	"the agent plugin serves one assistant per window through the host's window server modules slot",
	resolved.windowServerModules.map(({ id }) => id),
	["agent.server-0"],
);
check(
	"no source starts an assistant per chat: no per-chat app, no host narrowed to a chat outside the module's gateways",
	[
		...["ChatApps", "chatAppOf"].flatMap(sourcesNaming),
		...sourcesNaming("hostForChat").filter((file) => !file.includes("plugins/ai/agent/data/assistant/gateways/")),
	],
	[],
);

const emptyProfile = startSumiPlugins(new MemoryPluginStateStore([]));
check(
	"a profile without the browser-page plugin serves frames no web-page module",
	emptyProfile.frameModules.length,
	0,
);
check(
	"a profile cannot turn off the host's always-on plugins: an empty one still starts the apps, questions and tasks modules",
	[emptyProfile.refusals, emptyProfile.backgroundModules.length],
	[[], 4],
);
check(
	"a profile without the terminal plugin has no terminal app, in the module and on the tab page",
	[
		AppsSchema.parse(await appIdsAnsweredBy(emptyProfile)).apps.some(({ id }) => id === "terminal"),
		tabPageDrawing(emptyProfile, "terminal"),
	],
	[false, false],
);
check(
	"no code outside the apps plugin and the plugins that add apps uses its API: the host never reads it",
	sourcesNaming("use(apps)").filter((file) => !APPS_SLOT_OWNERS.some((owner) => file.startsWith(owner))),
	[],
);

check(
	"no code outside the command menu plugin and the plugins that add to it uses its API: the host never reads it",
	sourcesNaming("use(commandMenu)").filter((file) => !MENU_SLOT_OWNERS.some((owner) => file.startsWith(owner))),
	[],
);
check(
	"the built-in profile runs the apps plugin's app-host, the command menu's module, the chat's chat-tabs and every MCP server's modules in the window and draws the menu's layer",
	[
		resolved.windowModules.map((windowModule) => windowModule.moduleOf({}).definition.name),
		resolved.windowLayers.map(({ id }) => id),
	],
	[
		["mcp", "app-host", "tabs", "command-menu", "chat-tabs", "ask", "task-work", "canvas-work", "pages"],
		["command-menu.layer-0", "terminal-cursor.layer-1"],
	],
);

const startedCore = runtime()
	.modules(...coreModulesNow)
	.start({
		platform: "server",
		env: {},
		scope: { workspaceId: "sumi-plugins" },
	});
const exposedCore = startedCore.expose({ adapter: SUMI_PLUGINS_TEST, authenticate: new AppCallerAuthenticate() });
const routedCodes = await Promise.all(
	coreModulesBefore.map(async (module) => {
		const answered = await exposedCore.answer({
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

check(
	"no built-in plugin runs under an alias, so no module, import or frame route takes a prefix and every wire name stays",
	[
		...resolved.backgroundModules.map(({ prefix }) => prefix),
		...resolved.frameModules.map(({ prefix }) => prefix),
		...["terminal", "chat", "browser-page"].map((app) => resolved.ownPrefixOf(app)),
	].every((prefix) => prefix === null),
	true,
);

const BUILT_IN_STARTED = resolved.startedIds;
const workspaceFiles = new FakeStore();
workspaceFiles.put("workspace:research:sumi.profile.json", {
	v: 1,
	plugins: ["ghost", "terminal"],
});
workspaceFiles.put("workspace:kept:sumi.plugins.json", {
	v: 1,
	rev: 4,
	plugins: {
		chat: { enabled: false },
		terminal: { enabled: false },
		ghost: { enabled: false },
	},
});
workspaceFiles.put("workspace:newer:sumi.plugins.json", {
	v: 2,
	rev: 7,
	plugins: {
		terminal: { enabled: false },
	},
});
workspaceFiles.put("workspace:odd:sumi.profile.json", {
	v: 1,
	plugins: "terminal",
});
workspaceFiles.put("workspace:broken:sumi.profile.json", {
	v: 1,
	plugins: ["terminal"],
});
workspaceFiles.quarantinedOnce.set("workspace:broken:sumi.plugins.json", "sumi.plugins.json.corrupt-1");
const workspaceStore = new StoreClient(workspaceFiles.invoke, undefined);

async function startedIn(workspace: string): Promise<ResolvedPlugins> {
	return startSumiPlugins(await workspacePluginStateOf(workspaceStore, workspace));
}

async function settledSaves(): Promise<void> {
	await new Promise((settled) => setTimeout(settled, 0));
}

const firstStarts = await quietly(async () => {
	const started = [await startedIn("research"), await startedIn("default")];
	await settledSaves();
	return started;
});
const [researchPlugins, defaultPlugins] = firstStarts.answer;
check(
	"a workspace with no plugin state starts the plugins its sumi.profile.json enabled, or the built-in ones without one; an enabled plugin not built in is a note",
	[
		researchPlugins?.startedIds,
		researchPlugins?.refusals,
		researchPlugins?.notes,
		defaultPlugins?.startedIds,
		defaultPlugins?.refusals,
	],
	[
		["sumi-host", "agent", "apps", "command-menu", "chat", "main", "questions", "tasks", "terminal"],
		[],
		["plugin ghost is enabled in sumi.plugins.json but not built in: its entry stays"],
		BUILT_IN_STARTED,
		[],
	],
);
check(
	"the seeding is logged naming its source, and the profile is superseded once",
	[
		firstStarts.infos.some((said) =>
			said.includes("sumi.plugins.json none → seeded from sumi.profile.json (ghost, terminal)"),
		),
		firstStarts.infos.some((said) => said.includes("sumi.plugins.json none → seeded from the built-in profile")),
		firstStarts.infos.filter((said) => said.endsWith("sumi.profile.json in use → superseded by sumi.plugins.json")),
	],
	[true, true, ["[studio] workspace research: sumi.profile.json in use → superseded by sumi.plugins.json"]],
);
check(
	"the first start seeds each workspace's own plugin state under the store's v, and the next start reads it",
	[
		workspaceFiles.files.get(`workspace:research:${PLUGIN_STATE_FILE}`)?.["plugins"],
		workspaceFiles.files.get(`workspace:default:${PLUGIN_STATE_FILE}`)?.["v"],
		workspaceFiles.files.get(`workspace:default:${PLUGIN_STATE_FILE}`)?.["version"],
		(await startedIn("research")).startedIds,
	],
	[
		{
			"sumi-host": { enabled: true },
			apps: { enabled: true },
			"command-menu": { enabled: true },
			chat: { enabled: true },
			main: { enabled: true },
			agent: { enabled: true },
			questions: { enabled: true },
			tasks: { enabled: true },
			ghost: { enabled: true },
			terminal: { enabled: true },
			canvas: { enabled: false },
			"browser-page": { enabled: false },
			files: { enabled: false },
			"markdown-viewer": { enabled: false },
			"code-viewer": { enabled: false },
			"image-viewer": { enabled: false },
			"video-viewer": { enabled: false },
			"html-viewer": { enabled: false },
			git: { enabled: false },
			"composer-expand": { enabled: false },
			"slash-commands": { enabled: false },
			"claude-code": { enabled: false },
			"model-picker": { enabled: false },
			"permission-mode": { enabled: false },
			"sandbox-mode": { enabled: false },
			"working-folder": { enabled: false },
			"plan-usage": { enabled: false },
			"terminal-cursor": { enabled: false },
		},
		1,
		undefined,
		["sumi-host", "agent", "apps", "command-menu", "chat", "main", "questions", "tasks", "terminal"],
	],
);
const keptStart = await quietly(async () => {
	const started = await startedIn("kept");
	await settledSaves();
	return started;
});
check(
	"a kept state turns plugins off, a disabled always-on one is enabled in the file and logged, a plugin it does not list starts enabled",
	[
		keptStart.answer.startedIds.includes("chat"),
		keptStart.answer.startedIds.includes("terminal"),
		keptStart.answer.startedIds.includes("git"),
		keptStart.answer.refusals,
		Reflect.get(Object(workspaceFiles.files.get(`workspace:kept:${PLUGIN_STATE_FILE}`)?.["plugins"]), "chat"),
		keptStart.infos.some(
			(said) => said.includes("rev 4 → 5 (") && said.includes("plugin chat enabled: false → true (always on)"),
		),
	],
	[true, false, true, [], { enabled: true }, true],
);
const newerStart = await quietly(async () => {
	const started = await startedIn("newer");
	await settledSaves();
	return started;
});
check(
	"a plugin state of a newer v is read but never written",
	[
		newerStart.answer.startedIds.includes("terminal"),
		workspaceFiles.files.get(`workspace:newer:${PLUGIN_STATE_FILE}`)?.["rev"],
		newerStart.infos.filter((said) => said.includes("newer state kept, not written")).length,
	],
	[false, 7, 1],
);
const oddStart = await quietly(async () => (await startedIn("odd")).startedIds);
check(
	"a sumi.profile.json of another shape seeds from the built-in profile, logged as an error",
	[oddStart.answer, oddStart.errors],
	[
		BUILT_IN_STARTED,
		["[studio] workspace odd: sumi.profile.json of another shape → the built-in profile seeds the plugins"],
	],
);
const brokenStarts = await quietly(async () => {
	const stores = [
		await workspacePluginStateOf(workspaceStore, "broken"),
		await workspacePluginStateOf(workspaceStore, "broken"),
	];
	const started = stores.map((store) => startSumiPlugins(store).startedIds);
	await settledSaves();
	return started;
});
check(
	"a quarantined state never fails the start: it is reseeded, the reset is an error naming the copy, and a second reader seeds the same",
	[
		brokenStarts.answer[0],
		brokenStarts.answer[0] === undefined ? false : brokenStarts.answer[0].join() === brokenStarts.answer[1]?.join(),
		brokenStarts.errors,
		brokenStarts.infos.filter((said) => said.includes("was written by another window first, rev 1 stays")).length,
	],
	[
		["sumi-host", "agent", "apps", "command-menu", "chat", "main", "questions", "tasks", "terminal"],
		true,
		[
			"[studio] workspace broken: sumi.plugins.json unparseable → kept aside as sumi.plugins.json.corrupt-1 beside it; plugin choices reset to sumi.profile.json",
		],
		1,
	],
);
const racedStore = await workspacePluginStateOf(workspaceStore, "raced");
workspaceFiles.put("workspace:raced:sumi.plugins.json", {
	v: 1,
	rev: 1,
	plugins: {
		git: { enabled: false },
	},
});
const racedStart = await quietly(async () => {
	startSumiPlugins(racedStore);
	await settledSaves();
});
check(
	"a save that loses the rev race re-reads the file and logs the plugins it computed → the ones stored",
	racedStart.infos.filter((said) =>
		said.includes('was written by another window first at rev 1, plugins of this start {"agent"'),
	).length === 1 && racedStart.infos.some((said) => said.includes('→ stored {"git":{"enabled":false}}')),
	true,
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("sumi plugins: all checks passed");
