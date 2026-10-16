import { z } from "zod";
import {
	ServerTransport,
	app,
	command,
	handlerOf,
	module,
	provided,
	query,
} from "../packages/core/src/mediator/index.ts";
import type { CommandAnswer, InputOf, Module, ServerCall } from "../packages/core/src/mediator/index.ts";
import { check, thrownBy } from "./mediator-check.ts";
import { appOn, hostOn, onPlatform } from "./mediator-fixture.ts";

abstract class Clock {
	abstract now(): string;
}

abstract class Ledger {
	abstract total(): number;
}

const TimeQuery = query("platformed/time").output(z.string());
const TotalQuery = query("platformed/total").output(z.number());
const ChargeCommand = command("platformed/charge")
	.input(z.object({ cents: z.number() }))
	.output(z.object({ charged: z.number() }))
	.idempotencyKey(({ cents }) => String(cents))
	.onServer();
const RelayedTimeQuery = query("relay/relayed-time").output(z.string());

class TimeQueryHandler extends handlerOf(TimeQuery) {
	private readonly clock = this.inject(Clock);
	override async handle(): Promise<string> {
		return this.clock.now();
	}
}

class TotalQueryHandler extends handlerOf(TotalQuery) {
	private readonly ledger = this.inject(Ledger);
	override async handle(): Promise<number> {
		return this.ledger.total();
	}
}

class ChargeCommandHandler extends handlerOf(ChargeCommand) {
	private readonly ledger = this.inject(Ledger);
	override async handle({ cents }: InputOf<typeof ChargeCommand>): Promise<{ charged: number }> {
		return { charged: cents + this.ledger.total() };
	}
}

class RelayedTimeQueryHandler extends handlerOf(RelayedTimeQuery) {
	override async handle(): Promise<string> {
		const time = await this.send(TimeQuery, undefined);
		return time.ok ? `relayed ${time.output}` : time.reason;
	}
}

const clockOnWeb = provided(Clock, { web: () => ({ now: () => "web noon" }) });
const clockEverywhere = provided(Clock, {
	web: () => ({ now: () => "web noon" }),
	obsidian: () => ({ now: () => "vault noon" }),
});
const ledgerOnServer = provided(Ledger, { server: () => ({ total: () => 100 }) });

const timeModule = (
	provide: typeof clockEverywhere | typeof clockOnWeb,
	exports: readonly (typeof Clock)[] = [],
): Module =>
	module({
		name: "platformed",
		handlers: [TimeQueryHandler, ChargeCommandHandler],
		provide: [provide, ledgerOnServer],
		exports,
	});

check(
	"provided() answers the factory of the host's platform",
	await appOn("obsidian", [timeModule(clockEverywhere)]).send(TimeQuery, undefined),
	{ ok: true, output: "vault noon" },
);
check(
	"app() refuses a dependency with no factory for a platform the app ships to, naming both",
	thrownBy(() =>
		onPlatform("web", () =>
			app({ modules: [timeModule(clockOnWeb)], platforms: ["web", "mobile"], host: hostOn("web") }),
		),
	).includes('Clock (module "platformed") has no implementation on mobile, which this app ships to'),
	true,
);
check(
	"app() refuses a host of another platform than the build",
	thrownBy(() => onPlatform("web", () => app({ modules: [], platforms: ["obsidian"], host: hostOn("obsidian") }))),
	"app() refused:\nthis build runs on web, but the host given to app() is obsidian",
);

const clientTotal = module({ name: "platformed", handlers: [TotalQueryHandler], provide: [ledgerOnServer] });
check(
	"a client handler injecting a dependency provided only on server is refused with the fix",
	thrownBy(() => appOn("web", [clientTotal])),
	"TotalQueryHandler injects Ledger, which is provided only on server. Mark the request .onServer(), or keep it on the client and send a server request from it.",
);

const onServerApp = appOn("web", [timeModule(clockEverywhere)]);
check(
	"an .onServer() request sent in an app goes to the transport, which refuses while no server is configured",
	await onServerApp.send(ChargeCommand, { cents: 5 }),
	{ ok: false, reason: "platformed/charge runs on the server, and no server is configured for this app", ran: false },
);

class EchoTransport extends ServerTransport {
	override async send({ request, input }: ServerCall): Promise<CommandAnswer<unknown>> {
		return { ok: true, output: { charged: Number(Reflect.get(Object(input), "cents")) * 2, via: request.name } };
	}
}
const wired = module({
	name: "platformed",
	handlers: [TimeQueryHandler],
	provide: [clockEverywhere, provided(ServerTransport, { web: () => new EchoTransport() })],
});
check(
	"a provided ServerTransport carries the .onServer() request, and its answer is held to the output schema",
	await appOn("web", [wired]).send(ChargeCommand, { cents: 5 }),
	{ ok: true, output: { charged: 10 } },
);

const relayAlone = module({ name: "relay", handlers: [RelayedTimeQueryHandler] });
check(
	"this.send from a handler goes through the app's mediator",
	await appOn("web", [timeModule(clockEverywhere), relayAlone]).send(RelayedTimeQuery, undefined),
	{ ok: true, output: "relayed web noon" },
);

const ReadsClock = query("reader/reads-clock").output(z.string());
class ReadsClockHandler extends handlerOf(ReadsClock) {
	private readonly clock = this.inject(Clock);
	override async handle(): Promise<string> {
		return this.clock.now();
	}
}
const exporting = timeModule(clockEverywhere, [Clock]);
const closed = timeModule(clockEverywhere);
check(
	"a module injecting another module's dependency it does not import is refused, naming both modules",
	thrownBy(() => appOn("web", [closed, module({ name: "reader", handlers: [ReadsClockHandler] })])),
	'ReadsClockHandler in module "reader" injects Clock, which module "platformed" provides but does not export to it: add Clock to its exports and "platformed" to the imports of "reader"',
);
check(
	"a module importing a module that exports the dependency injects it",
	await appOn("web", [exporting, module({ name: "reader", handlers: [ReadsClockHandler], imports: [exporting] })]).send(
		ReadsClock,
		undefined,
	),
	{ ok: true, output: "web noon" },
);
check(
	"importing a module that does not export the dependency is still refused",
	thrownBy(() =>
		appOn("web", [closed, module({ name: "reader", handlers: [ReadsClockHandler], imports: [closed] })]),
	).includes("does not export to it"),
	true,
);
check(
	"app() refuses a module exporting what it does not provide",
	thrownBy(() => appOn("web", [module({ name: "relay", handlers: [], exports: [Clock] })])).includes(
		'module "relay" exports Clock, which it does not provide',
	),
	true,
);

const LateLedgerQuery = query("platformed/late-ledger").output(z.number());
class LateLedgerQueryHandler extends handlerOf(LateLedgerQuery) {
	override async handle(): Promise<number> {
		return this.inject(Ledger).total();
	}
}
const lateInjecting = module({ name: "platformed", handlers: [LateLedgerQueryHandler], provide: [ledgerOnServer] });
check(
	"inject() inside handle() is refused, so no injection skips the checks app() makes at start",
	Reflect.get(await appOn("web", [lateInjecting]).send(LateLedgerQuery, undefined), "reason"),
	"LateLedgerQueryHandler injects Ledger after it was built: inject in a field initialiser, `private readonly x = this.inject(Ledger)`, so app() checks it at start",
);
