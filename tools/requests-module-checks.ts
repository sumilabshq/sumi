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
} from "../packages/core/src/requests/index.ts";
import { server } from "../packages/core/src/requests/server/index.ts";
import { check, thrownBy } from "./check-helpers.ts";

class Counter {
	value = 0;
}

class Clock {
	now(): number {
		return 7;
	}
}

const CountQuery = query("tally/count")
	.output(z.number())
	.settlesNow()
	.inject({ counter: Counter })
	.handle((_input, { counter }) => counter.value);

const BumpCommand = command("tally/bump")
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

const TallyModule = module("tally").queries(CountQuery).commands(BumpCommand);

export function typedOnly(): void {
	// @ts-expect-error
	command("tally/unkeyed").handle(() => undefined);
	// @ts-expect-error
	TallyModule.provide(() => ({}));
	// @ts-expect-error
	TallyModule.provide(() => ({ counter: new Clock() }));
	TallyModule.provide(() => ({ counter: new Counter() }));
}

const counter = new Counter();
const started = app({ modules: [TallyModule.provide(() => ({ counter }))] });

check("a self-handled query answers through app()", await started.send(CountQuery.request), { ok: true, output: 0 });
check("a self-handled command runs its handler", await started.send(BumpCommand.request, { by: 3 }), {
	ok: true,
	output: undefined,
});
check("its write is seen by the next read", await started.send(CountQuery.request), { ok: true, output: 3 });
check(
	"a command lists a self-handled query in invalidates by its request",
	BumpCommand.request.invalidated?.map(({ name }) => name),
	["tally/count"],
);

const refused = await started.send(BumpCommand.request, { by: 11 });
check("its own input guard refuses on the client", refused.ok ? "ran" : refused.code, "forbidden");

const SeparateCountQuery = query("tally/count").output(z.number()).settlesNow();
check(
	"a contract built apart, of the same name, reaches the handler: what the generator relies on",
	await started.send(SeparateCountQuery),
	{ ok: true, output: 3 },
);

check(
	"a command listed under .queries() is refused by name",
	thrownBy(() =>
		// @ts-expect-error
		module("tally").queries(BumpCommand),
	),
	'module "tally" lists tally/bump under .queries(), but it is a command',
);

check(
	"a module that runs anywhere still needs a guard on the server",
	thrownBy(() => server({ modules: [TallyModule.provide(() => ({ counter: new Counter() }))], env: {} })).split(
		"\n",
	)[1],
	"tally/count runs on the server with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it",
);

check(
	"a module guarded with PublicGuard starts on the server",
	thrownBy(() =>
		server({ modules: [TallyModule.guard(PublicGuard).provide(() => ({ counter: new Counter() }))], env: {} }),
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
});
const closedRead = await closed.send(CountQuery.request);
check(
	"a module guard that denies refuses its requests under app()",
	closedRead.ok ? "ran" : [closedRead.code, closedRead.reason],
	["forbidden", "the tally is closed"],
);

check(
	"a module guard that needs a user is refused when app() starts, since a client has no Authenticate",
	thrownBy(() =>
		app({ modules: [TallyModule.guard(AuthenticatedGuard).provide(() => ({ counter: new Counter() }))] }),
	).split("\n")[1],
	"tally/count is guarded by AuthenticatedGuard, which needs a user, and app() has no Authenticate: guard it where its server handles it",
);

const ClockedQuery = query("tally/clocked")
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
		}),
	).split("\n")[1],
	"guard #1 of tally/clocked injects clock, which its module does not provide as a Clock",
);
