import { z } from "zod";
import {
	Anywhere,
	AuthenticatedGuard,
	Device,
	PublicGuard,
	Repeatable,
	Server,
	app,
	command,
	deny,
	guard,
	module,
	moduleContract,
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

const SCOPE = { workspaceId: "tally-workspace" };

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

const TallyModule = module("tally").on(Anywhere).public(CountQuery, BumpCommand);

const ChargeContract = command("payments/charge")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);

const RefundContract = command("payments/refund")
	.input(z.object({ reason: z.string() }))
	.idempotencyKey(Repeatable);

const PaymentsContract = moduleContract("payments", Server, [ChargeContract]);
const DevicePaymentsContract = moduleContract("payments", Device, [ChargeContract]);

const ChargeCommand = command("charge")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable)
	.handle(({ cents }) => `charged ${cents}`);

const BuyCommand = command("buy")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable)
	.handle(async ({ cents }, { send }) => send(ChargeContract, { cents }));

const BuyContract = command("shop/buy")
	.input(z.object({ cents: z.number() }))
	.output(z.string())
	.idempotencyKey(Repeatable);

const PaymentsModule = module("payments")
	.on(Anywhere)
	.public(ChargeCommand)
	.provide(() => ({}));
const ShopModule = module("shop")
	.on(Anywhere)
	.imports(PaymentsContract)
	.public(BuyCommand)
	.provide(() => ({}));

const InvoicesQuery = query("invoices")
	.output(z.array(z.string()))
	.handle(() => ["inv-1"]);

const CreateCustomerCommand = command("create-customer")
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId)
	.handle(({ userId }) => `cus-${userId}`);

const InvoicesContract = query("billing/invoices").output(z.array(z.string()));
const CreateCustomerContract = command("billing/create-customer")
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId);

const BillingModule = module("billing")
	.on(Server)
	.guard(PublicGuard)
	.public(InvoicesQuery)
	.serverOnly(CreateCustomerCommand)
	.provide(() => ({}));
const BillingContract = moduleContract("billing", Server, [InvoicesContract]);

const SignUpCommand = command("sign-up")
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId)
	.handle(async ({ userId }, { send }) => send(CreateCustomerContract, { userId }));

const SignUpContract = command("auth/sign-up")
	.input(z.object({ userId: z.string() }))
	.output(z.string())
	.idempotencyKey((input) => input.userId);

const AuthModule = module("auth")
	.on(Server)
	.guard(PublicGuard)
	.imports(BillingContract)
	.public(SignUpCommand)
	.provide(() => ({}));

const DeviceTallyModule = module("tally")
	.on(Device)
	.public(CountQuery, BumpCommand)
	.provide(() => ({ counter: new Counter() }));

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
		.handle(async (_input, { send }) => {
			await send(RefundContract, { reason: "any request" });
			// @ts-expect-error
			await send(ChargeContract, { cents: "five" });
		});
	// @ts-expect-error
	module("tally").public(CountQuery);
	// @ts-expect-error
	module("tally").on(Device).serverOnly(CountQuery);
	module("tally").on(Anywhere).serverOnly(CountQuery);
	// @ts-expect-error
	app().imports(PaymentsContract);
	// @ts-expect-error
	DevicePaymentsContract.at("http://127.0.0.1:9");
	// @ts-expect-error
	server().modules(DeviceTallyModule);
	// @ts-expect-error
	app().modules(BillingModule);
	app().imports(PaymentsContract.at("http://127.0.0.1:9"));
}

const counter = new Counter();
const started = app()
	.modules(TallyModule.provide(() => ({ counter })))
	.start(ON_BROWSER);

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
	"a request listed twice, in .public() and .serverOnly(), is refused by name",
	thrownBy(() => module("tally").on(Server).public(CountQuery).serverOnly(CountQuery)),
	'module "tally" lists count twice: a request stands in exactly one of .public() and .serverOnly()',
);

check(
	"a module picking its parts from the platform is refused by a starter told no platform",
	thrownBy(() =>
		app()
			.modules(TallyModule.provide(() => ({ counter })))
			.start(),
	),
	'module "tally" picks its parts from the platform and scope, and its starter was told neither: pass platform and scope',
);

let seenFacts: ModuleFacts | null = null;
app()
	.modules(
		TallyModule.provide((facts) => {
			seenFacts = facts;
			return { counter };
		}),
	)
	.start({ platform: "tauri", scope: { workspaceId: "w-1" } });
check("provide receives the platform and scope its starter was told", seenFacts, {
	platform: "tauri",
	scope: { workspaceId: "w-1" },
	env: {},
	host: {},
});

