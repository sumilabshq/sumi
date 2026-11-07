import { z } from "zod";
import {
	Anywhere,
	Device,
	PublicGuard,
	Repeatable,
	runtime,
	buildersOf,
	localTransport,
	command,
	event,
	gatewayEvent,
	module,
	query,
	subscriber,
} from "../packages/shared/data-framework/src/index.ts";
import type { AnySubscriber, Failure } from "../packages/shared/data-framework/src/index.ts";
import { check, thrownBy } from "./check-helpers.ts";

const SCOPE = { workspaceId: "events" };
const ON_BROWSER = { platform: "browser", scope: SCOPE } as const;

class Ledger {
	value = 0;
	private readonly listeners = new Set<() => void>();

	add(by: number): void {
		this.value += by;

		for (const listener of this.listeners) {
			listener();
		}
	}

	get listenerCount(): number {
		return this.listeners.size;
	}

	valueChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}

class Heard {
	readonly said: string[] = [];
}

class Vault {
	readonly name = "vault";
}

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

const LedgerDeclared = module("ledger")
	.on(Device)
	.provide(() => ({ ledger: new Ledger(), heard: new Heard() }));

const ledgerBuilt = buildersOf<typeof LedgerDeclared, typeof AddedEvent>();

const AddedEvent = event("added").input(z.object({ by: z.number() }));

const LedgerChangedEvent = event("ledger-changed").from(
	gatewayEvent(Ledger, (ledger, fire) => ledger.valueChanged(fire)),
);

const ValueQuery = ledgerBuilt
	.query("value")
	.public()
	.output(z.number())
	.handle((_input, { ledger }) => ledger.value);

const AddCommand = ledgerBuilt
	.command("add")
	.public()
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable)
	.handle(({ by }, { ledger, heard, emit, invalidate }) => {
		if (by < 0) {
			invalidate(ValueQuery);
			throw new Error("a ledger only grows");
		}

		ledger.add(by);
		emit(AddedEvent, { by });
		invalidate(ValueQuery);
		heard.said.push("answered");
	});

const FirstHearsSubscriber = ledgerBuilt.subscriber(AddedEvent).handle(({ by }, { heard }) => {
	heard.said.push(`first ${by}`);
});

const SecondHearsSubscriber = ledgerBuilt.subscriber(AddedEvent).handle(({ by }, { heard }) => {
	heard.said.push(`second ${by}`);
});

const BrokenHearsSubscriber = subscriber(AddedEvent).handle(() => {
	throw new Error("this subscriber breaks");
});

const SlowHearsSubscriber = ledgerBuilt.subscriber(AddedEvent).handle(async (_input, { heard }) => {
	await new Promise((resolve) => setTimeout(resolve, 20));
	heard.said.push("slow");
});

const BigAddReReadSubscriber = ledgerBuilt
	.subscriber(LedgerChangedEvent)
	.handle((_input, { ledger, heard, invalidate }) => {
		if (ledger.value >= 10) {
			invalidate(ValueQuery);
			heard.said.push("re-read past ten");
		}
	});

const AddContract = command("ledger/add")
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable);

const ValueContract = query("ledger/value").output(z.number());

const ReachOtherContract = command("reaching/reach-other").idempotencyKey(Repeatable);

const LedgerModule = LedgerDeclared.handles(
	ValueQuery,
	AddCommand,
	AddedEvent,
	LedgerChangedEvent,
	FirstHearsSubscriber,
	SecondHearsSubscriber,
	BrokenHearsSubscriber,
	SlowHearsSubscriber,
	BigAddReReadSubscriber,
);

check(
	"a subscriber listed twice in one module is refused by name",
	thrownBy(() => LedgerDeclared.handles(FirstHearsSubscriber).handles(FirstHearsSubscriber)),
	'module "ledger" lists a subscriber of added twice: list each subscriber once',
);

export function typedOnly(): void {
	// @ts-expect-error
	ledgerBuilt.query("timed").handle((_input, { clock }) => clock);
	// @ts-expect-error
	subscriber(AddedEvent).inject({ heard: Heard });
}

function ledgerApp(failures: Failure[] = []) {
	const ledger = new Ledger();
	const heard = new Heard();
	const started = runtime()
		.modules(LedgerModule({ injects: { ledger, heard } }))
		.start({ ...ON_BROWSER, host: { reportFailure: (failure) => failures.push(failure) } });
	return { started, ledger, heard };
}

const failures: Failure[] = [];
const { started, heard, ledger } = ledgerApp(failures);
const answer = await started.send(AddContract, { by: 3 });
check("the emitter's answer arrives before any subscriber runs", heard.said, ["answered"]);
check("a successful command names exactly the queries it invalidated", answer.ok ? answer.invalidated : answer, [
	{ query: "ledger/value", inputKey: null },
]);
await settled();
check(
	"an event with no mark reaches both of its own module's subscribers after the emitter answered",
	heard.said.filter((said) => said.startsWith("first") || said.startsWith("second")),
	["first 3", "second 3"],
);
check("a slow subscriber did not hold the emitter's answer", heard.said.includes("slow"), false);
check(
	"a throwing subscriber is reported once and stops no other subscriber",
	failures.filter(({ reason }) => reason.includes("this subscriber breaks")).length,
	1,
);
await new Promise((resolve) => setTimeout(resolve, 30));
check("the slow subscriber still runs later", heard.said.includes("slow"), true);

