import { z } from "zod";
import { MemoryDoneKeys, app, clientModule, handler, query } from "../packages/core/src/requests/index.ts";
import type { Failure } from "../packages/core/src/requests/index.ts";
import { check, thrownBy } from "./check-helpers.ts";
import * as fx from "./requests-fixture.ts";

const reported: Failure[] = [];
const pages = new fx.MemoryPages();
const started = app({
	modules: [fx.pagesModuleOver(pages)],
	host: { reportFailure: (failure) => reported.push(failure) },
});

check("a query answers its handler's output", await started.send(fx.PagesQuery, { prefix: "" }), {
	ok: true,
	output: ["Home"],
});

const badInput = await started.send(fx.AddPageCommand, { title: "" }, { idempotencyKey: "k-empty" });
check("a refused input names the request, the field and the code, and nothing ran", badInput, {
	ok: false,
	reason: "pages/add-page input: title: Too small: expected string to have >=1 characters",
	code: "invalid-input",
	ran: false,
});

check("an output outside its schema is refused as invalid-output", await started.send(fx.BadOutputQuery), {
	ok: false,
	reason: "pages/bad-output output: (root): Too small: expected string to have >=10 characters",
	code: "invalid-output",
	ran: false,
});

reported.length = 0;
const crashed = await started.send(fx.CrashQuery);
check("a crash is a refusal, not a throw", crashed, {
	ok: false,
	reason: "cannot read the page",
	code: "failed",
	ran: false,
});
check(
	"a crash is reported once, with what was thrown",
	reported.map((failure) => [failure.source, failure.code, failure.thrown instanceof TypeError]),
	[["pages/crash", "failed", true]],
);

check(
	"a command that throws inside its handler answers ran: true, so it is never retried",
	await started.send(fx.CrashCommand),
	{
		ok: false,
		reason: "the write broke halfway",
		code: "failed",
		ran: true,
	},
);

check(
	"a PerCall command sent without a key gets one minted by the client, and runs",
	await started.send(fx.AddPageCommand, { title: "A" }),
	{ ok: true, output: { count: pages.titles.length } },
);

const refusedTwice = [
	await started.send(fx.RefusingCommand, undefined, { idempotencyKey: "r-1" }),
	await started.send(fx.RefusingCommand, undefined, { idempotencyKey: "r-1" }),
];
check("a handler that refuses before writing answers ran: false with the refused code", refusedTwice[0], {
	ok: false,
	reason: "the page is not there yet",
	code: "refused",
	ran: false,
});
check("and its key is released, so the same key runs again", fx.counted.refusals, 2);

fx.shutGate();
const first = started.send(fx.AddPageCommand, { title: "Twice" }, { idempotencyKey: "k-1" });
const second = started.send(fx.AddPageCommand, { title: "Twice" }, { idempotencyKey: "k-1" });
fx.gate.open();
const [firstAnswer, secondAnswer] = await Promise.all([first, second]);
check("the same command key, sent while it runs, waits and gets the same answer", secondAnswer, firstAnswer);
check(
	"and the handler ran once",
	pages.runs.filter((run) => run === "add Twice"),
	["add Twice"],
);
const later = await started.send(fx.AddPageCommand, { title: "Twice" }, { idempotencyKey: "k-1" });
check("a done key answers the first answer again, without running", later, firstAnswer);
check("still once", pages.runs.filter((run) => run === "add Twice").length, 1);

const bumped = [await started.send(fx.BumpCommand), await started.send(fx.BumpCommand)];
check(
	"a Repeatable command runs every time",
	bumped.map((answer) => answer.ok && answer.output),
	[1, 2],
);

fx.shutGate();
const slowOne = started.send(fx.SlowQuery);
const slowTwo = started.send(fx.SlowQuery);
fx.gate.open();
check("the same query and input sent while it runs share one read", (await slowOne) === (await slowTwo), true);

