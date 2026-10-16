import { MemoryDoneKeys, MemoryRateLimits, app } from "../packages/core/src/requests/index.ts";
import type { DoneKeys, RateLimit, RateLimits } from "../packages/core/src/requests/index.ts";
import { Repeatable, command, handler, module, query } from "../packages/core/src/requests/index.ts";
import { server } from "../packages/core/src/requests/server/index.ts";
import { z } from "zod";
import { remoteOver } from "../packages/core/src/requests/wire-client.ts";
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
const served = server({
	modules: [fx.serverPagesModule],
	env: { PAGES_SEED: "Home,About" },
	host: { authenticate: new fx.HeaderAuthenticate(), rateLimits, doneKeys: new TracingDoneKeys() },
});

const wireCalls: string[] = [];
function clientAs(user: string | null) {
	return app({
		modules: [],
		server: SERVER,
		host: {
			fetch: (request) => {
				wireCalls.push(new URL(request.url).pathname);
				return served.fetch(request);
			},
			headers: () => (user === null ? {} : { "x-user": user }),
		},
	});
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
	{ ok: false, reason: "pages/rename-page: no such page", code: "refused-by-guard", ran: false },
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

const keyless = await remoteOver(SERVER, { fetch: served.fetch })({
	request: fx.AddPageCommand,
	sent: { title: "Keyless" },
	idempotencyKey: null,
	signal: new AbortController().signal,
});
check("a server refuses a PerCall call that arrives with no key", keyless.ok ? null : keyless.code, "missing-key");

const crashed = await anonymous.send(fx.CrashQuery);
check("a server crash reaches the client as a refusal with its code", crashed.ok ? null : crashed.code, "failed");

const unreachable = app({
	modules: [],
	server: SERVER,
	host: { fetch: () => Promise.reject(new TypeError("Failed to fetch")) },
});
const lost = await unreachable.send(fx.PagesQuery, { prefix: "" });
check("an unreachable server is a refusal, never a throw", lost.ok ? null : lost.code, "unreachable");

check(
	"server() refuses a client module",
	// @ts-expect-error
	thrownBy(() => server({ modules: [fx.pagesModuleOver(new fx.MemoryPages())], env: {} })),
	'server() refused:\nmodule "pages" runs on the client; a server runs only modules that run on the server',
);
check(
	"server() refuses a module whose guards need a user and no Authenticate",
	thrownBy(() => server({ modules: [fx.serverPagesModule], env: {} })),
	"server() refused:\npages/rename-page is guarded by AuthenticatedGuard, which needs an Authenticate in the starter's host\npages/traced is guarded by AuthenticatedGuard, which needs an Authenticate in the starter's host\npages/who is guarded by AuthenticatedGuard, which needs an Authenticate in the starter's host\npages/stamp is guarded by AuthenticatedGuard, which needs an Authenticate in the starter's host",
);
const RenameElsewhereCommand = command("pages/rename-elsewhere")
	.guard(fx.KnownPageGuard)
	.idempotencyKey(Repeatable)
	.input(z.object({ from: z.string() }));
check(
	"server() refuses a guard whose injected dependency its module does not provide, naming request and guard",
	thrownBy(() =>
		server({
			modules: [
				module("pages", {
					runs: "server",
					handlers: [handler(RenameElsewhereCommand, { run: () => undefined })],
				}),
			],
			env: {},
		}),
	),
	"server() refused:\nguard #1 of pages/rename-elsewhere injects pages, which its module does not provide as a Pages",
);
const Unguarded = query("pages/unguarded").output(z.string());
check(
	"server() refuses a request with no guard",
	thrownBy(() =>
		server({
			// @ts-expect-error
			modules: [module("pages", { runs: "server", handlers: [handler(Unguarded, { run: () => "" })] })],
			env: {},
		}),
	),
	"server() refused:\npages/unguarded runs on the server with no guard: give it PublicGuard or a guard",
);

const outside = await served.fetch(new Request(`${SERVER}/elsewhere`));
check("server() answers only /rpc", outside.status, 404);