const refused = await started.send(AddContract, { by: -1 });
check("a failed command invalidates nothing", refused.ok ? refused.invalidated : "invalidated" in refused, false);

let reReads = 0;
const stopWatching = started.routes.watch(ValueContract, undefined, () => {
	reReads += 1;
});
ledger.add(4);
await settled();
check("a subscriber's invalidation waits for its condition", reReads, 0);
ledger.add(5);
await settled();
check(
	"a gateway's change reaches a subscriber that re-reads the query",
	[reReads, heard.said.at(-1)],
	[1, "re-read past ten"],
);
stopWatching();

started.stop();
ledger.add(1);
await settled();
check(
	"stop() unsubscribes the gateway source and the subscribers",
	[heard.said.at(-1), ledger.listenerCount],
	["re-read past ten", 0],
);

const OtherValueQuery = query("other/value").output(z.number());

const ReachesOtherCommand = command("reach-other")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { invalidate }) => {
		invalidate(OtherValueQuery);
	});

const ReachingModule = module("reaching")
	.on(Device)
	.provide(() => ({}))
	.handles(ReachesOtherCommand);

const reaching = runtime().modules(ReachingModule).start(ON_BROWSER);
const reached = await reaching.send(ReachOtherContract);
check(
	"invalidating a query of a module this one does not import fails, naming the fix",
	reached.ok ? "ok" : reached.reason,
	'reaching/reach-other invalidates other/value, but module "reaching" does not import other: add .imports()',
);

const ForeignEvent = event("other/changed");

const OwnChangedEvent = event("own-changed");

const ForeignEmittingDeclared = module("foreign-emitting")
	.on(Device)
	.provide(() => ({}));

const foreignEmittingBuilt = buildersOf<typeof ForeignEmittingDeclared, typeof OwnChangedEvent>();

const EmitsForeignCommand = foreignEmittingBuilt
	.command("emits-foreign")
	.public()
	.idempotencyKey(Repeatable)
	// @ts-expect-error a module emits only its own events
	.handle((_input, { emit }) => emit(ForeignEvent));

const EmitsForeignContract = command("foreign-emitting/emits-foreign").idempotencyKey(Repeatable);

const foreignEmitting = runtime()
	.modules(ForeignEmittingDeclared.handles(EmitsForeignCommand, OwnChangedEvent))
	.start(ON_BROWSER);
const emittedForeign = await foreignEmitting.send(EmitsForeignContract);
check(
	"a request emitting another module's event is refused where it emits",
	emittedForeign.ok ? "ok" : emittedForeign.reason,
	'foreign-emitting/emits-foreign emits other/changed, which module "foreign-emitting" does not own: a module emits only its own events',
);

const KeptChangedEvent = event("kept-changed");

const SharedChangedEvent = event("shared-changed").public();

const RereadKeptSubscriber = subscriber(KeptChangedEvent).handle(() => undefined);

const KeeperModule = module("keeper")
	.on(Device)
	.provide(() => ({ ledger: new Ledger() }))
	.handles(ValueQuery, SharedChangedEvent, KeptChangedEvent, RereadKeptSubscriber);

const HearsKeptSubscriber = subscriber(event("keeper/kept-changed")).handle(() => undefined);

const HearsSharedSubscriber = subscriber(event("keeper/shared-changed")).handle(() => undefined);

const hearerModuleOf = (heard: AnySubscriber) =>
	module("hearer")
		.on(Device)
		.imports(KeeperModule)
		.provide(() => ({ ledger: new Ledger() }))
		.handles(ValueQuery, heard);

check(
	"another module in the same process subscribing to an event with no mark starts",
	thrownBy(() => runtime().modules(KeeperModule, hearerModuleOf(HearsKeptSubscriber)).start(ON_BROWSER)),
	"",
);
check(
	"another module subscribing to a public event starts",
	thrownBy(() => runtime().modules(KeeperModule, hearerModuleOf(HearsSharedSubscriber)).start(ON_BROWSER)),
	"",
);

const ListensForeignSubscriber = subscriber(ForeignEvent).handle(() => undefined);

const ListeningModule = module("listening")
	.on(Device)
	.provide(() => ({ ledger: new Ledger() }))
	.handles(ValueQuery, ListensForeignSubscriber);

check(
	"a subscriber of another module's event needs that module in .imports()",
	thrownBy(() => runtime().modules(ListeningModule).start(ON_BROWSER)).split("\n")[1],
	'the subscriber of other/changed listens to other/changed, but module "listening" does not import other: add .imports()',
);

