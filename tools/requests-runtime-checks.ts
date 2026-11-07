import { z } from "zod";
import {
	Authenticate,
	PerCall,
	PublicGuard,
	command,
	handler,
	localTransport,
	query,
	runtime,
	serverModule,
} from "../packages/shared/data-framework/src/index.ts";
import type { Failure, Runtime, ServedCall, User } from "../packages/shared/data-framework/src/index.ts";
import { check, thrownBy } from "./check-helpers.ts";
import * as fx from "./requests-fixture.ts";

const runs = { queries: 0, commands: 0 };
const held = { release: (): void => undefined, released: Promise.resolve() };

const CountedQuery = query("probe/counted").public().output(z.number());
const CountedCommand = command("probe/counted-command").public().idempotencyKey(PerCall).output(z.number());
const InsideQuery = query("probe/inside").output(z.number());
const ProbeServerModule = serverModule("probe");
const ProbeModule = ProbeServerModule.handlers([
	handler(CountedQuery, ProbeServerModule)
		.guard(PublicGuard)
		.handle(async () => {
			runs.queries += 1;
			const run = runs.queries;
			await held.released;
			return run;
		}),
	handler(CountedCommand, ProbeServerModule)
		.guard(PublicGuard)
		.handle(() => {
			runs.commands += 1;
			return runs.commands;
		}),
	handler(InsideQuery, ProbeServerModule)
		.guard(PublicGuard)
		.handle(() => 0),
]);

class BrokenAuthenticate extends Authenticate {
	override async userOf(): Promise<User | null> {
		throw new Error("the token store at 10.0.0.3 is down");
	}
}

function hold(): void {
	held.released = new Promise((released) => {
		held.release = released;
	});
}

function outsideCall(name: string, idempotencyKey: string | null = null): ServedCall {
	return { name, input: undefined, idempotencyKey, signal: new AbortController().signal };
}

const reported: Failure[] = [];
const probe = runtime()
	.modules(ProbeModule)
	.start({ platform: "server", env: {}, host: { reportFailure: (failure) => reported.push(failure) } });
const anonymous = probe.expose({ adapter: "probe adapter" });

check(
	"an adapter mounts only the requests an outside caller may reach",
	anonymous.requests.map(({ name }) => name),
	["probe/counted", "probe/counted-command"],
);

hold();
const sharedRun = Promise.all([probe.send(CountedQuery), anonymous.answer(outsideCall(CountedQuery.name))]);
await new Promise((settled) => setTimeout(settled, 10));
held.release();
check(
	"an in-process query and an outside query with the same input do not share one run",
	(await sharedRun).map((answer) => (answer.ok ? answer.output : answer.code)).sort(),
	[1, 2],
);

const inProcessKeyed = await probe.send(CountedCommand, undefined, { idempotencyKey: "same-key" });
const outsideKeyed = await anonymous.answer(outsideCall(CountedCommand.name, "same-key"));
check(
	"an outside call with the key an in-process call used runs on its own, never replays that answer",
	[inProcessKeyed, outsideKeyed].map((answer) => (answer.ok ? answer.output : answer.code)),
	[1, 2],
);

const smuggled = { headers: new Headers(), outsideCaller: { user: () => Promise.resolve(fx.IMPERSONATED) } };
const pages = runtime()
	.modules(fx.JoinedPagesServerModule)
	.start({ platform: "server", env: {}, host: { reportFailure: () => undefined } });
check(
	"an in-process send cannot pass itself off as an outside caller with a user",
	await pages.send(fx.WhoQuery, undefined, smuggled),
	{ ok: false, reason: "pages/who needs a signed-in user", code: "unauthenticated", ran: false },
);
check(
	"and a PerCall command sent in process with such a caller still gets a minted key",
	(await probe.send(CountedCommand, undefined, smuggled)).ok,
	true,
);

reported.length = 0;
const brokenlyAuthenticated = probe.expose({ adapter: "broken adapter", authenticate: new BrokenAuthenticate() });
check(
	"an Authenticate that throws answers unauthenticated with a reason that tells nothing of the failure",
	await brokenlyAuthenticated.answer(outsideCall(CountedCommand.name, "broken-key")),
	{ ok: false, reason: "probe/counted-command: the caller could not be authenticated", code: "unauthenticated", ran: false },
);
check(
	"and reports the whole error to the developer",
	reported.map(({ thrown }) => (thrown instanceof Error ? thrown.message : thrown)),
	["the token store at 10.0.0.3 is down"],
);

const shared = localTransport();
const sharer = runtime().imports(fx.PagesContract({ over: shared })).start();
const headersAuthenticate = new fx.HeaderAuthenticate();
const stopFirst = shared.serve(pages, { authenticate: headersAuthenticate });
check(
	"a local transport refuses a second runtime while one is served",
	thrownBy(() => shared.serve(probe)),
	"localTransport().serve() refused:\na runtime is served on this local transport already: stop it first",
);
stopFirst();
shared.serve(pages, { authenticate: headersAuthenticate });
stopFirst();
check(
	"a stale stop leaves whoever serves now in place",
	(await sharer.send(fx.CountQuery)).ok,
	true,
);

const stopping: Runtime = runtime()
	.modules(ProbeModule)
	.start({ platform: "server", env: {}, host: { reportFailure: () => undefined } });
const exposedBeforeStop = stopping.expose({ adapter: "early adapter" });
stopping.stop();
check("a stopped runtime refuses new sends", await stopping.send(CountedCommand), {
	ok: false,
	reason: "probe/counted-command: the runtime that answers it is stopped",
	code: "unreachable",
	ran: false,
});
check(
	"a stopped runtime refuses to be exposed",
	thrownBy(() => stopping.expose({ adapter: "late adapter" })),
	"late adapter refused:\nthe runtime is stopped: start a new one to expose it",
);
check(
	"an adapter exposed before the stop answers its callers that the runtime is stopped",
	(await exposedBeforeStop.answer(outsideCall(CountedQuery.name))).ok,
	false,
);

sharer.stop();
pages.stop();
probe.stop();