check(
	"a module that runs anywhere still needs a guard on the server",
	thrownBy(() =>
		server()
			.modules(TallyModule.provide(() => ({ counter: new Counter() })))
			.start({ env: {}, scope: SCOPE }),
	).split("\n")[1],
	"tally/count runs on the server with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it",
);

check(
	"a module guarded with PublicGuard starts on the server",
	thrownBy(() =>
		server()
			.modules(TallyModule.guard(PublicGuard).provide(() => ({ counter: new Counter() })))
			.start({ env: {}, scope: SCOPE }),
	),
	"",
);

check(
	"a device module is refused when server() starts",
	thrownBy(() =>
		server()
			// @ts-expect-error
			.modules(DeviceTallyModule)
			.start({ env: {}, scope: SCOPE }),
	).split("\n")[1],
	'module "tally" runs on the client; a server runs only modules that run on the server',
);

const closed = app()
	.modules(
		module("tally")
			.on(Anywhere)
			.public(CountQuery, BumpCommand)
			.guard(guard().handle(() => deny("the tally is closed")))
			.provide(() => ({ counter: new Counter() })),
	)
	.start(ON_BROWSER);
const closedRead = await closed.send(CountContract);
check(
	"a module guard that denies refuses its requests under app()",
	closedRead.ok ? "ran" : [closedRead.code, closedRead.reason],
	["forbidden", "the tally is closed"],
);

check(
	"a module guard that needs a user is refused when app() starts, since a client has no Authenticate",
	thrownBy(() =>
		app()
			.modules(TallyModule.guard(AuthenticatedGuard).provide(() => ({ counter: new Counter() })))
			.start(ON_BROWSER),
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
		app()
			.modules(
				module("tally")
					.on(Anywhere)
					.public(ClockedQuery)
					.provide(() => ({})),
			)
			.start(ON_BROWSER),
	).split("\n")[1],
	"guard #1 of tally/clocked injects clock, which its module does not provide as a Clock",
);

const shop = app().modules(ShopModule, PaymentsModule).start(ON_BROWSER);
check("a request sends another module's contract through the running app", await shop.send(BuyContract, { cents: 5 }), {
	ok: true,
	output: "charged 5",
});

check(
	"a module whose import the app neither runs nor reaches is refused when app() starts",
	thrownBy(() => app().modules(ShopModule).start(ON_BROWSER))
		.split("\n")
		.slice(1),
	['module "shop" imports payments, which app() neither runs nor reaches: add it to .modules() or .imports()'],
);

check(
	"the same module starts when the app imports its dependency at an address",
	thrownBy(() => app().modules(ShopModule).imports(PaymentsContract.at("http://127.0.0.1:9")).start(ON_BROWSER)),
	"",
);

const unimportedBuy = await app()
	.modules(
		module("shop")
			.on(Anywhere)
			.public(BuyCommand)
			.provide(() => ({})),
		PaymentsModule,
	)
	.start(ON_BROWSER)
	.send(BuyContract, { cents: 5 });
check(
	"a request sending to a module its module does not import fails at the send, naming the fix",
	unimportedBuy.ok ? "ran" : unimportedBuy.reason,
	'shop/buy sends payments/charge, but module "shop" does not import payments: add .imports()',
);

check(
	"inject naming a key the engine passes to every handler is refused where it is declared",
	[
		// @ts-expect-error
		thrownBy(() => command("reserved").idempotencyKey(Repeatable).inject({ send: Counter })),
		thrownBy(() => command("free").idempotencyKey(Repeatable).inject({ counter: Counter })),
	],
	["inject names send, which the engine passes to every handler: name it otherwise", ""],
);

const billingServer = server().modules(AuthModule, BillingModule).start({ env: {}, scope: SCOPE });
const AuthContract = moduleContract("auth", Server, [SignUpContract]);
const overWire = app()
	.imports(AuthContract.at("http://api"), BillingContract.at("http://api"))
	.start({ host: { fetch: billingServer.fetch } });

check(
	"a server-only request runs in-process when a server module sends it",
	await overWire.send(SignUpContract, { userId: "u-1" }),
	{ ok: true, output: "cus-u-1" },
);
check("a public request answers over the wire", await overWire.send(InvoicesContract), {
	ok: true,
	output: ["inv-1"],
});

const forgotten: string[] = [];
const ForgetCommand = command("forget")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ id }) => {
		forgotten.push(id);
	});
const NotesModule = module("notes")
	.on(Server)
	.guard(PublicGuard)
	.public(ForgetCommand)
	.provide(() => ({}));