class Registry {
	readonly widgets = 3;
}

const vaultsSeen: string[] = [];

const VaultedModule = module("vaulted")
	.on(Device)
	.config<{ readonly vault: Vault }>()
	.provide(({ config }) => {
		vaultsSeen.push(config.vault.name);
		return { ledger: new Ledger() };
	})
	.handles(ValueQuery);

runtime()
	.modules(VaultedModule({ vault: new Vault() }))
	.start(ON_BROWSER);
check("provide receives the config the module was called with", vaultsSeen, ["vault"]);
check(
	"a module whose config is required fails when listed uncalled, and is a type error there",
	thrownBy(() =>
		runtime()
			.modules(
				// @ts-expect-error
				VaultedModule,
			)
			.start(ON_BROWSER),
	).length > 0,
	true,
);
check(
	"a module whose config is required still takes fakes through .with, which skips its config",
	thrownBy(() =>
		runtime()
			.modules(VaultedModule({ injects: { ledger: new Ledger() } }))
			.start(ON_BROWSER),
	),
	"",
);

const placesSeen: string[] = [];

const MaybeHostedModule = module("maybe-hosted")
	.on(Device)
	.config<{ readonly tauri?: { readonly vault: Vault } }>()
	.provide(({ config }) => {
		placesSeen.push(config.tauri === undefined ? "elsewhere" : config.tauri.vault.name);
		return { ledger: new Ledger() };
	})
	.handles(ValueQuery);

runtime().modules(MaybeHostedModule).start(ON_BROWSER);
runtime()
	.modules(MaybeHostedModule({ tauri: { vault: new Vault() } }))
	.start(ON_BROWSER);
check(
	"a module with only optional config runs uncalled with an empty config, and called with what it was given",
	placesSeen,
	["elsewhere", "vault"],
);

const mountsSeen: string[] = [];

const MountedModule = module("canvas")
	.on(Device)
	.config<
		{ readonly kind: "vault"; readonly registry: Registry } | { readonly kind: "project"; readonly folder: string }
	>()
	.provide(({ config }) => {
		mountsSeen.push(config.kind === "vault" ? `vault ${config.registry.widgets}` : `project ${config.folder}`);
		return { ledger: new Ledger() };
	})
	.handles(ValueQuery);

runtime()
	.modules(MountedModule({ kind: "vault", registry: new Registry() }))
	.start(ON_BROWSER);
runtime()
	.modules(MountedModule({ kind: "project", folder: "apps/notes" }))
	.start(ON_BROWSER);
check("a config union reaches provide as the variant the module was called with", mountsSeen, [
	"vault 3",
	"project apps/notes",
]);

const BadPayloadEvent = event("bad-payload")
	.input(z.object({ by: z.number() }))
	.from(gatewayEvent(Ledger, (held, fire) => held.valueChanged(() => fire({ by: "not a number" }))));

const NeverHearsSubscriber = ledgerBuilt.subscriber(BadPayloadEvent).handle((_input, { heard }) => {
	heard.said.push("heard a bad payload");
});

const BadPayloadModule = module("payloads")
	.on(Device)
	.provide(() => ({ ledger: new Ledger(), heard: new Heard() }))
	.handles(ValueQuery, BadPayloadEvent, NeverHearsSubscriber);

const payloadFailures: Failure[] = [];
const payloadLedger = new Ledger();
const payloadHeard = new Heard();
runtime()
	.modules(BadPayloadModule({ injects: { ledger: payloadLedger, heard: payloadHeard } }))
	.start({ ...ON_BROWSER, host: { reportFailure: (failure) => payloadFailures.push(failure) } });
payloadLedger.add(1);
await settled();
check(
	"a source payload the event's schema refuses is reported and never delivered",
	[payloadHeard.said.length, payloadFailures.some(({ code }) => code === "invalid-input")],
	[0, true],
);

const QueryTriesInvalidating = query("tries")
	.output(z.number())
	// @ts-expect-error
	.handle((_input, { invalidate }) => {
		invalidate(ValueQuery);
		return 1;
	});

check("a query's context offers no invalidate", typeof QueryTriesInvalidating.handle, "function");

const ServedLedgerModule = module("served-ledger")
	.on(Anywhere)
	.guard(PublicGuard)
	.provide(() => ({
		ledger: new Ledger(),
		heard: new Heard(),
	}))
	.handles(ValueQuery, LedgerChangedEvent, BigAddReReadSubscriber);
const servedLedger = new Ledger();
const servedLedgerServer = runtime()
	.modules(
		ServedLedgerModule({
			injects: {
				ledger: servedLedger,
				heard: new Heard(),
			},
		}),
	)
	.start({ platform: "server", env: {} });
localTransport().serve(servedLedgerServer);
await settled();
const listeningWhileServed = servedLedger.listenerCount;
servedLedgerServer.stop();
check("a server's stop stops its modules' event sources", [listeningWhileServed, servedLedger.listenerCount], [1, 0]);
