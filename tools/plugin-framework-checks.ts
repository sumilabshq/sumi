import { check, tally, thrownBy } from "./check-helpers.ts";
import {
	MemoryPluginStateStore,
	SumiProfileSchema,
	plugin,
	runtime,
	service,
} from "../packages/shared/plugin-framework/src/index.ts";
import type { CallerFacts, Plugin, PluginRuntime, PluginState } from "../packages/shared/plugin-framework/src/index.ts";
import { originOf } from "../packages/shared/plugin-framework/src/plugin-names.ts";
import { startOrderOf } from "../packages/shared/plugin-framework/src/start-order.ts";

interface Marks {
	mark(label: string): void;
}

interface Marked {
	readonly label: string;
	readonly pluginId: string;
}

const marks = service<Marks>("marks");
const extra = service<Marks>("extra");

function idsOf(plugins: readonly Plugin[]): readonly string[] {
	return plugins.map((each) => each.id);
}

function stateIn(store: MemoryPluginStateStore): PluginState | null {
	return store.keptPluginState();
}

const layout = plugin("layout");
const menu = plugin("command-menu");
const chat = plugin("chat").require(layout).optional(menu);
const agents = plugin("background-agents").require(chat);
const usage = plugin("usage-meter").require(chat);
const installedPlugins = [usage, agents, chat, layout, menu];
const profile = SumiProfileSchema.parse({
	plugins: ["layout", "chat", "background-agents", "usage-meter", "command-menu"],
});

check(
	"a plugin id that is not kebab case throws where it is named",
	thrownBy(() => plugin("Chat")),
	'"Chat" is not a name: one kebab-case segment of a-z, such as "command-menu", no digits, capitals, "." or "/"',
);

const startOrder = startOrderOf(installedPlugins, profile.plugins);
check("a plugin starts after the plugins it requires and the optional ones enabled", idsOf(startOrder.plugins), [
	"layout",
	"command-menu",
	"chat",
	"background-agents",
	"usage-meter",
]);
check("a full profile starts with no refusal", startOrder.refusals, []);

check(
	"a plugin whose requirement is off is refused, and so is what requires it",
	startOrderOf(installedPlugins, ["chat", "background-agents"]).refusals,
	["plugin chat requires layout, which is not enabled", "plugin background-agents requires chat, which did not start"],
);

const withoutMenu = startOrderOf(installedPlugins, ["layout", "chat"]);
check("a plugin starts when an optional plugin it wants is off", idsOf(withoutMenu.plugins), ["layout", "chat"]);

const loopEnd = plugin("loop-end");
const loopMiddle = plugin("loop-middle").require(loopEnd);
const loopEndClosed = plugin("loop-end").require(loopMiddle);
check(
	"a requirement cycle is refused on both sides",
	startOrderOf([loopEndClosed, loopMiddle], ["loop-end", "loop-middle"]).refusals,
	[
		"plugin loop-middle requires loop-end, which requires it back",
		"plugin loop-end requires loop-middle, which did not start",
	],
);

const wantsBack = plugin("wants-back");
const wantsFirst = plugin("wants-first").optional(wantsBack);
const wantsBackClosed = plugin("wants-back").optional(wantsFirst);
const optionalLoop = startOrderOf([wantsFirst, wantsBackClosed], ["wants-first", "wants-back"]);
check(
	"an optional cycle is refused: the plugin that closes it does not start",
	[idsOf(optionalLoop.plugins), optionalLoop.refusals],
	[["wants-first"], ["plugin wants-back optionally uses wants-first, which uses it back"]],
);

check(
	"a profile with a key it does not know, such as locked, is refused when parsed",
	SumiProfileSchema.safeParse({ plugins: [], locked: [] }).success,
	false,
);
check(
	"a profile with an unknown key is refused when parsed",
	SumiProfileSchema.safeParse({ plugins: [], overrides: [] }).success,
	false,
);

const twinA = plugin("twin")
	.require(marks)
	.apply((app) => app.use(marks).mark("a"));
const twinB = plugin("twin")
	.require(marks)
	.optional(extra)
	.apply((app) => app.use(marks).mark("b"));
const twinC = plugin("twin")
	.require(marks)
	.optional(extra, layout)
	.apply((app) => app.use(marks).mark("c"));

function marksRecordedInto(marked: Marked[]): (caller: CallerFacts) => Marks {
	return ({ pluginId }) => ({
		mark: (label) => {
			marked.push({ label, pluginId });
		},
	});
}

function twinsStarted(plugins: readonly Plugin[], store: MemoryPluginStateStore, resolves = true): readonly Marked[] {
	return markedBy(plugins, store, resolves).marked;
}

function markedBy(
	plugins: readonly Plugin[],
	store: MemoryPluginStateStore,
	resolves: boolean,
): { readonly marked: readonly Marked[]; readonly started: PluginRuntime } {
	const marked: Marked[] = [];
	const builder = runtime()
		.builtInPlugins(...plugins)
		.state(store)
		.provide(marks, marksRecordedInto(marked));
	const started = (resolves ? builder.withNameResolves() : builder).start();
	return { marked, started };
}