const ForgetContract = command("notes/forget")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable);
const notesServer = server().modules(NotesModule).start({ env: {}, scope: SCOPE });
const notesOverWire = app()
	.imports(moduleContract("notes", Server, [ForgetContract]).at("http://notes"))
	.start({ host: { fetch: notesServer.fetch } });
const forgetAnswer = await notesOverWire.send(ForgetContract, { id: "n-1" });

check(
	"a command with no output answers ok over the wire, not as a broken answer",
	forgetAnswer.ok ? [true, forgotten] : [forgetAnswer.code, forgetAnswer.reason],
	[true, ["n-1"]],
);

const wireCalls: string[] = [];
const countingFetch = (request: Request): Promise<Response> => {
	wireCalls.push(new URL(request.url).pathname);
	return billingServer.fetch(request);
};
const leaky = app()
	.imports({
		name: "billing",
		url: "http://api",
		publicRequestNames: ["billing/invoices", "billing/create-customer"],
	})
	.start({ host: { fetch: countingFetch } });
const askedOverWire = await leaky.send(CreateCustomerContract, { userId: "u-3" });
check(
	"a server-only request reaching the server over the wire answers a refusal naming it, never unreachable",
	askedOverWire.ok ? "ran" : [askedOverWire.code, askedOverWire.reason],
	["not-found", "billing/create-customer is server-only: it is not callable over the network"],
);

wireCalls.length = 0;
const devicePayments = app()
	.imports(BillingContract.at("http://api"))
	.start({ host: { fetch: countingFetch } });
const sentOverWire = await devicePayments.send(CreateCustomerContract, { userId: "u-2" });
check(
	"a server-only request sent from a device is refused before it crosses the network",
	[sentOverWire.ok ? "ran" : sentOverWire.code, wireCalls],
	["not-found", []],
);

const AnywhereSignUp = module("auth")
	.on(Anywhere)
	.guard(PublicGuard)
	.imports(BillingContract)
	.public(SignUpCommand)
	.provide(() => ({}));
const anywhereServer = server().modules(AnywhereSignUp, BillingModule).start({ env: {}, scope: SCOPE });
const anywhereSignedUp = await app()
	.imports(AuthContract.at("http://api"))
	.start({ host: { fetch: anywhereServer.fetch } })
	.send(SignUpContract, { userId: "u-4" });
check(
	"a module not on the server sending a server-only request is refused at the send",
	anywhereSignedUp.ok ? "ran" : anywhereSignedUp.reason,
	'billing/create-customer answered forbidden: billing/create-customer is server-only, and module "auth" does not run on the server: only a server module may send it',
);

const remoteBillingServer = server()
	.modules(AuthModule)
	.imports(BillingContract.at("http://billing"))
	.start({ env: {}, scope: SCOPE });
const remoteSignedUp = await app()
	.imports(AuthContract.at("http://api"))
	.start({ host: { fetch: remoteBillingServer.fetch } })
	.send(SignUpContract, { userId: "u-5" });
check(
	"a server sending a server-only request to a module it imports from an address is refused at the send",
	remoteSignedUp.ok ? "ran" : remoteSignedUp.reason,
	"billing/create-customer answered not-found: billing/create-customer is server-only: it is not callable over the network",
);

const DeviceSignUp = module("auth")
	.on(Device)
	.imports(BillingContract)
	.public(SignUpCommand)
	.provide(() => ({}));
const deviceSignedUp = await app()
	.modules(DeviceSignUp)
	.imports(BillingContract.at("http://billing"))
	.start(ON_BROWSER)
	.send(SignUpContract, { userId: "u-6" });
check(
	"a device sending a server-only request to a module it imports from an address is refused at the send",
	deviceSignedUp.ok ? "ran" : deviceSignedUp.reason,
	"billing/create-customer answered not-found: billing/create-customer is server-only: it is not callable over the network",
);

const ReportQuery = query("report")
	.output(z.number())
	.handle(async (_input, { send }) => {
		const invoices = await send(InvoicesContract);
		return invoices.length;
	});
const ReportContract = query("reports/report").output(z.number());
const ReportsModule = module("reports")
	.on(Server)
	.guard(PublicGuard)
	.imports(BillingContract)
	.public(ReportQuery)
	.provide(() => ({}));
let headerAtBilling: string | null = null;
const reportsServer = server()
	.modules(ReportsModule)
	.imports(BillingContract.at("http://billing"))
	.start({
		env: {},
		scope: SCOPE,
		host: {
			fetch: (request) => {
				headerAtBilling = request.headers.get("x-caller");
				return billingServer.fetch(request);
			},
			headers: () => ({ "x-caller": "reports" }),
		},
	});
