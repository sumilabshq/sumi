import { z } from "zod";
import {
	Device,
	Repeatable,
	app,
	command,
	event,
	gatewayEvent,
	hostObject,
	module,
	oneOf,
	query,
	subscriber,
} from "../packages/shared/core/src/requests/index.ts";
import type { Failure } from "../packages/shared/core/src/requests/index.ts";
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

const AddedEvent = event("added").input(z.object({ by: z.number() }));

const LedgerChangedEvent = event("ledger-changed").from(
	gatewayEvent(Ledger, (ledger, fire) => ledger.valueChanged(fire)),
);

const ValueQuery = query("value")
	.output(z.number())
	.inject({ ledger: Ledger })
	.handle((_input, { ledger }) => ledger.value);

const AddCommand = command("add")
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable)
	.emits(AddedEvent)
	.inject({ ledger: Ledger, heard: Heard })
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

const FirstHearsSubscriber = subscriber(AddedEvent)
	.inject({ heard: Heard })
	.handle(({ by }, { heard }) => {
		heard.said.push(`first ${by}`);
	});

const SecondHearsSubscriber = subscriber(AddedEvent)
	.inject({ heard: Heard })
	.handle(({ by }, { heard }) => {
		heard.said.push(`second ${by}`);
	});

const BrokenHearsSubscriber = subscriber(AddedEvent).handle(() => {
	throw new Error("this subscriber breaks");
});

const SlowHearsSubscriber = subscriber(AddedEvent)
	.inject({ heard: Heard })
	.handle(async (_input, { heard }) => {
		await new Promise((resolve) => setTimeout(resolve, 20));
		heard.said.push("slow");
	});

const BigAddReReadSubscriber = subscriber(LedgerChangedEvent)
	.inject({ ledger: Ledger, heard: Heard })
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

const LedgerModule = module("ledger")
	.on(Device)
	.subscribers(
		FirstHearsSubscriber,
		SecondHearsSubscriber,
		BrokenHearsSubscriber,
		SlowHearsSubscriber,
		BigAddReReadSubscriber,
	)
	.public(ValueQuery, AddCommand)
	.provide(() => ({ ledger: new Ledger(), heard: new Heard() }));

