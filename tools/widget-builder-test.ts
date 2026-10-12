import { JSDOM } from "jsdom";
import { byId } from "./dom-find.ts";
import { present } from "./page-dom.ts";

const dom = new JSDOM(
	`<!doctype html><body><div id="host"></div><div id="broken"></div><div id="plain"></div><div id="extra"></div></body>`,
	{
		pretendToBeVisual: true,
	},
);
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
const { inject, widget } = await import("../packages/core/src/widget-builder.ts");
const { manifestOfModule } = await import("../packages/core/src/gateway/declared.ts");
const { statesIn } = await import("../packages/core/src/registry-scope.ts");
const { checkWidget } = await import("../packages/core/src/widget-check.ts");
const { offsetOfCursor, pageAt } = await import("../packages/core/src/gateway/page.ts");
const fixture = await import("./widget-builder-fixture.ts");
const { checkOutcomes } = await import("./widget-builder-outcomes.ts");
const { checkHandles } = await import("./widget-builder-handles.ts");
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
	.states({ Empty: { titleQuery: "Nothing yet", tasksQuery: [] } })
	.pending(fixture.PendingView)
	.failed(fixture.FailedView)
	.render(fixture.BoardView);

const titlePorts = inject({ titleQuery: ports.titleQuery });
// @ts-expect-error a plain object is not an inject: it is declared once with inject()
widget().inject({ titleQuery: ports.titleQuery });
// @ts-expect-error an IQuery key ends in Query
inject({ getTitle: ports.titleQuery });
// @ts-expect-error an ICommand key ends in Command
inject({ rename: ports.renameCommand });
inject({ extras: ports.extras });
// @ts-expect-error a view typing a prop differently from the inject is refused
widget().inject(titlePorts).render(fixture.NumberTitleView);
// @ts-expect-error a view missing a prop the inject gives is refused
widget().inject(ports).render(fixture.TitleView);
// @ts-expect-error a view asking for a prop the inject does not give is refused
widget().inject(titlePorts).render(fixture.ExtraPropView);

