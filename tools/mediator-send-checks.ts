import { app, fakeApp, inject, module } from "../packages/core/src/mediator/index.ts";
import { check, thrownBy } from "./mediator-check.ts";
import * as fx from "./mediator-fixture.ts";

const { seen } = fx;
const web = app({ modules: [fx.canvasModule], host: fx.hostOn("web") });
const obsidian = app({ modules: [fx.canvasModule], host: fx.hostOn("obsidian") });

const orphanAnswer = await web.send(fx.Orphan, undefined);
check(
	"a request no module handles is refused at send, naming it",
	orphanAnswer.ok ? "answered" : orphanAnswer.reason,
	"no module handles canvas/orphan",
);
const again = module({ name: "canvas", handlers: [fx.GetPlatformHandler] });
check(
	"app() refuses a request with two handlers, naming both",
	thrownBy(() => app({ modules: [fx.canvasModule, again], host: fx.hostOn("web") })).includes(
		"canvas/get-platform has 2 handlers: GetPlatformHandler (canvas), GetPlatformHandler (canvas)",
	),
	true,
);
const elsewhere = module({
	name: "billing",
	handlers: [fx.GetPlatformHandler],
	provide: fx.canvasModule.provide,
});
check(
	"app() refuses a handler in a module its request does not name",
	thrownBy(() => app({ modules: [elsewhere], host: fx.hostOn("web") })).includes('in module "billing"'),
	true,
);
check(
	"app() refuses a handler whose dependency no module provides",
	thrownBy(() =>
		app({
			modules: [module({ name: "canvas", handlers: [fx.GetPlatformHandler] })],
			host: fx.hostOn("web"),
		}),
	),
	"Pages is provided by no module",
);
check("inject() outside a build throws", thrownBy(() => inject(fx.Pages)).startsWith("inject(Pages) runs only"), true);

check("inject() resolves the provider by host: web", await web.send(fx.GetPlatform, undefined), {
	ok: true,
	output: "web",
});
check("inject() resolves the provider by host: obsidian", await obsidian.send(fx.GetPlatform, undefined), {
	ok: true,
	output: "obsidian",
});

seen.order.length = 0;
await web.send(fx.GetPages, { prefix: "" });
check("middleware runs in declared order around the handler", seen.order, [
	"outer>",
	"inner>",
	"handler",
	"<inner",
	"<outer",
]);

check("input is validated before the handler", await web.send(fx.AddPage, { title: "" }), {
	ok: false,
	reason: "canvas/add-page input: title: Too small: expected string to have >=1 characters",
	ran: false,
});
check("output is validated after the handler", await web.send(fx.GetHalf, undefined), {
	ok: false,
	reason: "canvas/get-half output: (root): Invalid input: expected int, received number",
	ran: false,
});
check("a throw in a query handler becomes a refusal that wrote nothing", await web.send(fx.GetFailing, undefined), {
	ok: false,
	reason: "the vault is gone",
	ran: false,
});
check("a request with no handler is refused", await web.send(fx.Orphan, undefined), {
	ok: false,
	reason: "no module handles canvas/orphan",
	ran: false,
});

seen.added = 0;
seen.keys.length = 0;
const first = await web.send(fx.AddPage, { title: "Notes" });
const repeat = await web.send(fx.AddPage, { title: "Notes" });
check("an idempotent repeat runs the handler once", seen.added, 1);
check("an idempotent repeat answers the first answer", repeat, first);
check("the handler receives the idempotency key", seen.keys, ["Notes"]);

seen.keys.length = 0;
await web.send(fx.Bump, undefined);
await web.send(fx.Bump, undefined);
check('"none" runs every repeat with no key', [seen.bumped, seen.keys], [2, [null, null]]);

seen.keys.length = 0;
await web.send(fx.Save, { text: "a" }, { idempotencyKey: "call-1" });
await web.send(fx.Save, { text: "a" }, { idempotencyKey: "call-1" });
await web.send(fx.Save, { text: "a" }, { idempotencyKey: "call-2" });
check('"per-call" drops a repeat of one call and runs another', seen.keys, ["call-1", "call-2"]);

const fake = fakeApp({ answers: { [fx.GetPages.name]: ["Fake"], [fx.GetPlatform.name]: 7 } });
check("fakeApp answers a given answer", await fake.send(fx.GetPages, { prefix: "" }), { ok: true, output: ["Fake"] });
check("fakeApp refuses a query with no answer", (await fake.send(fx.GetSlow, undefined)).ok, false);
check("fakeApp holds an answer to the output schema", (await fake.send(fx.GetPlatform, undefined)).ok, false);