function ledgerApp(failures: Failure[] = []) {
	const ledger = new Ledger();
	const heard = new Heard();
	const started = app()
		.modules(LedgerModule.with({ ledger, heard }))
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
	"a private event, listed nowhere, reaches both of its own module's subscribers after the emitter answered",
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
	.idempotencyKey(Repeatable)
	.handle((_input, { invalidate }) => {
		invalidate(OtherValueQuery);
	});

const ReachingModule = module("reaching")
	.on(Device)
	.public(ReachesOtherCommand)
	.provide(() => ({}));

const reaching = app().modules(ReachingModule).start(ON_BROWSER);
const reached = await reaching.send(ReachOtherContract);
check(
	"invalidating a query of a module this one does not import fails, naming the fix",
	reached.ok ? "ok" : reached.reason,
	'reaching/reach-other invalidates other/value, but module "reaching" does not import other: add .imports()',
);

const ForeignEvent = event("other/changed");

const EmitsForeignCommand = command("emits-foreign")
	.idempotencyKey(Repeatable)
	.emits(ForeignEvent)
	.handle((_input, { emit }) => emit(ForeignEvent));

const ForeignEmittingModule = module("foreign-emitting")
	.on(Device)
	.public(EmitsForeignCommand)
	.provide(() => ({}));

check(
	"a request emitting another module's event is refused at start",
	thrownBy(() => app().modules(ForeignEmittingModule).start(ON_BROWSER)).split("\n")[1],
	'foreign-emitting/emits-foreign emits other/changed, which module "foreign-emitting" does not own: a module emits only its own events',
);

const KeptChangedEvent = event("kept-changed");

const SharedChangedEvent = event("shared-changed");

const RereadKeptSubscriber = subscriber(KeptChangedEvent).handle(() => undefined);

const KeeperModule = module("keeper")
	.on(Device)
	.subscribers(RereadKeptSubscriber)
	.public(ValueQuery, SharedChangedEvent)
	.provide(() => ({ ledger: new Ledger() }));

const HearsKeptSubscriber = subscriber(event("keeper/kept-changed")).handle(() => undefined);

const HearsSharedSubscriber = subscriber(event("keeper/shared-changed")).handle(() => undefined);

const hearerModuleOf = (heard: typeof HearsKeptSubscriber) =>
	module("hearer")
		.on(Device)
		.imports(KeeperModule)
		.subscribers(heard)
		.public(ValueQuery)
		.provide(() => ({ ledger: new Ledger() }));

check(
	"another module subscribing to a private event is refused at start, naming the fix",
	thrownBy(() => app().modules(KeeperModule, hearerModuleOf(HearsKeptSubscriber)).start(ON_BROWSER)).split("\n")[1],
	'the subscriber of keeper/kept-changed listens to keeper/kept-changed, which module "keeper" keeps private: list it in .public() of keeper',
);
check(
	"another module subscribing to a public event starts",
	thrownBy(() => app().modules(KeeperModule, hearerModuleOf(HearsSharedSubscriber)).start(ON_BROWSER)),
	"",
);

const ListensForeignSubscriber = subscriber(ForeignEvent).handle(() => undefined);

const ListeningModule = module("listening")
	.on(Device)
	.subscribers(ListensForeignSubscriber)
	.public(ValueQuery)
	.provide(() => ({ ledger: new Ledger() }));

check(
	"a subscriber of another module's event needs that module in .imports()",
	thrownBy(() => app().modules(ListeningModule).start(ON_BROWSER)).split("\n")[1],
	'the subscriber of other/changed listens to other/changed, but module "listening" does not import other: add .imports()',
);

const NeedsVaultModule = module("needing")
	.on(Device)
	.needs({ vault: Vault })
	.public(ValueQuery)
	.provide(({ host }) => {
		check("provide receives what the module needs from the host", host.vault.name, "vault");
		return { ledger: new Ledger() };
	});

app()
	.modules(NeedsVaultModule)
	.start({ ...ON_BROWSER, host: { vault: new Vault() } });
check(
	"a host object the module needs and the host did not give is refused at start, naming it",
	thrownBy(() =>
		app()
			.modules(NeedsVaultModule)
			// @ts-expect-error
			.start(ON_BROWSER),
	),
	'module "needing" needs vault: the host did not provide it as a Vault',
);

interface Adapter {
	readonly read: () => string;
}

interface StartedProject {
	readonly folder: string;
}

class Registry {
	readonly widgets = 3;
}

const isAdapter = (value: unknown): value is Adapter =>
	typeof value === "object" && value !== null && "read" in value && typeof value.read === "function";

const isStartedProject = (value: unknown): value is StartedProject =>
	typeof value === "object" && value !== null && "folder" in value && typeof value.folder === "string";

const AdapterHost = hostObject("DataAdapter", isAdapter);

const ProjectHost = hostObject("StartedProject", isStartedProject);

const NeedsAdapterModule = module("adapting")
	.on(Device)
	.needs({ adapter: AdapterHost })
	.public(ValueQuery)
	.provide(({ host }) => {
		check("a host object with no runtime class reaches provide through its guard", host.adapter.read(), "read");
		return { ledger: new Ledger() };
	});

app()
	.modules(NeedsAdapterModule)
	.start({ ...ON_BROWSER, host: { adapter: { read: () => "read" } } });
check(
	"a host object its guard refuses is refused at start, naming the module, the key and the token",
	thrownBy(() =>
		app()
			.modules(NeedsAdapterModule)
			// @ts-expect-error
			.start({ ...ON_BROWSER, host: { adapter: { write: () => "written" } } }),
	),
	'module "adapting" needs adapter: the host did not provide it as a DataAdapter',
);

const lentKinds: string[] = [];

const MountedModule = module("canvas")
	.on(Device)
	.needs(oneOf({ vault: { adapter: AdapterHost, registry: Registry }, project: { project: ProjectHost } }))
	.public(ValueQuery)
	.provide(({ host }) => {
		// @ts-expect-error
		void host.adapter;
		lentKinds.push(
			host.kind === "vault"
				? `vault ${host.adapter.read()} ${host.registry.widgets}`
				: `project ${host.project.folder}`,
		);
		return { ledger: new Ledger() };
	});

app()
	.modules(MountedModule)
	.start({ ...ON_BROWSER, host: { adapter: { read: () => "read" }, registry: new Registry() } });
app()
	.modules(MountedModule)
	.start({ ...ON_BROWSER, host: { project: { folder: "apps/notes" } } });
check("oneOf hands provide the one set the host lent, tagged by its name", lentKinds, [
	"vault read 3",
	"project apps/notes",
]);

const ONE_OF_REFUSED =
	'module "canvas" needs one of: vault {adapter, registry}, project {project}; the host lent {lent}';

check(
	"a host lending parts of two sets is refused, naming the module and the sets",
	thrownBy(() =>
		app()
			.modules(MountedModule)
			// @ts-expect-error
			.start({ ...ON_BROWSER, host: { adapter: { read: () => "read" }, project: { folder: "apps/notes" } } }),
	),
	ONE_OF_REFUSED.replace("{lent}", "parts of vault and project"),
);
check(
	"a host lending no set is refused, naming the module and the sets",
	thrownBy(() =>
		app()
			.modules(MountedModule)
			// @ts-expect-error
			.start({ ...ON_BROWSER, host: {} }),
	),
	ONE_OF_REFUSED.replace("{lent}", "none of them"),
);
check(
	"a set lent with a key missing is refused, naming that key",
	thrownBy(() =>
		app()
			.modules(MountedModule)
			// @ts-expect-error
			.start({ ...ON_BROWSER, host: { adapter: { read: () => "read" } } }),
	),
	'module "canvas" needs registry: the host did not provide it as a Registry',
);
check(
	"a project set lent with its one key undefined is a type error and refused",
	thrownBy(() =>
		app()
			.modules(MountedModule)
			// @ts-expect-error
			.start({ ...ON_BROWSER, host: { project: undefined } }),
	),
	ONE_OF_REFUSED.replace("{lent}", "none of them"),
);
check(
	"a module naming oneOf twice is refused where it is defined",
	thrownBy(() =>
		module("twice")
			.on(Device)
			.needs(oneOf({ one: { vault: Vault } }))
			.needs(oneOf({ other: { registry: Registry } })),
	),
	'module "twice" names .needs(oneOf(...)) twice: a host lends one set of a single list',
);

const UNTOLD_SETS =
	'module "untold" names oneOf sets a host cannot be told apart by: every set needs keys of its own, none named kind';

check(
	"oneOf sets sharing a key, holding none or naming kind are refused where they are defined",
	[
		thrownBy(() =>
			module("untold")
				.on(Device)
				.needs(oneOf({ one: { registry: Registry }, other: { registry: Registry, vault: Vault } })),
		),
		thrownBy(() =>
			module("untold")
				.on(Device)
				.needs(oneOf({ one: {}, other: { vault: Vault } })),
		),
		thrownBy(() =>
			module("untold")
				.on(Device)
				.needs(oneOf({ one: { kind: Vault }, other: { registry: Registry } })),
		),
	],
	[UNTOLD_SETS, UNTOLD_SETS, UNTOLD_SETS],
);

const BadPayloadEvent = event("bad-payload")
	.input(z.object({ by: z.number() }))
	.from(gatewayEvent(Ledger, (held, fire) => held.valueChanged(() => fire({ by: "not a number" }))));

const NeverHearsSubscriber = subscriber(BadPayloadEvent)
	.inject({ heard: Heard })
	.handle((_input, { heard }) => {
		heard.said.push("heard a bad payload");
	});

const BadPayloadModule = module("payloads")
	.on(Device)
	.subscribers(NeverHearsSubscriber)
	.public(ValueQuery)
	.provide(() => ({ ledger: new Ledger(), heard: new Heard() }));

const payloadFailures: Failure[] = [];
const payloadLedger = new Ledger();
const payloadHeard = new Heard();
app()
	.modules(BadPayloadModule.with({ ledger: payloadLedger, heard: payloadHeard }))
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

check(
	"a subscriber's inject naming a key the engine passes is refused where it is declared",
	// @ts-expect-error
	thrownBy(() => subscriber(event("reserved-heard")).inject({ invalidate: Ledger })),
	"inject names invalidate, which the engine passes to every handler: name it otherwise",
);
