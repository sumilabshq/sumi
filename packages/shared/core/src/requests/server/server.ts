import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { refusalOf } from "../answer";
import type { Refusal } from "../answer";
import { MemoryDoneKeys } from "../done-keys";
import type { DoneKeys } from "../done-keys";
import { LocalRoutes } from "../local-routes";
import type { Route } from "../local-routes";
import { Mediator } from "../mediator";
import { readyModuleOf } from "../module";
import type { HandledModule, Provided, ReadyModule, ServerParts, StartableServerModule } from "../module";
import type { RemoteModule } from "../module-contract";
import type { ServerRuns } from "../placement";
import type { ModuleFacts, ModuleScope, PlatformModule } from "../platform-module";
import { MemoryRateLimits } from "../rate-limits";
import type { RateLimits } from "../rate-limits";
import { RemoteModules, notOverNetwork } from "../remote-modules";
import type { ModuleReach } from "../remote-modules";
import { reportToConsole } from "../report-failure";
import type { FailureReport } from "../report-failure";
import type { AnyRequest } from "../request";
import { routesOf } from "../startup";
import { WIRE_PREFIX, WireCallSchema, wirePathOf } from "../wire";
import type { WireHost } from "../wire-client";
import type { Authenticate } from "./authenticate";

interface ServerHost extends WireHost {
	readonly authenticate?: Authenticate;
	readonly reportFailure?: FailureReport;
	readonly doneKeys?: DoneKeys;
	readonly rateLimits?: RateLimits;
}

interface ServerStart {
	readonly modules: readonly StartableServerModule[];
	readonly env: ServerParts["env"];
	readonly scope?: ModuleScope;
	readonly host?: ServerHost;
}

interface ServerStartOptions {
	readonly env: ServerParts["env"];
	readonly scope?: ModuleScope;
	readonly host?: ServerHost;
}

export type ServerSideModule = PlatformModule<Provided, ServerRuns> | HandledModule<ServerParts> | ReadyModule;

interface StartedServer {
	readonly fetch: (request: Request) => Promise<Response>;
}

interface WireContext {
	readonly headers: Headers;
}

const NOT_A_CALL = "the body is not a widgetarium call";
const NOT_HERE = "{name} runs on no module of this server";

export class ServerBuilder {
	constructor(
		private readonly ranModules: readonly ServerSideModule[],
		private readonly remoteModules: readonly RemoteModule[],
	) {}

	modules(...modules: readonly ServerSideModule[]): ServerBuilder {
		return new ServerBuilder([...this.ranModules, ...modules], this.remoteModules);
	}

	imports(...modules: readonly RemoteModule[]): ServerBuilder {
		return new ServerBuilder(this.ranModules, [...this.remoteModules, ...modules]);
	}

	start({ env, scope, host = {} }: ServerStartOptions): StartedServer {
		// TODO: service tokens for server-to-server identity
		const remote = new RemoteModules(this.remoteModules, host, notHere);
		return startServer({ modules: this.ranModules, env, ...(scope === undefined ? {} : { scope }), host }, remote);
	}
}

export function server(): ServerBuilder;
export function server(start: ServerStart): StartedServer;
export function server(start?: ServerStart): ServerBuilder | StartedServer {
	if (start === undefined) {
		return new ServerBuilder([], []);
	}

	return startServer(start, null);
}

function startServer({ modules, env, scope, host = {} }: ServerStart, remote: ModuleReach | null): StartedServer {
	const facts: ModuleFacts | null = scope === undefined ? null : { platform: "server", scope, env };
	const routes = routesOf({
		side: "server",
		modules: modules.map((module) => readyModuleOf(module, { env }, facts)),
		hasAuthenticate: host.authenticate !== undefined,
		hostProvided: { rateLimits: host.rateLimits ?? new MemoryRateLimits() },
		remote,
	});
	const handler = new RPCHandler<WireContext>(routerOf(routes, serverMediatorOf(routes, host, remote)));
	const hono = new Hono();
	hono.all(`${WIRE_PREFIX}/*`, async (context) => {
		const { headers } = context.req.raw;
		const handled = await handler.handle(context.req.raw, { prefix: WIRE_PREFIX, context: { headers } });
		return handled.matched ? handled.response : context.notFound();
	});
	return { fetch: (request) => Promise.resolve(hono.fetch(request)) };
}

function serverMediatorOf(routes: ReadonlyMap<string, Route>, host: ServerHost, remote: ModuleReach | null): Mediator {
	const local = new LocalRoutes({
		routes,
		authenticate: host.authenticate ?? null,
		doneKeys: host.doneKeys ?? new MemoryDoneKeys(),
		callers: "many",
	});
	const reportFailure = host.reportFailure ?? reportToConsole;
	return new Mediator({ local, remote, keyMinting: "caller-gives", missing: notHere, reportFailure });
}

function notHere(request: AnyRequest): Refusal {
	return refusalOf("not-found", NOT_HERE.replace("{name}", request.name));
}

type WireProcedure = ReturnType<typeof wireProcedureOf>;

function routerOf(
	routes: ReadonlyMap<string, Route>,
	mediator: Mediator,
): Record<string, Record<string, WireProcedure>> {
	const router: Record<string, Record<string, WireProcedure>> = {};
	for (const { handler, isServerOnly } of routes.values()) {
		const [module = "", name = ""] = wirePathOf(handler.request);
		const procedure = isServerOnly
			? notOverNetworkProcedureOf(handler.request)
			: wireProcedureOf(handler.request, mediator);
		router[module] = { ...router[module], [name]: procedure };
	}
	return router;
}

function notOverNetworkProcedureOf(request: AnyRequest): WireProcedure {
	return os.$context<WireContext>().handler(() => notOverNetwork(request));
}

function wireProcedureOf(request: AnyRequest, mediator: Mediator) {
	return os.$context<WireContext>().handler(async ({ input, context, signal }) => {
		const call = WireCallSchema.safeParse(input);
		if (!call.success) return refusalOf("invalid-input", NOT_A_CALL);
		const { idempotencyKey } = call.data;
		const sending = { headers: context.headers, signal, ...(idempotencyKey === null ? {} : { idempotencyKey }) };
		return mediator.send(request, call.data.input, sending);
	});
}
