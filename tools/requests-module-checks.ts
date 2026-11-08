import { z } from "zod";
import {
	Anywhere,
	AuthenticatedGuard,
	Device,
	MemoryRateLimits,
	PublicGuard,
	Repeatable,
	Server,
	runtime,
	buildersOf,
	command,
	deny,
	guard,
	module,
	moduleContract,
	moduleNamespace,
	query,
} from "../packages/shared/data-framework/src/index.ts";
import { handledItems, named } from "../packages/shared/data-framework/src/index.ts";
import { fullyNamed } from "./requests-names.ts";
import type { ModuleFacts } from "../packages/shared/data-framework/src/index.ts";
import { orpcTransport, servePort } from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { check, thrownBy } from "./check-helpers.ts";

class Counter {
	value = 0;
}

class Clock {
	now(): number {
		return 7;
	}
}

type TallyParts = { readonly counter: Counter };

const ON_BROWSER = {
	platform: "browser",
	scope: { workspaceId: "tally-workspace" },
} as const;

const SCOPE = { workspaceId: "tally-workspace" };

const count = named("count", query<TallyParts>())
	.public()
	.output(z.number())
	.settlesNow()
	.handle((_input, { counter }) => counter.value);

const bump = named("bump", command<TallyParts>())
	.public()
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable)
	.invalidates([count])
	.guard(
		guard<{ readonly by: number }>().handle(({ input }) => {
			if (input.by > 10) {
				deny("too far");
			}
		}),
	)
	.handle(({ by }, { counter }) => {
		counter.value += by;
	});

const CountContract = fullyNamed("tally.count", query()).output(z.number()).settlesNow();
const BumpContract = fullyNamed("tally.bump", command())
	.input(z.object({ by: z.number() }))
	.idempotencyKey(Repeatable)
	.invalidates([CountContract]);

const TallyDeclared = module().on(Anywhere);

function tallyOver(counter: Counter) {
	return TallyDeclared.provide(() => ({ counter })).handles(handledItems("tally", [count, bump]));
}

const ChargeContract = fullyNamed("payments.charge", command())
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);

const RefundContract = fullyNamed("payments.refund", command())
	.input(z.object({ reason: z.string() }))
	.idempotencyKey(Repeatable);

const PaymentsContract = moduleContract("payments", Server, { charge: ChargeContract });
const DevicePaymentsContract = moduleContract("payments", Device, { charge: ChargeContract });

const charge = named("charge", command())
	.public()
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable)
	.handle(({ cents }) => `charged ${cents}`);

const buy = named("buy", command())
	.public()
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable)
	.handle(async ({ cents }, { send }) => send(ChargeContract, { cents }));

const BuyContract = fullyNamed("shop.buy", command())
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);

const PaymentsModule = module()
	.on(Anywhere)
	.provide(() => ({}))
	.handles(handledItems("payments", [charge]));
const ShopModule = module()
	.on(Anywhere)
	.imports(PaymentsContract)
	.provide(() => ({}))
	.handles(handledItems("shop", [buy]));

const invoicesRequest = named("invoices", query())
	.public()
	.output(z.array(z.string()))
	.handle(() => ["inv-1"]);

const createCustomer = named("create-customer", command())
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId)
	.handle(({ userId }) => `cus-${userId}`);

const InvoicesContract = fullyNamed("billing.invoices", query()).output(z.array(z.string()));
const CreateCustomerContract = fullyNamed("billing.create-customer", command())
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId);

const BillingModule = module()
	.on(Server)
	.guard(PublicGuard)
	.provide(() => ({}))
	.handles(handledItems("billing", [invoicesRequest, createCustomer]));
const BillingContract = moduleContract("billing", Server, { invoices: InvoicesContract });

const signUp = named("sign-up", command())
	.public()
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId)
	.handle(async ({ userId }, { send }) => send(CreateCustomerContract, { userId }));

const SignUpContract = fullyNamed("auth.sign-up", command())
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId);

