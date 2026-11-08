import { apps } from "@sumi/apps-plugin";
import { chatTabs } from "@sumi/chat-tabs/module";
import { commandMenu } from "@sumi/command-menu-plugin";
import { chat } from "@sumi/chat-plugin";
import { WindowModuleSchema, sumiHost } from "@sumi/sumi-host-plugin";
import { namedPlugin, plugin, slotFillsOf, slotReaderOf, startOrderOf } from "@widgetarium/plugin-framework";
import { runtime } from "../packages/shared/data-framework/src/index.ts";
import { appHost } from "../plugins/apps/data/app-host/module.ts";
import { browser } from "../packages/domain/browser/module.ts";
import { layout } from "../packages/state/layout/module.ts";
import { workspaces } from "../packages/domain/workspaces/module.ts";
import { commandMenu as commandMenuContract } from "../plugins/command-menu/data/command-menu/index.ts";
import type { Found } from "../plugins/command-menu/data/command-menu/shared/schema/command-menu.schema.ts";
import { check, tally } from "./check-helpers.ts";
import { PluginAppsModule } from "./plugin-apps-fixture.ts";
import { placesOver } from "./places-fixture.ts";

const PROBE_ROW: Found = {
	key: "probe:lantern",
	kind: "app",
	title: "Probe Lantern",
	meta: "Probe",
	haystack: "probe lantern",
	icon: {
		kind: "glyph",
		glyph: "plus",
	},
	intent: {
		do: "run",
		command: "new-tab",
	},
	shortcut: null,
	renames: null,
	actions: [],
	host: "",
	isOnScreen: false,
};

const probe = namedPlugin(
	"probe",
	plugin()
		.require(commandMenu)
		.fill(
			commandMenu.menuDoors.add({
				id: "probe",
				letter: "p",
				label: "Probe",
				placeholder: "Probe things",
				startsWith: "empty",
			}),
			commandMenu.menuPages.add({
				id: "probe",
				draftsOf: ({ pools }) => ({
					foundCount: null,
					drafts: [
						{
							label: "Probed",
							layout: "list",
							rows: pools["probe-rows"] ?? [],
							isFallback: false,
						},
					],
				}),
			}),
			commandMenu.menuRowSources.add({
				id: "probe-rows",
				isFindable: true,
				rowsOf: () => Promise.resolve([PROBE_ROW]),
			}),
		),
	{},
);

const ENABLED = [sumiHost.id, apps.id, commandMenu.id, chat.id, probe.id];
const startOrder = startOrderOf([sumiHost, apps, commandMenu, chat, probe], ENABLED);
const slotFills = slotFillsOf(startOrder.plugins, ENABLED);
const windowModuleFill = slotFills.slots
	.get(sumiHost.windowModules.name)
	?.fills.find(({ pluginId }) => pluginId === commandMenu.id);

if (windowModuleFill === undefined) {
	throw new Error("the command menu plugin filled no window module");
}

const menuModule = WindowModuleSchema.parse(windowModuleFill.item).module(slotReaderOf(slotFills, commandMenu));
const studio = runtime()
	.modules(browser, layout, workspaces, appHost, chatTabs, PluginAppsModule, menuModule)
	.imports(placesOver())
	.start({ platform: "browser", scope: { workspaceId: "menu-fills" } });

async function outputOf<T>(answer: Promise<{ ok: true; output: T } | { ok: false; reason: string }>): Promise<T> {
	const answered = await answer;

	if (!answered.ok) {
		throw new Error(answered.reason);
	}

	return answered.output;
}

check(
	"a plugin filling the menu's slots resolves with no refusal",
	[...startOrder.refusals, ...slotFills.refusals],
	[],
);

const { doors } = await outputOf(studio.send(commandMenuContract.opening.menuDoors));
check(
	"the menu's own doors come first, then the doors other plugins filled (the chat's Ask, the probe), with their keys",
	doors.map(({ id, keys }) => `${id} ${keys}`),
	["anywhere ⌘K", "new-tab ⌘N", "this-tab ⌘L", "ask ⌘I", "probe ⌘P"],
);

const probed = await outputOf(
	studio.send(commandMenuContract.results.commandMenuResults, { text: "", door: "probe", pageId: null }),
);
check(
	"the filled door draws the filled page over the filled row source",
	probed.sections.map(({ label, rows }) => [label, rows.map(({ title }) => title)]),
	[["Probed", ["Probe Lantern"]]],
);

const found = await outputOf(
	studio.send(commandMenuContract.results.commandMenuResults, { text: "lantern", door: "anywhere", pageId: null }),
);
check(
	"a findable row source's rows are found from ⌘K",
	found.sections.flatMap(({ rows }) => rows.map(({ title }) => title)),
	["Probe Lantern"],
);

await outputOf(studio.send(commandMenuContract.opening.toggleCommandMenu, { door: "probe", text: "" }));
const opened = await outputOf(studio.send(commandMenuContract.opening.commandMenu));
check("the filled door opens the menu", [opened.isOpen, opened.door], [true, "probe"]);

const refused = await studio.send(commandMenuContract.opening.toggleCommandMenu, { door: "nope", text: "" });
check(
	"a door nobody filled is refused",
	refused.ok ? "opened" : refused.reason,
	"the command menu has no door nope: no plugin filled it",
);

studio.stop();

if (tally.failed > 0) {
	process.exitCode = 1;
}
