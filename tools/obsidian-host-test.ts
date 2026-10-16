import { JSDOM } from "jsdom";
import * as obsidian from "obsidian";

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement });

const { default: WidgetariumPlugin } = await import("../packages/host-obsidian/src/main.ts");

let failed = 0;
const check = (said: string, got: unknown, wanted: unknown): void => {
	const isSame = JSON.stringify(got) === JSON.stringify(wanted);
	if (!isSame) failed += 1;
	console.log(
		`${isSame ? "OK  " : "FAIL"} ${said}${isSame ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
};

const files = new Map<string, string>([
	["Shop/widgetarium.json", JSON.stringify({ app: { name: "Shop" } })],
	["Shop/src/app/routes/route.json", JSON.stringify({ v: 2, layout: { dir: "column", of: [] } })],
	["Notes/plain.md", "hello"],
]);
const folders = new Set<string>(["Shop", "Notes"]);
const viewStates: unknown[] = [];
const settingsOpened: string[] = [];
const leaf = {
	view: { containerEl: dom.window.document.createElement("div") },
	setViewState: async (state: unknown) => void viewStates.push(state),
};
const fileOf = (path: string) => Object.assign(new obsidian.TFile(), { path, basename: path.replace(/\.md$/, "") });
const adapter = {
	exists: async (path: string) => files.has(path) || folders.has(path),
	mkdir: async (path: string) => void folders.add(path),
	read: async (path: string) => {
		const text = files.get(path);
		if (text === undefined) throw new Error(`${path} does not exist`);
		return text;
	},
	write: async (path: string, text: string) => void files.set(path, text),
	list: async (path: string) => ({
		files: [...files.keys()].filter((one) => one.startsWith(`${path}/`) && !one.slice(path.length + 1).includes("/")),
		folders: [...folders].filter((one) => one.startsWith(`${path}/`) && !one.slice(path.length + 1).includes("/")),
	}),
	stat: async (path: string) =>
		files.has(path) ? { type: "file", mtime: 1, size: files.get(path)?.length ?? 0 } : null,
	getResourcePath: (path: string) => path,
	getBasePath: () => "/vault",
	rmdir: async () => undefined,
	remove: async () => undefined,
};
const app = {
	vault: {
		adapter,
		configDir: ".obsidian",
		on: () => ({}),
		getFiles: () => [...files.keys()].map(fileOf),
		getMarkdownFiles: () => [...files.keys()].filter((path) => path.endsWith(".md")).map(fileOf),
		getName: () => "Test vault",
		getAbstractFileByPath: (path: string) => (files.has(path) || folders.has(path) ? fileOf(path) : null),
		create: async (path: string, text: string) => {
			if (files.has(path)) throw new Error("File already exists.");
			files.set(path, text);
			return fileOf(path);
		},
		createFolder: async (path: string) => {
			if (folders.has(path)) throw new Error("Folder already exists.");
			folders.add(path);
		},
	},
	workspace: {
		on: () => ({}),
		onLayoutReady: () => undefined,
		getLeavesOfType: () => [],
		getLeaf: () => leaf,
		getActiveFile: () => null,
	},
	metadataCache: { on: () => ({}), getFileCache: () => null },
	setting: { open: () => settingsOpened.push("open"), openTabById: (id: string) => settingsOpened.push(id) },
};

const commands = new Map<string, { name: string; callback: () => unknown }>();
const views: string[] = [];
const tabs: unknown[] = [];
const built: unknown = Reflect.construct(WidgetariumPlugin, []);
if (!(built instanceof WidgetariumPlugin)) throw new Error("the plugin class built something else");
const plugin = Object.assign(built, {
	app,
	manifest: { id: "widgetarium", version: "0.1.0", dir: ".obsidian/plugins/widgetarium" },
	addCommand: (command: { id: string; name: string; callback: () => unknown }) => commands.set(command.id, command),
	registerView: (type: string) => views.push(type),
	addSettingTab: (tab: unknown) => tabs.push(tab),
	registerInterval: (id: number) => id,
	addRibbonIcon: () => {
		throw new Error("a ribbon icon was added");
	},
	registerMarkdownCodeBlockProcessor: () => {
		throw new Error("a code block processor was registered");
	},
	registerMarkdownPostProcessor: () => {
		throw new Error("a post processor was registered");
	},
});

await plugin.onload();
await plugin.started;

check(
	"the palette holds exactly the three commands",
	[...commands.values()].map((one) => one.name),
	["Settings", "Create new app", "Open app"],
);
check("the studio view and the design view are registered, nothing else", views.sort(), [
	"widgetarium-design",
	"widgetarium-studio",
]);
check("one settings tab is added", tabs.length, 1);

commands.get("settings")?.callback();
check("Settings opens Obsidian's settings on this plugin's tab", settingsOpened, ["open", "widgetarium"]);

let modalShown: unknown = null;
Reflect.set(obsidian.SuggestModal.prototype, "open", function shown(this: unknown) {
	modalShown = this;
});
await commands.get("open-app")?.callback();
await new Promise((settle) => setTimeout(settle, 50));
const listed: unknown = modalShown ? Reflect.apply(Reflect.get(modalShown, "getSuggestions"), modalShown, [""]) : null;
check(
	"Open app lists every folder holding widgetarium.json",
	Array.isArray(listed) ? listed.map((one) => one.id) : listed,
	["Shop"],
);
if (modalShown) Reflect.apply(Reflect.get(modalShown, "onChooseSuggestion"), modalShown, [{ id: "Shop" }]);
await new Promise((settle) => setTimeout(settle, 50));
check("picking one opens its app note in the studio view", viewStates.at(-1), {
	type: "widgetarium-studio",
	state: { file: "Shop.md" },
	active: true,
});
check("and the note it opens names the app", files.get("Shop.md"), '---\nwidgetarium-app: "Shop"\n---\n');

await commands.get("create-app")?.callback();
await new Promise((settle) => setTimeout(settle, 50));
check("Create new app lays a project", files.has("Untitled app/widgetarium.json"), true);
check("and opens it in the studio view", viewStates.at(-1), {
	type: "widgetarium-studio",
	state: { file: "Untitled app.md" },
	active: true,
});

plugin.onunload();
console.log(failed ? `\n${failed} failed` : "\nhost smoke: clean");
process.exit(failed ? 1 : 0);