const AuthModule = module()
	.on(Server)
	.guard(PublicGuard)
	.imports(BillingContract)
	.provide(() => ({}))
	.handles(handledItems("auth", [signUp]));

const DeviceTallyModule = module()
	.on(Device)
	.provide(() => ({ counter: new Counter() }))
	.handles(handledItems("tally", [count, bump]));

export function typedOnly(): void {
	const tally = buildersOf<typeof DeviceTallyModule>();
	// @ts-expect-error
	named("unkeyed", command()).handle(() => undefined);
	named("read", tally.query())
		.output(z.number())
		.handle((_input, { counter }) => counter.value);
	// @ts-expect-error
	named("timed", tally.query()).handle((_input, { clock }) => clock);
	// @ts-expect-error
	named("loose", query()).handle((_input, { counter }) => counter);
	named("pay", command())
		.idempotencyKey(Repeatable)
		.handle(async (_input, { send }) => {
			await send(RefundContract, { reason: "any request" });
			// @ts-expect-error
			await send(ChargeContract, { cents: "five" });
		});
	// @ts-expect-error
	module().handles(handledItems("tally", [count]));
	// @ts-expect-error
	runtime().imports(PaymentsContract);
	// @ts-expect-error
	DevicePaymentsContract({ over: orpcTransport("http://127.0.0.1:9") });
	runtime().imports(PaymentsContract({ over: orpcTransport("http://127.0.0.1:9") }));
	// @ts-expect-error
	buildersOf<{ readonly counter: Counter }>();
	// @ts-expect-error
	module().on(Device).config<{ readonly injects: number }>();
}

const counter = new Counter();
const started = runtime().modules(tallyOver(counter)).start(ON_BROWSER);

check("a self-handled query answers through runtime()", await started.send(CountContract), { ok: true, output: 0 });
check("a self-handled command runs its handler", await started.send(BumpContract, { by: 3 }), {
	ok: true,
	output: undefined,
});
check("its write is seen by the next read", await started.send(CountContract), { ok: true, output: 3 });
check(
	"a short name is the request's own: the module adds its prefix when it handles it",
	[count.request.name, count.request.module],
	["count", null],
);

check(
	"the module stamps every request and its invalidates list with <module>/<short>",
	tallyOver(counter).handlers.map(({ request }) => [
		request.name,
		request.invalidated?.map(({ name }) => name) ?? null,
	]),
	[
		["tally.count", null],
		["tally.bump", ["tally.count"]],
	],
);

const refused = await started.send(BumpContract, { by: 11 });
check("its own input guard refuses on the client", refused.ok ? "ran" : refused.code, "forbidden");

check(
	"a request handled twice by one module is refused by name",
	thrownBy(() => TallyDeclared.provide(() => ({ counter })).handles(handledItems("tally", [count, count]))),
	'module "tally" handles count twice: a request belongs to one module, once',
);

check(
	"a request says who may call it once: .public() and .callableBy() together are refused",
	[
		thrownBy(() => named("both", query()).public().callableBy(PaymentsContract)),
		thrownBy(() => named("twice", query()).public().public()),
		thrownBy(() => named("nobody", query()).callableBy()),
	],
	[
		"both already says who may call it: a request is .public() or .callableBy(...) once, never both",
		"twice already says who may call it: a request is .public() or .callableBy(...) once, never both",
		"nobody.callableBy() names no module: name the modules that may call it",
	],
);

check(
	"a module picking its parts from the platform is refused by a starter told no platform",
	thrownBy(() => runtime().modules(tallyOver(counter)).start()),
	'module "tally" picks its parts from the platform and scope, and its starter was told neither: pass platform and scope',
);

let seenFacts: ModuleFacts | null = null;
runtime()
	.modules(
		TallyDeclared.provide((facts) => {
			seenFacts = facts;
			return { counter };
		}).handles(handledItems("tally", [count, bump])),
	)
	.start({ platform: "tauri", scope: { workspaceId: "w-1" } });
check("provide receives the platform and scope its starter was told", seenFacts, {
	platform: "tauri",
	scope: { workspaceId: "w-1" },
	env: {},
	config: {},
});