const reports = app()
	.imports(moduleContract("reports", Server, [ReportContract]).at("http://reports"))
	.start({ host: { fetch: reportsServer.fetch } });
check(
	"a server reaches a module it imports through the fetch and headers its host gives",
	[await reports.send(ReportContract), headerAtBilling],
	[{ ok: true, output: 1 }, "reports"],
);

check(
	"a module both run and imported from an address is refused by name when app() starts",
	thrownBy(() =>
		app().modules(PaymentsModule).imports(PaymentsContract.at("http://127.0.0.1:9")).start(ON_BROWSER),
	).split("\n")[1],
	'module "payments" is both run in .modules() and imported from an address in .imports(): keep exactly one',
);

check(
	"a module imported twice is refused by name when app() starts",
	thrownBy(() => app().imports(BillingContract.at("http://one"), BillingContract.at("http://two")).start()).split(
		"\n",
	)[1],
	'module "billing" is imported 2 times in .imports(): import it once',
);

check(
	"an address that is not a URL is refused by module name in .at()",
	[thrownBy(() => BillingContract.at("")), thrownBy(() => BillingContract.at("/api"))],
	[
		'module "billing" is imported at "", which is not an absolute URL: pass one such as https://api.example.com',
		'module "billing" is imported at "/api", which is not an absolute URL: pass one such as https://api.example.com',
	],
);

const SecretQuery = query("secret")
	.output(z.string())
	.settlesNow()
	.handle(() => "s3cret");
const SecretContract = query("vault/secret").output(z.string()).settlesNow();
const ReadQuery = query("read")
	.output(z.string())
	.handle(async (_input, { send }) => `read ${await send(SecretContract)}`);
const ReadContract = query("vault/read").output(z.string());
const VaultModule = module("vault")
	.on(Anywhere)
	.guard(PublicGuard)
	.public(ReadQuery)
	.serverOnly(SecretQuery)
	.provide(() => ({}));

const vaultOnDevice = app().modules(VaultModule).start(ON_BROWSER);
check(
	"an anywhere module on a device sends its own server-only request from its own handler",
	await vaultOnDevice.send(ReadContract),
	{ ok: true, output: "read s3cret" },
);
const viewAsked = await vaultOnDevice.send(SecretContract);
check(
	"a view asking an anywhere module's server-only request on a device is refused, naming why",
	[viewAsked.ok ? "ran" : [viewAsked.code, viewAsked.reason], vaultOnDevice.routes.readNow(SecretContract)],
	[
		[
			"forbidden",
			'vault/secret is server-only, and module "vault" runs on a device: only its own handlers may send it',
		],
		null,
	],
);

const PeekQuery = query("peek")
	.output(z.string())
	.handle(async (_input, { send }) => send(SecretContract));
const PeekContract = query("audit/peek").output(z.string());
const peekedOnDevice = await app()
	.modules(
		VaultModule,
		module("audit")
			.on(Anywhere)
			.imports(VaultModule)
			.public(PeekQuery)
			.provide(() => ({})),
	)
	.start(ON_BROWSER)
	.send(PeekContract);
check(
	"another module on a device sending an anywhere module's server-only request is refused at the send",
	peekedOnDevice.ok ? "ran" : peekedOnDevice.reason,
	'vault/secret answered forbidden: vault/secret is server-only, and module "vault" runs on a device: only its own handlers may send it',
);

const AuditModule = module("audit")
	.on(Server)
	.guard(PublicGuard)
	.imports(VaultModule)
	.public(PeekQuery)
	.provide(() => ({}));
const vaultServer = server().modules(VaultModule, AuditModule).start({ env: {}, scope: SCOPE });
const auditOverWire = app()
	.imports(moduleContract("audit", Server, [PeekContract]).at("http://api"))
	.start({ host: { fetch: vaultServer.fetch } });
check(
	"a server module sends an anywhere module's server-only request in the same server",
	await auditOverWire.send(PeekContract),
	{ ok: true, output: "s3cret" },
);
const secretOverWire = await app()
	.imports({ name: "vault", url: "http://api", publicRequestNames: ["vault/read", "vault/secret"] })
	.start({ host: { fetch: vaultServer.fetch } })
	.send(SecretContract);
check(
	"an anywhere module's server-only request is refused over the wire",
	secretOverWire.ok ? "ran" : [secretOverWire.code, secretOverWire.reason],
	["not-found", "vault/secret is server-only: it is not callable over the network"],
);
