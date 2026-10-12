import { JSDOM } from "jsdom";
import { byId } from "./dom-find.ts";
import { present } from "./page-dom.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div><div id="broken"></div></body>`, {
	pretendToBeVisual: true,
});
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	Event: dom.window.Event,
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { widget } = await import("../packages/core/src/widget-builder.ts");
const { manifestOfModule } = await import("../packages/core/src/gateway/declared.ts");
const { statesIn } = await import("../packages/core/src/registry-scope.ts");
const { checkWidget } = await import("../packages/core/src/widget-check.ts");
const fixture = await import("./widget-builder-fixture.ts");
const { ports, seen, askedIds } = fixture;

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const tick = () => new Promise((settled) => setTimeout(settled, 0));
const settle = async (): Promise<void> => {
	for (let turn = 0; turn < 5; turn += 1) await tick();
};
const last = () => present(seen[seen.length - 1], "a drawn board view");
const host = byId(document, "host");

const Board = widget()
	.inject(ports)
	.states({ Empty: { getTitle: "Nothing yet", getTasks: [] } })
	.pending(fixture.PendingView)
	.failed(fixture.FailedView)
	.render(fixture.BoardView);

// @ts-expect-error a view whose props do not match the ports is refused
widget().inject({ getTitle: ports.getTitle }).render(fixture.NumberTitleView);

render(
	h(Board, {
		getTitle: new fixture.TitleQuery(),
		getTasks: new fixture.TasksQuery(),
		getTask: new fixture.TaskQuery(),
		getFiltered: new fixture.FilteredQuery(),
		rename: new fixture.RenameCommand(),
	}),
	host,
);
await settle();
check(
	"until the value is read the pending view is drawn",
	[host.querySelector("#pending") !== null, seen.length],
	[true, 0],
);

fixture.settleTitle("Today");
await settle();
check("once read, the view gets the value itself", last().getTitle, "Today");
check(
	"a paged query arrives as items, total and hasMore",
	[last().getTasks.items.length, last().getTasks.total, last().getTasks.hasMore],
	[100, 150, true],
);
last().getTasks.more();
await settle();
check("more appends the next page", [last().getTasks.items.length, last().getTasks.hasMore], [150, false]);

check("a query whose input has no start is not read until asked", [last().getTask.data, askedIds], [null, []]);
last().getTask.ask({ id: "t2" });
await settle();
check("ask reads with the input the view gave", last().getTask.data?.title, "Task 2");
last().getTask.ask({ id: "t3" });
await settle();
check("asking again re-reads", [last().getTask.data?.title, askedIds], ["Task 3", ["t2", "t3"]]);

check("a paged query with a filter starts read", last().getFiltered.data.length, 100);
last().getFiltered.ask({ done: true });
await settle();
check(
	"and asking narrows it",
	[last().getFiltered.data.every((task) => task.done), last().getFiltered.total],
	[true, 75],
);

const renamed = await last().rename({ id: "t1", title: "Renamed" });
check("a command's answer reaches the view", renamed, {
	ok: true,
	output: { id: "t1", title: "Renamed", done: false },
});
const refused = await last().rename({ id: "t1", title: "" });
check("a refused command answers ok false", refused.ok, false);
check("a slot arrives as drawn children", [Array.isArray(last().extras), last().extras.length], [true, 0]);
check("the view drew the values", host.querySelector("#board")?.textContent, "Today: 150 Task 3");

const broken = byId(document, "broken");
render(h(Board, { getTitle: new fixture.BrokenTitleQuery() }), broken);
await settle();
check(
	"a failed read draws the failed view, naming the port",
	broken.querySelector("#failed")?.textContent?.startsWith("getTitle: "),
	true,
);
const Plain = widget().inject({ getTitle: ports.getTitle }).render(fixture.TitleView);
render(h(Plain, { getTitle: new fixture.BrokenTitleQuery() }), broken);
await settle();
check("without .failed() the engine's notice is drawn", broken.querySelector(".wg-error") !== null, true);
render(h(Plain, { getTitle: new fixture.SlowTitleQuery() }), broken);
await settle();
check("without .pending() nothing is drawn while reading", broken.innerHTML, "");

check("states ride on the widget", statesIn({ default: Board }), { Empty: { getTitle: "Nothing yet", getTasks: [] } });
const refusalOf = (declare: () => unknown): string => {
	try {
		declare();
		return "declared";
	} catch (refusal: unknown) {
		return refusal instanceof Error ? refusal.message : String(refusal);
	}
};
const ODD_STATES = { Odd: { getTitle: "x", nothing: 1 } };
check(
	"a state naming a port the widget lacks is refused",
	refusalOf(() => widget().inject(ports).states(ODD_STATES)),
	'state "Odd" gives nothing, which the widget does not inject',
);

const manifest = manifestOfModule({ default: Board });
check(
	"a widget with no metadata and no layout still has a manifest",
	[manifest?.role, manifest?.size],
	["control", { preferredWidth: "full", preferredHeight: "auto" }],
);
const source = "export const Board = widget().inject(ports).states({ Empty: {} }).render(BoardView);";
check(
	"the widget check refuses neither its role nor its states",
	checkWidget({ id: "@test/board", source, card: manifest }).filter((one) => ["role", "states"].includes(one.rule)),
	[],
);

render(null, host);
render(null, broken);
if (failed > 0) {
	console.log(`${failed} check(s) failed`);
	process.exit(1);
}
console.log("the widget builder holds");
process.exit(0);
