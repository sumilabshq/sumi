import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { refusalOf } from "../answer";
import type { Answer, Refusal } from "../answer";
import { MemoryDoneKeys } from "../done-keys";
import type { DoneKeys } from "../done-keys";
import { hostProvidedOf } from "../app";
import type { NeedsBox, Unboxed } from "../host-needs";
import type { HostObjects } from "../app";
import { EventBus } from "../event-bus";
import { LocalRoutes } from "../local-routes";
import type { Route } from "../local-routes";
import { Mediator } from "../mediator";
import { readyModuleOf } from "../module";
import type {
	HandledModule,
	NothingProvided,
	Provided,
	ReadyModule,
	ServerParts,
	StartableServerModule,
} from "../module";
import type { RemoteModule } from "../module-contract";
import { listenedEventNames, startModuleEvents } from "../module-events";
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
import type { StartedRoutes } from "../startup";
import { ChangeBroadcast } from "../transport";
import type { ListeningTransport, ServedCall, ServingServer } from "../transport";
import { WIRE_CHANGES_PATH, WIRE_PREFIX, WireCallSchema, wirePathOf } from "../wire";
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
	readonly host?: ServerHost & HostObjects;
}

interface ServerStartOptions {
	readonly env: ServerParts["env"];
	readonly scope?: ModuleScope;
	readonly host?: ServerHost & HostObjects;
}

type ServerLentBy<N extends Provided> = keyof N extends never
	? ServerStartOptions
	: ServerStartOptions & { readonly host: ServerHost & N };

type ServerHostNeedsOf<M> =
	M extends PlatformModule<Provided, ServerRuns, infer N> ? NeedsBox<N> : NeedsBox<NothingProvided>;

type IntersectionOf<U> = (U extends unknown ? (union: U) => void : never) extends (all: infer I) => void ? I : never;

export type ServerSideModule =
	PlatformModule<Provided, ServerRuns, NothingProvided> | HandledModule<ServerParts> | ReadyModule;

export interface StartedServer extends ServingServer {
	readonly fetch: (request: Request) => Promise<Response>;
	stop(): void;
}

interface WireContext {
	readonly headers: Headers;
}

const NOT_A_CALL = "the body is not a widgetarium call";
const NOT_HERE = "{name} runs on no module of this server";

interface ServerPlan {
	readonly ranModules: readonly ServerSideModule[];
	readonly remoteModules: readonly RemoteModule[];
	readonly listeners: readonly ListeningTransport[];
}

export class ServerBuilder<N extends Provided = NothingProvided> {
	constructor(private readonly plan: ServerPlan) {}

	modules<const M extends readonly ServerSideModule[]>(
		...modules: M
	): ServerBuilder<N & Unboxed<IntersectionOf<ServerHostNeedsOf<M[number]>>>> {
		return new ServerBuilder({ ...this.plan, ranModules: [...this.plan.ranModules, ...modules] });
	}

	imports(...modules: readonly RemoteModule[]): ServerBuilder<N> {
		return new ServerBuilder({ ...this.plan, remoteModules: [...this.plan.remoteModules, ...modules] });
	}

	listen(transport: ListeningTransport): ServerBuilder<N> {
		return new ServerBuilder({ ...this.plan, listeners: [...this.plan.listeners, transport] });
	}

	start({ env, scope, host = {} }: ServerLentBy<N>): StartedServer {
		// TODO: service tokens for server-to-server identity
		const remote = new RemoteModules(this.plan.remoteModules, notHere);
		const started = startServer(
			{ modules: this.plan.ranModules, env, ...(scope === undefined ? {} : { scope }), host },
			remote,
		);
		const stops = this.plan.listeners.map((listener) => listener.serve(started));
		return {
			...started,
			stop: () => {
				stops.forEach((stop) => stop());
				started.stop();
			},
		};
	}
}

export function server(): ServerBuilder;
export function server(start: ServerStart): StartedServer;
export function server(start?: ServerStart): ServerBuilder | StartedServer {
	if (start === undefined) {
		return new ServerBuilder({ ranModules: [], remoteModules: [], listeners: [] });
	}

	return startServer(start, null);
}