pages.runs.length = 0;
await Promise.all([started.send(fx.PagesQuery, { prefix: "H" }), started.send(fx.PagesQuery, { prefix: "H" })]);
check("two identical reads at once run the handler once", pages.runs, ["list H"]);

const unhandled = query("pages/unhandled").output(z.string());
check("a request no module runs, with no server, is refused as no-server", await started.send(unhandled), {
	ok: false,
	reason: "pages/unhandled runs on no module of this app, and no server is configured",
	code: "no-server",
	ran: false,
});

check("readNow answers a settlesNow query in the same tick", started.routes.readNow(fx.CountQuery), {
	output: pages.titles.length,
});
reported.length = 0;
check(
	"readNow answers nothing for a settlesNow query whose handler throws",
	started.routes.readNow(fx.BrokenCountQuery),
	null,
);
check(
	"and reports the throw rather than swallowing it",
	reported.map((failure) => [failure.source, failure.code, failure.reason]),
	[["pages/broken-count", "failed", "the count broke"]],
);

check(
	"readNow answers nothing for a query that does not settle now",
	started.routes.readNow(fx.PagesQuery, { prefix: "" }),
	null,
);

check("PagesQueryHandler.handle is callable with a fake and no app", pagesOf(new fx.MemoryPages(["Fake"])), ["Fake"]);

function pagesOf(fake: fx.Pages): unknown {
	return fx.PagesQueryHandler.handle({ prefix: "" }, { pages: fake });
}

class Missing {}
const MissingClientModule = clientModule("pages").provide(() => ({ missing: {} }));
check(
	"a handler injecting what its module does not provide refuses the start, naming it",
	thrownBy(() =>
		app({
			modules: [
				MissingClientModule.handlers([
					handler(fx.SlowQuery, MissingClientModule)
						.inject({ missing: Missing })
						.handle(() => "x"),
				]),
			],
		}),
	),
	"app() refused:\nthe handler of pages/slow injects missing, which its module does not provide as a Missing",
);

const PlainClientModule = clientModule("pages");
const OtherQuery = query("other/thing").output(z.string());
check(
	"a handler in a module its request does not name refuses the start",
	thrownBy(() =>
		app({ modules: [PlainClientModule.handlers([handler(OtherQuery, PlainClientModule).handle(() => "x")])] }),
	),
	'app() refused:\nother/thing is handled in module "pages", but its name names module "other"',
);

const ElsewhereClientModule = clientModule("pages");
check(
	"a handler built for one module and joined into another refuses the start, naming both",
	thrownBy(() =>
		app({
			modules: [ElsewhereClientModule.handlers([handler(fx.SlowQuery, PlainClientModule).handle(() => "x")])],
		}),
	),
	'app() refused:\nthe handler of pages/slow was built for module "pages", but module "pages" holds it',
);

check(
	"two handlers for one request refuse the start",
	thrownBy(() =>
		app({
			modules: [
				fx.PagesClientModule.handlers([
					fx.SlowQueryHandler,
					handler(fx.SlowQuery, fx.PagesClientModule).handle(() => "again"),
				]).with(new fx.MemoryPages()),
			],
		}),
	),
	"app() refused:\npages/slow has 2 handlers",
);

check(
	"a client app refuses a module that runs on the server",
	thrownBy(() => app({ modules: [fx.JoinedPagesServerModule.with({ env: {} })] })),
	'app() refused:\nmodule "pages" runs on the server; a client app reaches it through its server',
);

const keys = new MemoryDoneKeys(2);
await keys.claim("a");
await keys.settle("a", { ok: true, output: 1 });
await keys.claim("b");
await keys.settle("b", { ok: true, output: 2 });
await keys.claim("c");
await keys.settle("c", { ok: true, output: 3 });
check("the memory done keys keep the newest keys only, so memory stays bounded", (await keys.claim("a")).isFirst, true);

const pendingKeys = new MemoryDoneKeys(1);
await pendingKeys.claim("pending");
await pendingKeys.claim("newer");
check("the memory done keys never forget a claim still running", (await pendingKeys.claim("pending")).isFirst, false);