check(
	"a module that runs anywhere still needs a guard where an adapter exposes it",
	thrownBy(() =>
		dataFrameworkMiddleware(
			runtime().modules(tallyOver(new Counter())).start({ platform: "server", env: {}, scope: SCOPE }),
		),
	).split("\n")[1],
	"tally.count is exposed with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it",
);

check(
	"a module guarded with PublicGuard starts on the server",
	thrownBy(() =>
		runtime()
			.modules(
				TallyDeclared.guard(PublicGuard)
					.provide(() => ({ counter: new Counter() }))
					.handles(handledItems("tally", [count, bump])),
			)
			.start({ platform: "server", env: {}, scope: SCOPE }),
	),
	"",
);

check(
	"a device module is refused when runtime() starts",
	thrownBy(() => runtime().modules(DeviceTallyModule).start({ platform: "server", env: {}, scope: SCOPE })).split(
		"\n",
	)[1],
	'module "tally" runs on the client; a server runs only modules that run on the server',
);

const closed = runtime()
	.modules(
		module()
			.on(Anywhere)
			.guard(guard().handle(() => deny("the tally is closed")))
			.provide(() => ({ counter: new Counter() }))
			.handles(handledItems("tally", [count, bump])),
	)
	.start(ON_BROWSER);
const closedRead = await closed.send(CountContract);
check(
	"a module guard that denies refuses its requests under runtime()",
	closedRead.ok ? "ran" : [closedRead.code, closedRead.reason],
	["forbidden", "the tally is closed"],
);

const signedInTally = runtime()
	.modules(
		TallyDeclared.guard(AuthenticatedGuard)
			.provide(() => ({ counter: new Counter() }))
			.handles(handledItems("tally", [count, bump])),
	)
	.start(ON_BROWSER);
const signedInRead = await signedInTally.send(CountContract);
check(
	"a module guard that needs a user starts in process, where a call carries no user and is refused",
	signedInRead.ok ? "ran" : signedInRead.code,
	"unauthenticated",
);
check(
	"an adapter with no Authenticate refuses to expose a module guard that needs a user",
	thrownBy(() => servePort(signedInTally, new MessageChannel().port1)).split("\n")[1],
	"tally.count is guarded by AuthenticatedGuard, which needs a user, and servePort() has no Authenticate: pass one",
);

const clocked = named("clocked", query())
	.public()
	.output(z.number())
	.handle(() => 1);

const ClockGuard = guard()
	.requires({ clock: Clock })
	.handle(() => undefined);

check(
	"a module guard requiring what neither its module nor the runtime provides is refused when runtime() starts",
	thrownBy(() =>
		runtime()
			.modules(
				module()
					.on(Anywhere)
					.guard(ClockGuard)
					.provide(() => ({}))
					.handles(handledItems("tally", [clocked])),
			)
			.start(ON_BROWSER),
	).split("\n")[1],
	"guard #1 of tally.clocked requires clock, which neither its module nor runtime().provide() gives as a Clock",
);

check(
	"a module guard requiring what runtime().provide() gives starts",
	thrownBy(() =>
		runtime()
			.modules(
				module()
					.on(Anywhere)
					.guard(ClockGuard)
					.provide(() => ({}))
					.handles(handledItems("tally", [clocked])),
			)
			.provide(() => ({ rateLimits: new MemoryRateLimits(), clock: new Clock() }))
			.start(ON_BROWSER),
	),
	"",
);

const shop = runtime().modules(ShopModule, PaymentsModule).start(ON_BROWSER);
check("a request sends another module's contract through the running app", await shop.send(BuyContract, { cents: 5 }), {
	ok: true,
	output: "charged 5",
});

check(
	"a module whose import the app neither runs nor reaches is refused when runtime() starts",
	thrownBy(() => runtime().modules(ShopModule).start(ON_BROWSER))
		.split("\n")
		.slice(1),
	['module "shop" imports payments, which runtime() neither runs nor reaches: add it to .modules() or .imports()'],
);

