import { MemoryDoneKeys, MemoryRateLimits, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { DoneKeys, RateLimit, RateLimits } from "../packages/shared/data-framework/src/index.ts";
import {
	PublicGuard,
	Repeatable,
	clientModule,
	command,
	guard,
	handler,
	query,
	serverModule,
} from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { z } from "zod";
import { orpcTransport } from "../packages/shared/data-framework/src/wire-client.ts";
import { check, thrownBy } from "./check-helpers.ts";
import * as fx from "./requests-fixture.ts";

const SERVER = "http://server.test";

class TracingRateLimits extends MemoryRateLimits {
	override take(key: string, limit: RateLimit): Promise<boolean> {
		fx.traced.push("rate limit");
		return super.take(key, limit);
	}
}

class TracingDoneKeys extends MemoryDoneKeys {
	override claim(key: string): ReturnType<DoneKeys["claim"]> {
		fx.traced.push("key");
		return super.claim(key);
	}
}

const rateLimits: RateLimits = new TracingRateLimits();
const served = dataFrameworkMiddleware(
	runtime()
		.modules(fx.JoinedPagesServerModule, fx.JoinedOrderedServerModule)
		.provide(() => ({ rateLimits }))
		.start({
			platform: "server",
			env: { PAGES_SEED: "Home,About" },
			host: { doneKeys: new TracingDoneKeys() },
		}),
	{ authenticate: new fx.HeaderAuthenticate() },
);

const wireCalls: string[] = [];
function clientAs(user: string | null) {
	const over = orpcTransport(SERVER, {
		fetch: (request) => {
			wireCalls.push(new URL(request.url).pathname);
			return served.fetch(request);
		},
		headers: () => (user === null ? {} : { "x-user": user }),
	});
	return runtime().imports(fx.PagesContract({ over }), fx.OrderedContract({ over })).start();
}

const anonymous = clientAs(null);
const editor = clientAs("editor");
const reader = clientAs("reader");

check("a request no module of the app runs goes to its server", await anonymous.send(fx.PagesQuery, { prefix: "" }), {
	ok: true,
	output: ["Home", "About"],
});
check("over the oRPC wire at /rpc/<module>/<name>", wireCalls.at(-1), "/rpc/pages/pages");

const callsBefore = wireCalls.length;
check(
	"a refused input never leaves the client",
	await editor.send(fx.AddPageCommand, { title: "" }, { idempotencyKey: "w-0" }),
	{
		ok: false,
		reason: "pages/add-page input: title: Too small: expected string to have >=1 characters",
		code: "invalid-input",
		ran: false,
	},
);
check("so nothing went over the wire", wireCalls.length, callsBefore);

const rename = { from: "About", to: "Team" };
check("AuthenticatedGuard refuses a call with no user", await anonymous.send(fx.RenamePageCommand, rename), {
	ok: false,
	reason: "pages/rename-page needs a signed-in user",
	code: "unauthenticated",
	ran: false,
});
check("HasPermissionGuard refuses a user without the permission", await reader.send(fx.RenamePageCommand, rename), {
	ok: false,
	reason: "pages/rename-page needs the permission pages.rename",
	code: "forbidden",
	ran: false,
});
check("a user with the permission runs it", await editor.send(fx.RenamePageCommand, rename), {
	ok: true,
	output: { count: 2 },
});
check(
	"a project guard reads what its module provides, and refuses a rename of a page that is not there",
	await editor.send(fx.RenamePageCommand, { from: "Nowhere", to: "Else" }),
	{ ok: false, reason: "pages/rename-page: no such page", code: "forbidden", ran: false },
);
check("a guard that throws on the server is a refusal, and nothing ran", await anonymous.send(fx.GuardCrashQuery), {
	ok: false,
	reason: "the guard broke",
	code: "failed",
	ran: false,
});
check(
	"the same rename again stops at the guard, which runs before the key",
	(await editor.send(fx.RenamePageCommand, rename)).ok,
	false,
);

check(
	"the server's rate limit refuses the call past the request's own limit",
	[
		await anonymous.send(fx.LimitedQuery),
		await anonymous.send(fx.LimitedQuery),
		await anonymous.send(fx.LimitedQuery),
	].map((answer) => (answer.ok ? "ok" : answer.code)),
	["ok", "ok", "rate-limited"],
);

fx.traced.length = 0;
await anonymous.send(fx.TracedCommand, undefined, { idempotencyKey: "t-0" });
check("a refused guard stops before the rate limit and the key", fx.traced, []);
fx.traced.length = 0;
await editor.send(fx.TracedCommand, undefined, { idempotencyKey: "t-1" });
check("the policies run guards, then the rate limit, then the key, then the handler", fx.traced, [
	"guard",
	"rate limit",
	"key",
	"handler",
]);

fx.traced.length = 0;
check("a guard and a middleware add to the context the handler reads", await editor.send(fx.ContextQuery), {
	ok: true,
	output: { user: "editor", startedAt: fx.STARTED_AT },
});
check("a request with no declared rate limit is never counted, and a middleware wraps the chain", fx.traced, [
	"before",
	"handler",
	"after",
]);

fx.traced.length = 0;
check(
	"a module middleware and guard run for its handler, and the module guard's user reaches it",
	await editor.send(fx.OrderedCommand, { note: "o-1" }),
	{ ok: true, output: "editor" },
);
check("module steps run first, then the handler's, the key and the handle", fx.traced, [
	"module use",
	"handler use",
	"key",
	"handle",
]);
fx.traced.length = 0;
const refusedByModule = await anonymous.send(fx.OrderedCommand, { note: "o-2" });
check(
	"the module guard refuses after the module middleware, before the handler's own",
	[refusedByModule.ok ? "ran" : refusedByModule.code, fx.traced],
	["unauthenticated", ["module use"]],
);

fx.shutGate();
const one = editor.send(fx.AddPageCommand, { title: "Wire" }, { idempotencyKey: "w-1" });
const two = editor.send(fx.AddPageCommand, { title: "Wire" }, { idempotencyKey: "w-1" });
fx.gate.open();
const [oneAnswer, twoAnswer] = await Promise.all([one, two]);
check("over the wire, the same command key gets the same answer", twoAnswer, oneAnswer);
check("and the server ran it once", (await editor.send(fx.PagesQuery, { prefix: "Wire" })).ok && 1, 1);

fx.shutGate();
const whoAsked = [editor.send(fx.WhoQuery), anonymous.send(fx.WhoQuery), reader.send(fx.WhoQuery)];
fx.gate.open();
check(
	"on the server, a read in flight for one user never answers another",
	(await Promise.all(whoAsked)).map((answer) => (answer.ok ? answer.output : answer.code)),
	["editor", "unauthenticated", "reader"],
);

const stamped = [
	await editor.send(fx.StampCommand, { note: "n-1" }),
	await reader.send(fx.StampCommand, { note: "n-1" }),
];
check(
	"a done key belongs to its user: the same key from another user runs for that user",
	stamped.map((answer) => (answer.ok ? answer.output : answer.code)),
	["editor", "reader"],
);
const stampsBefore = fx.counted.stamps;
check(
	"a key made from the input answers the same user's first answer again, without running",
	[await editor.send(fx.StampCommand, { note: "n-1" }), fx.counted.stamps - stampsBefore],
	[{ ok: true, output: "editor" }, 0],
);

const keyless = await orpcTransport(SERVER, { fetch: served.fetch }).call({
	request: fx.AddPageCommand,
	sent: { title: "Keyless" },
	idempotencyKey: null,
	signal: new AbortController().signal,
});
check("a server refuses a PerCall call that arrives with no key", keyless.ok ? null : keyless.code, "missing-key");

const crashed = await anonymous.send(fx.CrashQuery);
check("a server crash reaches the client as a refusal with its code", crashed.ok ? null : crashed.code, "failed");

const unreachable = runtime()
	.imports(
		fx.PagesContract({
			over: orpcTransport(SERVER, { fetch: () => Promise.reject(new TypeError("Failed to fetch")) }),
		}),
	)
	.start();
const lost = await unreachable.send(fx.PagesQuery, { prefix: "" });
check("an unreachable server is a refusal, never a throw", lost.ok ? null : lost.code, "unreachable");

check(
	"a runtime on the server platform refuses a client module",
	thrownBy(() => runtime().modules(fx.pagesModuleOver(new fx.MemoryPages())).start({ platform: "server" })),
	'runtime() refused:\nmodule "pages" runs on the client; a server runs only modules that run on the server',
);
const keptInProcess = runtime().modules(fx.JoinedPagesServerModule).start({ platform: "server" });
check(
	"a runtime never exposed starts with guards that need a user and no Authenticate",
	thrownBy(() => keptInProcess),
	"",
);
check(
	"an adapter with no Authenticate refuses to expose requests whose guards need a user",
	thrownBy(() => dataFrameworkMiddleware(keptInProcess)),
	[
		"dataFrameworkMiddleware() refused:",
		...["rename-page", "traced", "who", "stamp", "context", "secret", "who-else", "pay"].map(
			(name) =>
				`pages/${name} is guarded by AuthenticatedGuard, which needs a user, and dataFrameworkMiddleware() has no Authenticate: pass one`,
		),
		"pages/mine is guarded by guard #1, which needs a user, and dataFrameworkMiddleware() has no Authenticate: pass one",
	].join("\n"),
);
const RenameElsewhereCommand = command("pages/rename-elsewhere")
	.idempotencyKey(Repeatable)
	.input(z.object({ from: z.string() }));
check(
	"runtime() refuses a guard whose required dependency neither its module nor the runtime provides, naming request and guard",
	thrownBy(() => {
		const ElsewhereServerModule = serverModule("pages");
		const RenameElsewhereCommandHandler = handler(RenameElsewhereCommand, ElsewhereServerModule)
			.guard(PublicGuard)
			.guard(fx.KnownPageGuard)
			.handle(() => undefined);
		return runtime()
			.modules(ElsewhereServerModule.handlers([RenameElsewhereCommandHandler]))
			.start({ platform: "server" });
	}),
	"runtime() refused:\nguard #2 of pages/rename-elsewhere requires pages, which neither its module nor runtime().provide() gives as a Pages",
);
const Unguarded = query("pages/unguarded").public().output(z.string());
const UnguardedClientModule = clientModule("pages");
const UnguardedQueryHandler = handler(Unguarded, UnguardedClientModule).handle(() => "");
const InputOnlyGuard = guard().handle(() => undefined);
const UnguardedServerModule = serverModule("pages").guard(InputOnlyGuard);
check(
	"runtime() refuses a handler built for another module",
	thrownBy(() =>
		runtime()
			// @ts-expect-error
			.modules(UnguardedServerModule.handlers([UnguardedQueryHandler]))
			.start({ platform: "server" }),
	),
	'runtime() refused:\nthe handler of pages/unguarded was built for module "pages", but module "pages" holds it',
);
const unguardedRuntime = runtime()
	.modules(UnguardedClientModule.handlers([UnguardedQueryHandler]))
	.start({ platform: "tauri" });
check(
	"an adapter refuses to expose a public request no guard covers, naming it",
	thrownBy(() => dataFrameworkMiddleware(unguardedRuntime, { authenticate: new fx.HeaderAuthenticate() })),
	[
		"dataFrameworkMiddleware() refused:",
		"pages/unguarded is exposed with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it",
	].join("\n"),
);
check(
	"the same runtime answers the request in process, where no adapter exposes it",
	await unguardedRuntime.send(Unguarded),
	{ ok: true, output: "" },
);

check(
	"a step answering without next() is refused: a middleware before a guard cannot answer for anyone",
	await anonymous.send(fx.SecretQuery),
	{
		ok: false,
		reason: "step #1 of pages/secret answered without next(): a step may only refuse",
		code: "failed",
		ran: false,
	},
);

check(
	"a step that passes on a user of its own is refused: the user comes from Authenticate only",
	[await anonymous.send(fx.WhoElseQuery), (await editor.send(fx.WhoElseQuery)).ok],
	[
		{
			ok: false,
			reason: "step #1 of pages/who-else replaced user, which only the server sets",
			code: "failed",
			ran: false,
		},
		false,
	],
);

const paysBefore = fx.counted.pays;
const paid = [
	await editor.send(fx.PayCommand, { n: 5 }, { idempotencyKey: "pay-1" }),
	await editor.send(fx.PayCommand, { n: 5 }, { idempotencyKey: "pay-1" }),
];
check(
	"a step throwing after the command ran answers ran: true, and the settled key never runs it again",
	[paid, fx.counted.pays - paysBefore],
	[
		[
			{ ok: false, reason: "the logger broke", code: "failed", ran: true },
			{ ok: false, reason: "the logger broke", code: "failed", ran: true },
		],
		1,
	],
);

const mine = [await anonymous.send(fx.MineQuery), await editor.send(fx.MineQuery)];
check(
	"a project guard that needs a user covers its handler and refuses a caller with none",
	mine.map((answer) => (answer.ok ? answer.output : answer.code)),
	["unauthenticated", "editor"],
);

const notesBefore = fx.counted.notes;
const anonymousNotes = [
	await anonymous.send(fx.NoteCommand, { note: "shared" }),
	await anonymous.send(fx.NoteCommand, { note: "shared" }),
];
check(
	"a key made from the input never hands one anonymous caller another's answer: each runs",
	[anonymousNotes.map((answer) => answer.ok), fx.counted.notes - notesBefore],
	[[true, true], 2],
);
const signedNotes = [
	await editor.send(fx.NoteCommand, { note: "shared" }),
	await editor.send(fx.NoteCommand, { note: "shared" }),
];
check(
	"while a signed-in caller's repeat of the same data answers the first answer",
	[signedNotes[1], fx.counted.notes - notesBefore],
	[signedNotes[0], 3],
);

const anonymousAdds = [
	await anonymous.send(fx.AddPageCommand, { title: "Anon" }, { idempotencyKey: "anon-1" }),
	await anonymous.send(fx.AddPageCommand, { title: "Anon" }, { idempotencyKey: "anon-1" }),
];
const anonPages = await anonymous.send(fx.PagesQuery, { prefix: "Anon" });
check(
	"an anonymous PerCall key still answers its repeat, because a call key cannot be guessed",
	[anonymousAdds[1], anonPages.ok ? anonPages.output.length : anonPages.reason],
	[anonymousAdds[0], 1],
);

const GreedyServerModule = serverModule("greedy").provide(() => ({ rateLimits: new MemoryRateLimits() }));
const GreedyQuery = query("greedy/greedy").output(z.string());
const GreedyQueryHandler = handler(GreedyQuery, GreedyServerModule)
	.guard(PublicGuard)
	.handle(() => "");
check(
	"runtime() refuses a module providing what the runtime provides, naming both",
	thrownBy(() =>
		runtime()
			.modules(GreedyServerModule.handlers([GreedyQueryHandler]))
			.start({ platform: "server" }),
	),
	'runtime() refused:\nmodule "greedy" provides rateLimits, which runtime().provide() already gives every module: rename one',
);

const outside = await served.fetch(new Request(`${SERVER}/elsewhere`));
check("dataFrameworkMiddleware() answers only /rpc", outside.status, 404);
