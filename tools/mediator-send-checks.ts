import { fakeApp, module } from "../packages/core/src/mediator/index.ts";
import { check, thrownBy } from "./mediator-check.ts";
import * as fx from "./mediator-fixture.ts";

const { seen } = fx;
const web = fx.appOn("web", [fx.canvasModule]);
const obsidian = fx.appOn("obsidian", [fx.canvasModule]);

const orphanAnswer = await web.send(fx.OrphanQuery, undefined);
check(
	"a request no module handles is refused at send, naming it",
	orphanAnswer.ok ? "answered" : orphanAnswer.reason,
	"no module handles canvas/orphan",
);
const again = module({ name: "canvas", handlers: [fx.PlatformQueryHandler] });
check(
	"app() refuses a request with two handlers, naming both",
	thrownBy(() => fx.appOn("web", [fx.canvasModule, again])).includes(
		"canvas/platform has 2 handlers: PlatformQueryHandler (canvas), PlatformQueryHandler (canvas)",
	),
	true,
);
const elsewhere = module({
	name: "billing",
	handlers: [fx.PlatformQueryHandler],
	provide: fx.canvasModule.provide,
});
check(
	"app() refuses a handler in a module its request does not name",
	thrownBy(() => fx.appOn("web", [elsewhere])).includes('in module "billing"'),
	true,
);
check(
	"app() refuses a handler whose dependency no module provides",
	thrownBy(() => fx.appOn("web", [module({ name: "canvas", handlers: [fx.PlatformQueryHandler] })])),
	"PlatformQueryHandler injects Pages, which no module provides",
);
check(
	"a handler built outside app() throws, naming it",
	thrownBy(() => new fx.PagesQueryHandler()).startsWith("PagesQueryHandler is built only by app()"),
	true,
);

check("this.inject() resolves the provider of the host's platform: web", await web.send(fx.PlatformQuery, undefined), {
	ok: true,
	output: "web pages on web",
});
check(
	"this.inject() resolves the provider of the host's platform: obsidian",
	await obsidian.send(fx.PlatformQuery, undefined),
	{ ok: true, output: "vault pages on obsidian" },
);

seen.order.length = 0;
await web.send(fx.PagesQuery, { prefix: "" });
check("middleware runs in declared order around the handler", seen.order, [
	"outer>",
	"inner>",
	"handler",
	"<inner",
	"<outer",
]);

check("input is validated before the handler", await web.send(fx.AddPageCommand, { title: "" }), {
	ok: false,
	reason: "canvas/add-page input: title: Too small: expected string to have >=1 characters",
	ran: false,
});
check("output is validated after the handler", await web.send(fx.HalfQuery, undefined), {
	ok: false,
	reason: "canvas/half output: (root): Invalid input: expected int, received number",
	ran: false,
});
check("a throw in a query handler becomes a refusal that wrote nothing", await web.send(fx.FailingQuery, undefined), {
	ok: false,
	reason: "the vault is gone",
	ran: false,
});
check("a request with no handler is refused", await web.send(fx.OrphanQuery, undefined), {
	ok: false,
	reason: "no module handles canvas/orphan",
	ran: false,
});

seen.added = 0;
seen.keys.length = 0;
const first = await web.send(fx.AddPageCommand, { title: "Notes" });
const repeat = await web.send(fx.AddPageCommand, { title: "Notes" });
check("an idempotent repeat runs the handler once", seen.added, 1);
check("an idempotent repeat answers the first answer", repeat, first);
check("the handler receives the idempotency key", seen.keys, ["Notes"]);

seen.keys.length = 0;
await web.send(fx.BumpCommand, undefined);
await web.send(fx.BumpCommand, undefined);
check('"none" runs every repeat with no key', [seen.bumped, seen.keys], [2, [null, null]]);

seen.keys.length = 0;
await web.send(fx.SaveCommand, { text: "a" }, { idempotencyKey: "call-1" });
await web.send(fx.SaveCommand, { text: "a" }, { idempotencyKey: "call-1" });
await web.send(fx.SaveCommand, { text: "a" }, { idempotencyKey: "call-2" });
check('"per-call" drops a repeat of one call and runs another', seen.keys, ["call-1", "call-2"]);

const fake = fakeApp({ answers: { [fx.PagesQuery.name]: ["Fake"], [fx.PlatformQuery.name]: 7 } });
check("fakeApp answers a given answer", await fake.send(fx.PagesQuery, { prefix: "" }), { ok: true, output: ["Fake"] });
check("fakeApp refuses a query with no answer", (await fake.send(fx.SlowQuery, undefined)).ok, false);
check("fakeApp holds an answer to the output schema", (await fake.send(fx.PlatformQuery, undefined)).ok, false);