const refused = markedBy([twinA, twinB], new MemoryPluginStateStore(["twin"]), false).started;
check(
	"two built-in plugins with one id: the second does not start, refused naming both and the fix",
	[refused.startedIds, refused.refusals],
	[
		["twin"],
		[
			'plugins #1 and #2 of .builtInPlugins() are both named "twin", so the second does not start: rename the plugin("twin") string of one, or start the runtime .withNameResolves()',
		],
	],
);
const twinsStore = new MemoryPluginStateStore(["twin"]);
const resolved = markedBy([twinA, twinB], twinsStore, true);
check(
	"withNameResolves() starts the second under <id>-2, which prefixes its modules, and the first keeps its id and no prefix",
	[
		resolved.started.startedIds,
		resolved.started.modulePrefixOf("twin"),
		resolved.started.modulePrefixOf("twin-2"),
		resolved.started.refusals,
		resolved.marked,
	],
	[
		["twin", "twin-2"],
		null,
		"twin-2",
		[],
		[
			{ label: "a", pluginId: "twin" },
			{ label: "b", pluginId: "twin-2" },
		],
	],
);
check(
	"the state records which plugin each name stands for: the alias, the id it repeats and the plugin's origin",
	stateIn(twinsStore)?.plugins,
	{
		twin: { enabled: true, from: originOf(twinA) },
		"twin-2": { enabled: true, alias: "twin-2", of: "twin", from: originOf(twinB) },
	},
);
check("reordering builtInPlugins never moves an alias to another plugin", twinsStarted([twinB, twinA], twinsStore), [
	{ label: "a", pluginId: "twin" },
	{ label: "b", pluginId: "twin-2" },
]);
check(
	"a new plugin repeating an id takes the next free suffix; the saved names stay",
	twinsStarted([twinC, twinB, twinA], twinsStore),
	[
		{ label: "a", pluginId: "twin" },
		{ label: "b", pluginId: "twin-2" },
		{ label: "c", pluginId: "twin-3" },
	],
);
check(
	"a plugin's origin is what it requires and marks optional, so two of the same dependencies share one",
	[
		originOf(plugin("twin").require(marks)) === originOf(twinA),
		originOf(plugin("twin").require(marks).optional(extra)) === originOf(twinB),
		originOf(twinA) === originOf(twinB),
	],
	[true, true, false],
);
const twinBChanged = plugin("twin")
	.require(marks)
	.optional(extra, menu)
	.apply((app) => app.use(marks).mark("b, changed"));
check(
	"a plugin whose dependencies changed takes a saved name nobody claimed before a new suffix",
	twinsStarted([twinA, twinBChanged], new MemoryPluginStateStore([], stateIn(twinsStore) ?? undefined)),
	[
		{ label: "a", pluginId: "twin" },
		{ label: "b, changed", pluginId: "twin-2" },
	],
);
check(
	"an alias is a plugin id with a numeric suffix; a plugin id itself still takes no digit",
	[thrownBy(() => twinA.aliased("twin-2")), thrownBy(() => twinA.aliased("twin")), thrownBy(() => plugin("twin-2"))],
	[
		"",
		'"twin" is not an alias: a plugin id and a numeric suffix, such as "chat-2"',
		'"twin-2" is not a name: one kebab-case segment of a-z, such as "command-menu", no digits, capitals, "." or "/"',
	],
);

const seededStore = new MemoryPluginStateStore(["chat"]);
const seeded = runtime().builtInPlugins(layout, chat, agents).alwaysOn(layout).state(seededStore).start();
check(
	"a missing state is seeded from the initial enabled ids and the always-on plugins: the enabled set does not change",
	[seeded.startedIds, stateIn(seededStore)],
	[
		["layout", "chat"],
		{
			plugins: {
				layout: { enabled: true },
				chat: { enabled: true },
				"background-agents": { enabled: false },
			},
		},
	],
);
const keptStore = new MemoryPluginStateStore([], {
	plugins: {
		layout: { enabled: false },
		ghost: { enabled: false },
		chat: { enabled: true },
	},
});
const kept = runtime().builtInPlugins(layout, chat, agents).alwaysOn(layout).state(keptStore).start();
check(
	"a plugin new to the build starts enabled, a disabled always-on plugin is enabled in the state, a removed plugin keeps its entry",
	[kept.startedIds, kept.refusals, stateIn(keptStore)?.plugins],
	[
		["layout", "chat", "background-agents"],
		[],
		{
			layout: { enabled: true },
			ghost: { enabled: false },
			chat: { enabled: true },
			"background-agents": { enabled: true },
		},
	],
);
const ghostly = runtime()
	.builtInPlugins(layout)
	.state(new MemoryPluginStateStore([], { plugins: { layout: { enabled: true }, ghost: { enabled: true } } }))
	.start();
check(
	"a state enabling a plugin that is not built in is a note, never a refusal, and its entry stays",
	[ghostly.refusals, ghostly.notes],
	[[], ["plugin ghost is enabled in sumi.plugins.json but not built in: its entry stays"]],
);
const looseStore = new MemoryPluginStateStore([], {
	written: "by a newer build",
	plugins: {
		layout: { enabled: true, pinned: true },
	},
});
runtime().builtInPlugins(layout, chat).state(looseStore).start();
check("fields this build does not know are read and kept on the next write", stateIn(looseStore), {
	plugins: {
		layout: { enabled: true, pinned: true },
		chat: { enabled: true },
	},
	written: "by a newer build",
});
check(
	"a state that cannot be read fails the start with the reason, never a silent reset",
	thrownBy(() =>
		runtime()
			.builtInPlugins(layout)
			.state({
				initialSource: "nothing",
				keptPluginState: () => {
					throw new Error("the disk is gone");
				},
				initialEnabledIds: () => [],
				queuePluginStateSave: () => undefined,
			})
			.start(),
	),
	"the plugin state sumi.plugins.json cannot be read, so no plugin starts: the disk is gone",
);
check(
	"a state of another shape fails the start with the reason",
	thrownBy(() =>
		runtime()
			.builtInPlugins(layout)
			.state({
				initialSource: "nothing",
				keptPluginState: () => ({ plugins: 3 }),
				initialEnabledIds: () => [],
				queuePluginStateSave: () => undefined,
			})
			.start(),
	).startsWith("the plugin state sumi.plugins.json is not a plugin state, so no plugin starts:"),
	true,
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin framework: all checks passed");