check(
	"the same module starts when the app imports its dependency at an address",
	thrownBy(() =>
		runtime()
			.modules(ShopModule)
			.imports(PaymentsContract({ over: orpcTransport("http://127.0.0.1:9") }))
			.start(ON_BROWSER),
	),
	"",
);

const unimportedBuy = await runtime()
	.modules(
		module()
			.on(Anywhere)
			.provide(() => ({}))
			.handles(handledItems("shop", [buy])),
		PaymentsModule,
	)
	.start(ON_BROWSER)
	.send(BuyContract, { cents: 5 });
check(
	"a request sending to a module its module does not import fails at the send, naming the fix",
	unimportedBuy.ok ? "ran" : unimportedBuy.reason,
	'shop.buy sends payments.charge, but module "shop" does not import payments: add .imports()',
);

const billingServer = dataFrameworkMiddleware(
	runtime().modules(AuthModule, BillingModule).start({ platform: "server", env: {}, scope: SCOPE }),
);
const AuthContract = moduleContract("auth", Server, { signUp: SignUpContract });
const overWire = runtime()
	.imports(
		AuthContract({ over: orpcTransport("http://api", { fetch: billingServer.fetch }) }),
		BillingContract({ over: orpcTransport("http://api", { fetch: billingServer.fetch }) }),
	)
	.start();

check(
	"a request with no mark runs in-process when another module of the same server sends it",
	await overWire.send(SignUpContract, { userId: "u-1" }),
	{ ok: true, output: "cus-u-1" },
);
check("a public request answers over the wire", await overWire.send(InvoicesContract), {
	ok: true,
	output: ["inv-1"],
});

const forgotten: string[] = [];
const forget = named("forget", command())
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ id }) => {
		forgotten.push(id);
	});
const NotesModule = module()
	.on(Server)
	.guard(PublicGuard)
	.provide(() => ({}))
	.handles(handledItems("notes", [forget]));
const ForgetContract = fullyNamed("notes.forget", command())
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable);
const notesServer = dataFrameworkMiddleware(
	runtime().modules(NotesModule).start({ platform: "server", env: {}, scope: SCOPE }),
);
const notesOverWire = runtime()
	.imports(
		moduleContract("notes", Server, { forget: ForgetContract })({
			over: orpcTransport("http://notes", { fetch: notesServer.fetch }),
		}),
	)
	.start();
const forgetAnswer = await notesOverWire.send(ForgetContract, { id: "n-1" });

check(
	"a command with no output answers ok over the wire, not as a broken answer",
	forgetAnswer.ok ? [true, forgotten] : [forgetAnswer.code, forgetAnswer.reason],
	[true, ["n-1"]],
);

const CREATE_CUSTOMER_NOT_EXPOSED = "billing.create-customer: the server exposes no such request";

const wireCalls: string[] = [];
const countingFetch = (request: Request): Response | Promise<Response> => {
	wireCalls.push(new URL(request.url).pathname);
	return billingServer.fetch(request);
};
const leaky = runtime()
	.imports({
		name: "billing",
		transport: orpcTransport("http://api", { fetch: countingFetch }),
		publicRequestNames: ["billing.invoices", "billing.create-customer"],
	})
	.start();
const askedOverWire = await leaky.send(CreateCustomerContract, { userId: "u-3" });
check(
	"a request with no mark reaching the server over the wire is refused there as not found",
	askedOverWire.ok ? "ran" : [askedOverWire.code, askedOverWire.reason],
	["not-found", CREATE_CUSTOMER_NOT_EXPOSED],
);

