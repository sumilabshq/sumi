import { z } from "zod";
import {
	AuthenticatedGuard,
	PublicGuard,
	Repeatable,
	app,
	command,
	deny,
	guard,
	module,
	query,
} from "../packages/shared/core/src/requests/index.ts";
import type { ModuleFacts } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { check, thrownBy } from "./check-helpers.ts";

class Counter {
	value = 0;
}

class Clock {
	now(): number {
		return 7;
	}
}

const ON_BROWSER = {
	platform: "browser",
	scope: { workspaceId: "tally-workspace" },
} as const;

const CountQuery = query("count")
	.output(z.number())
	.settlesNow()
	.inject({ counter: Counter })
	.handle((_input, { counter }) => counter.value);

const BumpCommand = command("bump")
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable)
	.invalidates([CountQuery])
	.guard(
		guard<{ readonly by: number }>().handle(({ input }) => {
			if (input.by > 10) {
				deny("too far");
			}
		}),
	)
	.inject({ counter: Counter })
	.handle(({ by }, { counter }) => {
		counter.value += by;
	});

const CountContract = query("tally/count").output(z.number()).settlesNow();
const BumpContract = command("tally/bump")
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable)
	.invalidates([CountContract]);

const TallyModule = module("tally").queries(CountQuery).commands(BumpCommand);

const ChargeContract = command("payments/charge")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);

const RefundContract = command("payments/refund")
	.input(z.object({ reason: z.string() }))
	.idempotencyKey(Repeatable);

const ChargeCommand = command("charge")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable)
	.handle(({ cents }) => `charged ${cents}`);

const BuyCommand = command("buy")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable)
	.sends(ChargeContract)
	.handle(async ({ cents }, { send }) => send(ChargeContract, { cents }));

const BuyContract = command("shop/buy")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);

const PaymentsModule = module("payments")
	.commands(ChargeCommand)
	.provide(() => ({}));
const ShopModule = module("shop")
	.commands(BuyCommand)
	.provide(() => ({}));

export function typedOnly(): void {
	// @ts-expect-error
	command("unkeyed").handle(() => undefined);
	// @ts-expect-error
	TallyModule.provide(() => ({}));
	// @ts-expect-error
	TallyModule.provide(() => ({ counter: new Clock() }));
	TallyModule.provide(() => ({ counter: new Counter() }));
	command("pay")
		.idempotencyKey(Repeatable)
		.sends(ChargeContract)
		.handle(async (_input, { send }) => {
			// @ts-expect-error
			await send(RefundContract, { reason: "undeclared" });
		});
	command("quiet")
		.idempotencyKey(Repeatable)
		// @ts-expect-error
		.handle((_input, { send }) => send);
}

const counter = new Counter();
const started = app({ modules: [TallyModule.provide(() => ({ counter }))], ...ON_BROWSER });

check("a self-handled query answers through app()", await started.send(CountContract), { ok: true, output: 0 });
check("a self-handled command runs its handler", await started.send(BumpContract, { by: 3 }), {
	ok: true,
	output: undefined,
});
check("its write is seen by the next read", await started.send(CountContract), { ok: true, output: 3 });
check(
	"a short name is the request's own: the module adds its prefix when it lists it",
	[CountQuery.request.name, CountQuery.request.module],
	["count", null],
);

const stamped = TallyModule.provide(() => ({ counter })).handlers;
check(
	"the module stamps every request and its invalidates list with <module>/<short>",
	stamped.map(({ request }) => [request.name, request.invalidated?.map(({ name }) => name) ?? null]),
	[
		["tally/count", null],
		["tally/bump", ["tally/count"]],
	],
);

const refused = await started.send(BumpContract, { by: 11 });
check("its own input guard refuses on the client", refused.ok ? "ran" : refused.code, "forbidden");

check(
	"a command listed under .queries() is refused by name",
	thrownBy(() =>
		// @ts-expect-error
		module("tally").queries(BumpCommand),
	),
	'module "tally" lists bump under .queries(), but it is a command',
);

check(
	"a module picking its parts from the platform is refused by a starter told no platform",
	thrownBy(() => app({ modules: [TallyModule.provide(() => ({ counter }))] })),
	'module "tally" picks its parts from the platform and scope, and its starter was told neither: pass platform and scope',
);

let seenFacts: ModuleFacts | null = null;
app({
	modules: [
		TallyModule.provide((facts) => {
			seenFacts = facts;
			return { counter };
		}),
	],
	platform: "tauri",
	scope: { workspaceId: "w-1" },
});
check("provide receives the platform and scope its starter was told", seenFacts, {
	platform: "tauri",
	scope: { workspaceId: "w-1" },
	env: {},
});

check(
	"a module that runs anywhere still needs a guard on the server",
	thrownBy(() =>
		server({ modules: [TallyModule.provide(() => ({ counter: new Counter() }))], env: {}, scope: ON_BROWSER.scope }),
	).split("\n")[1],
	"tally/count runs on the server with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it",
);

check(
	"a module guarded with PublicGuard starts on the server",
	thrownBy(() =>
		server({
			modules: [TallyModule.guard(PublicGuard).provide(() => ({ counter: new Counter() }))],
			env: {},
			scope: ON_BROWSER.scope,
		}),
	),
	"",
);

const closed = app({
	modules: [
		module("tally")
			.queries(CountQuery)
			.commands(BumpCommand)
			.guard(guard().handle(() => deny("the tally is closed")))
			.provide(() => ({ counter: new Counter() })),
	],
	...ON_BROWSER,
});
const closedRead = await closed.send(CountContract);
check(
	"a module guard that denies refuses its requests under app()",
	closedRead.ok ? "ran" : [closedRead.code, closedRead.reason],
	["forbidden", "the tally is closed"],
);

check(
	"a module guard that needs a user is refused when app() starts, since a client has no Authenticate",
	thrownBy(() =>
		app({
			modules: [TallyModule.guard(AuthenticatedGuard).provide(() => ({ counter: new Counter() }))],
			...ON_BROWSER,
		}),
	).split("\n")[1],
	"tally/count is guarded by AuthenticatedGuard, which needs a user, and app() has no Authenticate: guard it where its server handles it",
);

const ClockedQuery = query("clocked")
	.output(z.number())
	.guard(
		guard()
			.inject({ clock: Clock })
			.handle(() => undefined),
	)
	.handle(() => 1);

check(
	"a guard injecting what its module does not provide is refused when app() starts",
	thrownBy(() =>
		app({
			modules: [
				module("tally")
					.queries(ClockedQuery)
					.provide(() => ({})),
			],
			...ON_BROWSER,
		}),
	).split("\n")[1],
	"guard #1 of tally/clocked injects clock, which its module does not provide as a Clock",
);

const shop = app({ modules: [ShopModule, PaymentsModule], ...ON_BROWSER });
check("a request sends another module's contract through the running app", await shop.send(BuyContract, { cents: 5 }), {
	ok: true,
	output: "charged 5",
});

check(
	"a module whose declared send has no module and no server is refused when app() starts",
	thrownBy(() => app({ modules: [ShopModule], ...ON_BROWSER })).split("\n")[1],
	"shop/buy sends payments/charge, which no module started by app() handles, and no server is configured",
);

check(
	"the same module starts when a server may answer its send",
	thrownBy(() => app({ modules: [ShopModule], server: "http://127.0.0.1:9", ...ON_BROWSER })),
	"",
);