render(
	h(Board, {
		titleQuery: new fixture.TitleQuery(),
		tasksQuery: new fixture.TasksQuery(),
		taskQuery: new fixture.TaskQuery(),
		filteredQuery: new fixture.FilteredQuery(),
		renameCommand: new fixture.RenameCommand(),
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
check("once read, the view gets the value as data", last().titleQuery.data, "Today");
check(
	"a paged query arrives as items, total and hasMore",
	[last().tasksQuery.data.items.length, last().tasksQuery.total, last().tasksQuery.hasMore],
	[100, 150, true],
);
last().tasksQuery.more();
await settle();
check("more appends the next page", [last().tasksQuery.data.items.length, last().tasksQuery.hasMore], [150, false]);

check("a query whose input has no start is not read until asked", [last().taskQuery.data, askedIds], [null, []]);
last().taskQuery.ask({ id: "t2" });
await settle();
check("ask reads with the input the view gave", last().taskQuery.data?.title, "Task 2");
last().taskQuery.ask({ id: "t3" });
await settle();
check("asking again re-reads", [last().taskQuery.data?.title, askedIds], ["Task 3", ["t2", "t3"]]);

check("a paged query with a filter starts read", last().filteredQuery.data.items.length, 100);
last().filteredQuery.ask({ done: true });
await settle();
check(
	"and asking narrows it",
	[last().filteredQuery.data.items.every((task) => task.done), last().filteredQuery.total],
	[true, 75],
);

const renamed = await last().renameCommand.run({ id: "t1", title: "Renamed" });
check("a command's answer reaches the view", renamed, {
	ok: true,
	output: { id: "t1", title: "Renamed", done: false },
});
const refused = await last().renameCommand.run({ id: "t1", title: "" });
check("a refused command answers ok false", refused.ok, false);
await settle();
check("a slot arrives as drawn children", [Array.isArray(last().extras), last().extras.length], [true, 0]);
check("the view drew the values", host.querySelector("#board")?.textContent, "Today: 150 Task 3");

const plain = byId(document, "plain");
const renamedPlainly: unknown[] = [];
render(
	h(Board, {
		titleQuery: "Plain",
		tasksQuery: ({ cursor, limit }) => {
			const offset = offsetOfCursor(cursor);
			return pageAt(fixture.TASKS.slice(offset, offset + limit), offset, fixture.TASKS.length);
		},
		taskQuery: ({ id }) => fixture.TASKS.find((task) => task.id === id) ?? null,
		filteredQuery: new fixture.FilteredQuery(),
		renameCommand: (input) => {
			renamedPlainly.push(input);
			return { ...input, done: true };
		},
		extras: [h("em", { key: "note", id: "extra-note" }, "drawn by the app")],
	}),
	plain,
);
await settle();
check("a plain value stands for a value query", last().titleQuery.data, "Plain");
check(
	"a plain function answers a paged query, a page at a time",
	[last().tasksQuery.data.items.length, last().tasksQuery.total, last().tasksQuery.hasMore],
	[100, 150, true],
);
last().taskQuery.ask({ id: "t7" });
await settle();
check("a plain function answers an asked query with the input asked", last().taskQuery.data?.title, "Task 7");
check("a plain function runs as a command", await last().renameCommand.run({ id: "t2", title: "Plainly" }), {
	ok: true,
	output: { id: "t2", title: "Plainly", done: true },
});
const refusedPlainly = await last().renameCommand.run({ id: "t2", title: "" });
check(
	"and its input is checked at the crossing before it runs",
	[refusedPlainly.ok, refusedPlainly.ok ? null : refusedPlainly.ran, renamedPlainly.length],
	[false, false, 1],
);
const [Extra] = last().extras;
check("an element handed to a slot arrives as a slot item", [last().extras.length, Extra?.id], [1, "note"]);
const extraNode = byId(document, "extra");
if (Extra) render(h(Extra), extraNode);
await settle();
check("and draws that element", extraNode.querySelector("#extra-note")?.textContent, "drawn by the app");

const broken = byId(document, "broken");
render(
	h(Board, {
		titleQuery: new fixture.BrokenTitleQuery(),
		tasksQuery: new fixture.TasksQuery(),
		taskQuery: new fixture.TaskQuery(),
		filteredQuery: new fixture.FilteredQuery(),
		renameCommand: new fixture.RenameCommand(),
	}),
	broken,
);
await settle();
check(
	"a failed read draws the failed view, naming the port",
	broken.querySelector("#failed")?.textContent?.startsWith("titleQuery: "),
	true,
);
const Plain = widget().inject(titlePorts).render(fixture.TitleView);
render(h(Plain, { titleQuery: new fixture.BrokenTitleQuery() }), broken);
await settle();
check("without .failed() the engine's notice is drawn", broken.querySelector(".wg-error") !== null, true);
render(h(Plain, { titleQuery: new fixture.SlowTitleQuery() }), broken);
await settle();
check("without .pending() nothing is drawn while reading", broken.innerHTML, "");
render(h(Plain, { titleQuery: () => "From a function" }), broken);
await settle();
check("a plain function answers a value query", broken.textContent, "From a function");

check("states ride on the widget", statesIn({ default: Board }), {
	Empty: { titleQuery: "Nothing yet", tasksQuery: [] },
});
const refusalOf = (declare: () => unknown): string => {
	try {
		declare();
		return "declared";
	} catch (refusal: unknown) {
		return refusal instanceof Error ? refusal.message : String(refusal);
	}
};
const ODD_STATES = { Odd: { titleQuery: "x", nothing: 1 } };
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

await checkOutcomes(check, settle);
await checkHandles(check, settle);

render(null, host);
render(null, broken);
render(null, plain);
render(null, extraNode);
if (failed > 0) {
	console.log(`${failed} check(s) failed`);
	process.exit(1);
}
console.log("the widget builder holds");
process.exit(0);