const LooseCreateCustomerContract = fullyNamed("billing.create-customer", command())
	.input(z.object({ userId: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);
const probedOverWire = await leaky.send(LooseCreateCustomerContract, { userId: 5 });
check(
	"an outside caller sending invalid input to a process-only request learns only that it is not found",
	probedOverWire.ok ? "ran" : [probedOverWire.code, probedOverWire.reason],
	["not-found", CREATE_CUSTOMER_NOT_EXPOSED],
);

const provision = named("provision", command())
	.callableBy(AuthContract)
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId)
	.handle(({ userId }) => `prov-${userId}`);
const ProvisionContract = fullyNamed("accounts.provision", command())
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId);
const accountsServer = dataFrameworkMiddleware(
	runtime()
		.modules(
			module()
				.on(Server)
				.guard(PublicGuard)
				.provide(() => ({}))
				.handles(handledItems("accounts", [provision])),
		)
		.start({ platform: "server", env: {}, scope: SCOPE }),
);
const provisioned = await runtime()
	.imports({
		name: "accounts",
		transport: orpcTransport("http://accounts", { fetch: accountsServer.fetch }),
		publicRequestNames: ["accounts.provision"],
	})
	.start()
	.send(ProvisionContract, { userId: "u-9" });
check(
	"a request callable by named modules is refused over a transport like a process-only one, naming no module",
	provisioned.ok ? "ran" : [provisioned.code, provisioned.reason],
	["not-found", "accounts.provision: the server exposes no such request"],
);

const AnywhereSignUp = module()
	.on(Anywhere)
	.guard(PublicGuard)
	.imports(BillingContract)
	.provide(() => ({}))
	.handles(handledItems("auth", [signUp]));
const anywhereServer = dataFrameworkMiddleware(
	runtime().modules(AnywhereSignUp, BillingModule).start({ platform: "server", env: {}, scope: SCOPE }),
);
const anywhereSignedUp = await runtime()
	.imports(AuthContract({ over: orpcTransport("http://api", { fetch: anywhereServer.fetch }) }))
	.start()
	.send(SignUpContract, { userId: "u-4" });
check("an Anywhere module on a server sends another module's request with no mark in-process", anywhereSignedUp, {
	ok: true,
	output: "cus-u-4",
});
check(
	"a Device module imported over a transport is refused where .over is called",
	thrownBy(() => {
		// @ts-expect-error
		moduleContract("auth", Device, { signUp: SignUpContract })({ over: orpcTransport("http://api") });
	}),
	'module "auth" runs on a device: only a module .on(Server) or .on(Anywhere) is imported over a transport',
);

const remoteBillingServer = dataFrameworkMiddleware(
	runtime()
		.modules(AuthModule)
		.imports(BillingContract({ over: orpcTransport("http://billing", { fetch: billingServer.fetch }) }))
		.start({ platform: "server", env: {}, scope: SCOPE }),
);
const remoteSignedUp = await runtime()
	.imports(AuthContract({ over: orpcTransport("http://api", { fetch: remoteBillingServer.fetch }) }))
	.start()
	.send(SignUpContract, { userId: "u-5" });
check(
	"a server sending a request with no mark to a module it imports from an address is refused there",
	remoteSignedUp.ok ? "ran" : remoteSignedUp.reason,
	`billing.create-customer answered not-found: ${CREATE_CUSTOMER_NOT_EXPOSED}`,
);

const report = named("report", query())
	.public()
	.output(z.number())
	.handle(async (_input, { send }) => {
		const invoices = await send(InvoicesContract);
		return invoices.length;
	});
const ReportContract = fullyNamed("reports.report", query()).output(z.number());
const ReportsModule = module()
	.on(Server)
	.guard(PublicGuard)
	.imports(BillingContract)
	.provide(() => ({}))
	.handles(handledItems("reports", [report]));
let headerAtBilling: string | null = null;
const reportsServer = dataFrameworkMiddleware(
	runtime()
		.modules(ReportsModule)
		.imports(
			BillingContract({
				over: orpcTransport("http://billing", {
					fetch: (request) => {
						headerAtBilling = request.headers.get("x-caller");
						return billingServer.fetch(request);
					},
					headers: () => ({ "x-caller": "reports" }),
				}),
			}),
		)
		.start({ platform: "server", env: {}, scope: SCOPE }),
);
const reports = runtime()
	.imports(
		moduleContract("reports", Server, { report: ReportContract })({
			over: orpcTransport("http://reports", { fetch: reportsServer.fetch }),
		}),
	)
	.start();
