import { check, tally } from "./check-helpers.ts";
import { MemoryPluginStateStore, plugin, runtime, service } from "../packages/shared/plugin-framework/src/index.ts";
import type { CallerFacts, Plugin, PluginRuntime } from "../packages/shared/plugin-framework/src/index.ts";

interface Backend {
	module(name: string): void;
}

const backend = service<Backend>("backend");
const missing = service<Backend>("missing");

interface Registered {
	readonly pluginId: string;
	readonly name: string;
}

function backendFor(registered: Registered[]): (caller: CallerFacts) => Backend {
	return ({ pluginId }) => ({
		module: (name) => {
			registered.push({ pluginId, name });
		},
	});
}

function started(plugins: readonly Plugin[], registered: Registered[] = []): PluginRuntime {
	return runtime()
		.builtInPlugins(...plugins)
		.state(new MemoryPluginStateStore(plugins.map(({ id }) => id)))
		.provide(backend, backendFor(registered))
		.start();
}

const order: string[] = [];
const kept: { doors: (() => readonly string[]) | null } = { doors: null };
const menu = plugin("menu").apply(() => {
	order.push("menu");
	const doors: string[] = [];
	kept.doors = () => doors;
	return {
		door: (letter: string): void => {
			doors.push(letter);
		},
	};
});
const late: { door: ((letter: string) => void) | null } = { door: null };
const chat = plugin("chat")
	.require(menu, backend)
	.apply((app) => {
		order.push("chat");
		const doors = app.use(menu);
		doors.door("i");
		late.door = doors.door;
		app.use(backend).module("questions");
	});
const registered: Registered[] = [];
const both = started([chat, menu], registered);

check("a plugin applies after the plugins it requires, whatever their order", order, ["menu", "chat"]);
check("app.use answers the API a required plugin returned", kept.doors?.(), ["i"]);
check("a host-provided service records who called it", registered, [{ pluginId: "chat", name: "questions" }]);
check("both plugins start, with no refusal", [both.startedIds, both.refusals], [["menu", "chat"], []]);
check(
	"a plugin API called after start throws, naming the plugin and the method",
	(() => {
		try {
			late.door?.("x");
			return "no throw";
		} catch (thrown) {
			return thrown instanceof Error ? thrown.message : String(thrown);
		}
	})(),
	"menu.door was called after start: call it inside apply",
);
check("a late call adds nothing", kept.doors?.(), ["i"]);

const needsMissing = plugin("needs-missing")
	.require(missing)
	.apply(() => undefined);
const onNeedsMissing = plugin("on-needs-missing")
	.require(needsMissing)
	.apply(() => undefined);
const unprovided = started([needsMissing, onNeedsMissing]);
check(
	"a required service no host provides refuses the plugin, and what requires it",
	[unprovided.startedIds, unprovided.refusals],
	[
		[],
		[
			"plugin needs-missing requires the service missing, which no host provides",
			"plugin on-needs-missing requires needs-missing, which did not start",
		],
	],
);

const seen: { menu: unknown; missing: unknown } = { menu: "unset", missing: "unset" };
const wantsMenu = plugin("wants-menu")
	.optional(menu, missing)
	.apply((app) => {
		seen.menu = app.use(menu);
		seen.missing = app.use(missing);
	});
const alone = started([wantsMenu]);
check(
	"an optional plugin or service that is absent answers null, and the plugin still starts",
	[seen.menu, seen.missing, alone.startedIds, alone.refusals],
	[null, null, ["wants-menu"], []],
);

const stranger = plugin("stranger").apply(() => ({ hello: (): string => "hi" }));
const sneaky = plugin("sneaky").apply((app) => {
	app.use(stranger as never);
});
const unlisted = started([stranger, sneaky]);
check(
	"using a plugin not listed in .require or .optional refuses the plugin",
	unlisted.refusals,
	["plugin sneaky could not apply: plugin sneaky uses stranger, which it does not list in .require or .optional"],
);

const breaks = plugin("breaks").apply(() => {
	throw new Error("no doors today");
});
const onBreaks = plugin("on-breaks")
	.require(breaks)
	.apply(() => undefined);
const broken = started([breaks, onBreaks]);
check(
	"an apply that throws refuses its plugin with the reason, and what requires it",
	[broken.startedIds, broken.refusals],
	[[], ["plugin breaks could not apply: no doors today", "plugin on-breaks requires breaks, which did not start"]],
);

const loopEnd = plugin("loop-end");
const loopStart = plugin("loop-start")
	.optional(loopEnd)
	.apply(() => undefined);
const loopEndClosed = plugin("loop-end")
	.optional(loopStart)
	.apply(() => undefined);
const optionalLoop = started([loopStart, loopEndClosed]);
check(
	"an optional cycle is refused",
	optionalLoop.refusals,
	["plugin loop-end optionally uses loop-start, which uses it back"],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin apply: all checks passed");