function startServer({ modules, env, scope, host = {} }: ServerStart, remote: ModuleReach | null): StartedServer {
	const facts: ModuleFacts | null =
		scope === undefined ? null : { platform: "server", scope, env, host: hostProvidedOf(host) };
	const started = routesOf({
		side: "server",
		modules: modules.map((module) => readyModuleOf(module, { env }, facts)),
		hasAuthenticate: host.authenticate !== undefined,
		hostProvided: { rateLimits: host.rateLimits ?? new MemoryRateLimits() },
		remote,
	});
	const reportFailure = host.reportFailure ?? reportToConsole;
	const bus = new EventBus(reportFailure);
	const mediator = serverMediatorOf({ started, host, remote, bus });
	const changed = new ChangeBroadcast();
	const startedModules = started.modules.map(({ module, provided }) => ({ definition: module.definition, provided }));
	const stopEvents = startModuleEvents({
		modules: startedModules,
		listened: listenedEventNames(startedModules),
		platform: "server",
		bus,
		sender: mediator,
		reportFailure,
		applyInvalidations: (invalidated) => changed.tell(invalidated),
	});
	const answer = answering(started.routes, mediator, changed);
	const hono = honoOf({ routes: started.routes, mediator, changed });
	return {
		fetch: (request) => Promise.resolve(hono.fetch(request)),
		answer,
		changes: (hear) => changed.hear(hear),
		stop: stopEvents,
	};
}

interface Serving {
	readonly routes: ReadonlyMap<string, Route>;
	readonly mediator: Mediator;
	readonly changed: ChangeBroadcast;
}

function honoOf({ routes, mediator, changed }: Serving): Hono {
	const handler = new RPCHandler<WireContext>(routerOf(routes, mediator, changed));
	const hono = new Hono();
	hono.get(WIRE_CHANGES_PATH, (context) =>
		streamSSE(context, async (stream) => {
			const stopHearing = changed.hear((invalidated) => void stream.writeSSE({ data: JSON.stringify(invalidated) }));
			await new Promise<void>((closed) => stream.onAbort(closed));
			stopHearing();
		}),
	);
	hono.all(`${WIRE_PREFIX}/*`, async (context) => {
		const { headers } = context.req.raw;
		const handled = await handler.handle(context.req.raw, { prefix: WIRE_PREFIX, context: { headers } });
		return handled.matched ? handled.response : context.notFound();
	});
	return hono;
}

function answering(
	routes: ReadonlyMap<string, Route>,
	mediator: Mediator,
	changed: ChangeBroadcast,
): (call: ServedCall) => Promise<Answer<unknown>> {
	return async ({ name, input, idempotencyKey, signal, headers }) => {
		const route = routes.get(name);

		if (route === undefined) {
			return refusalOf("not-found", NOT_HERE.replace("{name}", name));
		}

		if (route.isServerOnly) {
			return notOverNetwork(route.handler.request);
		}

		const sending = { signal, headers, ...(idempotencyKey === null ? {} : { idempotencyKey }) };
		const answered = await mediator.send(route.handler.request, input, sending);
		changed.tell(answered.ok ? answered.invalidated : undefined);
		return answered;
	};
}

interface ServerWiring {
	readonly started: StartedRoutes;
	readonly host: ServerHost;
	readonly remote: ModuleReach | null;
	readonly bus: EventBus;
}

function serverMediatorOf({ started, host, remote, bus }: ServerWiring): Mediator {
	const local = new LocalRoutes({
		routes: started.routes,
		authenticate: host.authenticate ?? null,
		doneKeys: host.doneKeys ?? new MemoryDoneKeys(),
		callers: "many",
		bus,
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
	changed: ChangeBroadcast,
): Record<string, Record<string, WireProcedure>> {
	const router: Record<string, Record<string, WireProcedure>> = {};
	for (const { handler, isServerOnly } of routes.values()) {
		const [module = "", name = ""] = wirePathOf(handler.request);
		const procedure = isServerOnly
			? notOverNetworkProcedureOf(handler.request)
			: wireProcedureOf(handler.request, mediator, changed);
		router[module] = { ...router[module], [name]: procedure };
	}
	return router;
}

function notOverNetworkProcedureOf(request: AnyRequest): WireProcedure {
	return os.$context<WireContext>().handler(() => notOverNetwork(request));
}

function wireProcedureOf(request: AnyRequest, mediator: Mediator, changed: ChangeBroadcast) {
	return os.$context<WireContext>().handler(async ({ input, context, signal }) => {
		const call = WireCallSchema.safeParse(input);
		if (!call.success) return refusalOf("invalid-input", NOT_A_CALL);
		const { idempotencyKey } = call.data;
		const sending = {
			headers: context.headers,
			signal,
			isOverNetwork: true,
			...(idempotencyKey === null ? {} : { idempotencyKey }),
		};
		const answered = await mediator.send(request, call.data.input, sending);
		changed.tell(answered.ok ? answered.invalidated : undefined);
		return answered;
	});
}