check(
	"a server reaches a module it imports through the fetch and headers its host gives",
	[await reports.send(ReportContract), headerAtBilling],
	[{ ok: true, output: 1 }, "reports"],
);

check(
	"a module both run and imported from an address is refused by name when runtime() starts",
	thrownBy(() =>
		runtime()
			.modules(PaymentsModule)
			.imports(PaymentsContract({ over: orpcTransport("http://127.0.0.1:9") }))
			.start(ON_BROWSER),
	).split("\n")[1],
	'module "payments" is both run in .modules() and imported from an address in .imports(): keep exactly one',
);

check(
	"a module imported twice is refused by name when runtime() starts",
	thrownBy(() =>
		runtime()
			.imports(
				BillingContract({ over: orpcTransport("http://one") }),
				BillingContract({ over: orpcTransport("http://two") }),
			)
			.start(),
	).split("\n")[1],
	'module "billing" is imported 2 times in .imports(): import it once',
);

check(
	"an oRPC transport refuses an address that is not a URL",
	[thrownBy(() => orpcTransport("")), thrownBy(() => orpcTransport("/api"))],
	[
		'the oRPC transport needs an absolute URL such as https://api.example.com, not ""',
		'the oRPC transport needs an absolute URL such as https://api.example.com, not "/api"',
	],
);

const secret = named("secret", query())
	.output(z.string())
	.settlesNow()
	.handle(() => "s3cret");
const SecretContract = fullyNamed("vault.secret", query()).output(z.string()).settlesNow();
const read = named("read", query())
	.public()
	.output(z.string())
	.handle(async (_input, { send }) => `read ${await send(SecretContract)}`);
const ReadContract = fullyNamed("vault.read", query()).output(z.string());
const VaultModule = module()
	.on(Anywhere)
	.guard(PublicGuard)
	.provide(() => ({}))
	.handles(handledItems("vault", [read, secret]));

const vaultOnDevice = runtime().modules(VaultModule).start(ON_BROWSER);
check(
	"a module on a device sends its own request with no mark from its own handler",
	await vaultOnDevice.send(ReadContract),
	{ ok: true, output: "read s3cret" },
);
check(
	"a request with no mark is answered to any caller in the same process, a view included",
	[await vaultOnDevice.send(SecretContract), vaultOnDevice.routes.readNow(SecretContract)],
	[{ ok: true, output: "s3cret" }, { output: "s3cret" }],
);

const peek = named("peek", query())
	.public()
	.output(z.string())
	.handle(async (_input, { send }) => send(SecretContract));
const PeekContract = fullyNamed("audit.peek", query()).output(z.string());
const AuditModule = module()
	.on(Server)
	.guard(PublicGuard)
	.imports(VaultModule)
	.provide(() => ({}))
	.handles(handledItems("audit", [peek]));
const vaultServer = dataFrameworkMiddleware(
	runtime().modules(VaultModule, AuditModule).start({ platform: "server", env: {}, scope: SCOPE }),
);
const auditOverWire = runtime()
	.imports(
		moduleContract("audit", Server, { peek: PeekContract })({
			over: orpcTransport("http://api", { fetch: vaultServer.fetch }),
		}),
	)
	.start();
check(
	"a server module sends another module's request with no mark in the same server",
	await auditOverWire.send(PeekContract),
	{ ok: true, output: "s3cret" },
);
const secretOverWire = await runtime()
	.imports({
		name: "vault",
		transport: orpcTransport("http://api", { fetch: vaultServer.fetch }),
		publicRequestNames: ["vault.read", "vault.secret"],
	})
	.start()
	.send(SecretContract);
check(
	"a request with no mark is refused over the wire",
	secretOverWire.ok ? "ran" : [secretOverWire.code, secretOverWire.reason],
	["not-found", "vault.secret: the server exposes no such request"],
);

const entry = named("entry", query())
	.callableBy({ name: "clerk" })
	.output(z.string())
	.handle(() => "entry");
const EntryContract = fullyNamed("ledger.entry", query()).output(z.string());
const LedgerModule = module()
	.on(Anywhere)
	.provide(() => ({}))
	.handles(handledItems("ledger", [entry]));
