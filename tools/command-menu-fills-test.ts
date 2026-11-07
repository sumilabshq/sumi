import { CommandMenuPlugin, MenuDoorsSlot, MenuPagesSlot, MenuRowSourcesSlot } from "@sumi/command-menu-plugin";
import { SumiHostPlugin, WindowModuleSchema, WindowModulesSlot } from "@sumi/sumi-host-plugin";
import { plugin, slotFillsOf, slotReaderOf, stampSlotName, startOrderOf } from "@widgetarium/plugin-framework";
import { app } from "../packages/shared/data-framework/src/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import {
	CommandMenuQuery,
	CommandMenuResultsQuery,
	MenuDoorsQuery,
	ToggleCommandMenuCommand,
} from "../plugins/command-menu/data/command-menu/index.ts";
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

const ProbePlugin = plugin("probe")
	.require(CommandMenuPlugin)
	.fill(
		MenuDoorsSlot({
			id: "probe",
			letter: "p",
			label: "Probe",
			placeholder: "Probe things",
			startsWith: "empty",
		}),
		MenuPagesSlot({
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
		MenuRowSourcesSlot({
			id: "probe-rows",
			isFindable: true,
			rowsOf: () => Promise.resolve([PROBE_ROW]),
		}),
	);

const ENABLED = [SumiHostPlugin.id, CommandMenuPlugin.id, ProbePlugin.id];
const startOrder = startOrderOf([SumiHostPlugin, CommandMenuPlugin, ProbePlugin], ENABLED);
const slotFills = slotFillsOf(startOrder.plugins, ENABLED);
const [windowModuleFill] = slotFills.slots.get(stampSlotName(SumiHostPlugin.id, WindowModulesSlot))?.fills ?? [];

if (windowModuleFill === undefined) {
	throw new Error("the command menu plugin filled no window module");
}

const menuModule = WindowModuleSchema.parse(windowModuleFill.item).module(slotReaderOf(slotFills, CommandMenuPlugin));
const studio = app()
	.modules(BrowserModule, LayoutModule, WorkspacesModule, AppHostModule, PluginAppsModule, menuModule)
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

const { doors } = await outputOf(studio.send(MenuDoorsQuery));
check(
	"the menu's own doors come first, then the door another plugin filled, with its keys",
	doors.map(({ id, keys }) => `${id} ${keys}`),
	["anywhere ⌘K", "new-tab ⌘N", "ask ⌘I", "this-tab ⌘L", "probe ⌘P"],
);

const probed = await outputOf(studio.send(CommandMenuResultsQuery, { text: "", door: "probe", pageId: null }));
check(
	"the filled door draws the filled page over the filled row source",
	probed.sections.map(({ label, rows }) => [label, rows.map(({ title }) => title)]),
	[["Probed", ["Probe Lantern"]]],
);

const found = await outputOf(studio.send(CommandMenuResultsQuery, { text: "lantern", door: "anywhere", pageId: null }));
check(
	"a findable row source's rows are found from ⌘K",
	found.sections.flatMap(({ rows }) => rows.map(({ title }) => title)),
	["Probe Lantern"],
);

await outputOf(studio.send(ToggleCommandMenuCommand, { door: "probe", text: "" }));
const opened = await outputOf(studio.send(CommandMenuQuery));
check("the filled door opens the menu", [opened.isOpen, opened.door], [true, "probe"]);

const refused = await studio.send(ToggleCommandMenuCommand, { door: "nope", text: "" });
check(
	"a door nobody filled is refused",
	refused.ok ? "opened" : refused.reason,
	"the command menu has no door nope: no plugin filled it",
);

studio.stop();

if (tally.failed > 0) {
	process.exitCode = 1;
}