const readEntryQuery = () =>
	named("read", query())
		.public()
		.output(z.string())
		.handle(async (_input, { send }) => send(EntryContract));
const ledgerReaderModuleOf = (name: string) =>
	module()
		.on(Anywhere)
		.imports(LedgerModule)
		.provide(() => ({}))
		.handles(handledItems(name, [readEntryQuery()]));
const ledgerApp = runtime()
	.modules(LedgerModule, ledgerReaderModuleOf("clerk"), ledgerReaderModuleOf("stranger"))
	.start(ON_BROWSER);
const entryFromView = await ledgerApp.send(EntryContract);
check(
	"a view sending a request callable by named modules is refused, naming the modules",
	entryFromView.ok ? "ran" : [entryFromView.code, entryFromView.reason],
	["forbidden", "ledger.entry is callable only by module(s) clerk, not by a view"],
);
check("a view reading it now is refused the same way", ledgerApp.routes.readNow(EntryContract), null);
check("a module it names may send it", await ledgerApp.send(fullyNamed("clerk.read", query()).output(z.string())), {
	ok: true,
	output: "entry",
});
const entryFromStranger = await ledgerApp.send(fullyNamed("stranger.read", query()).output(z.string()));
check(
	"a module it does not name is refused",
	entryFromStranger.ok ? "ran" : [entryFromStranger.code, entryFromStranger.reason],
	["refused", "ledger.entry answered forbidden: ledger.entry is callable only by module(s) clerk, not by stranger"],
);

check(
	"a module providing a name the framework gives every handler is refused when runtime() starts",
	thrownBy(() =>
		runtime()
			.modules(
				module()
					.on(Anywhere)
					.provide(() => ({ send: new Counter(), counter: new Counter() }))
					.handles(handledItems("tally", [count])),
			)
			.start(ON_BROWSER),
	).split("\n")[1],
	'module "tally" provides send, a name the framework gives every handler: rename it',
);

const nullInjects = { injects: null };
check(
	"a module called with injects that are not an object is refused",
	thrownBy(() => TallyDeclared.provide(() => ({ counter }))(nullInjects)),
	"a module called with { injects } takes the object of its provided parts as injects",
);

check(
	"a contract key every module descriptor already holds is refused at run time, naming the key",
	thrownBy(() => moduleContract("ledger", Server, { name: fullyNamed("ledger.name", query()).output(z.string()) })),
	'module "ledger" names a contract key "name", which every module descriptor already holds: rename the feature folder or the constant',
);

check(
	"a contract key of a name every function holds is refused too",
	thrownBy(() =>
		moduleNamespace("ledger", {
			toString: { total: fullyNamed("ledger.to-string.total", query()).output(z.number()) },
		}),
	),
	'module "ledger" names a contract key "toString", which every module descriptor already holds: rename the feature folder or the constant',
);

check(
	"a contract item held under a key path other than its name is refused, naming both",
	thrownBy(() =>
		moduleNamespace("ledger", { entries: { total: fullyNamed("ledger.entries.count", query()).output(z.number()) } }),
	),
	'module "ledger" holds entries.count under the key entries.total: a contract key path is its name in camel case, so run npm run generate',
);

const tabs = named("pages.tabs", query())
	.public()
	.output(z.number())
	.handle(() => 1);
const tabById = named("pages.tabs.by-id", query())
	.public()
	.output(z.number())
	.handle(() => 2);
check(
	"a request whose name is the group of another request is refused when the wire is laid, naming both",
	thrownBy(() =>
		dataFrameworkMiddleware(
			runtime()
				.modules(
					module()
						.on(Server)
						.guard(PublicGuard)
						.provide(() => ({}))
						.handles(handledItems("shelves", [tabs, tabById])),
				)
				.start({ platform: "server", env: {}, scope: SCOPE }),
		),
	),
	"request shelves.pages.tabs.by-id cannot be placed on the wire: tabs is both a request and a group of requests there",
);
