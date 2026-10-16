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
import type { ServerParts, StartableServerModule } from "../module";
import { MemoryRateLimits } from "../rate-limits";
import type { RateLimits } from "../rate-limits";
import { reportToConsole } from "../report-failure";
import type { FailureReport } from "../report-failure";
import type { AnyRequest } from "../request";
import { routesOf } from "../startup";
import { WIRE_PREFIX, WireCallSchema, wirePathOf } from "../wire";
import type { Authenticate } from "./authenticate";

interface ServerHost {
	readonly authenticate?: Authenticate;
	readonly reportFailure?: FailureReport;
	readonly doneKeys?: DoneKeys;
	readonly rateLimits?: RateLimits;
}

interface ServerStart {
	readonly modules: readonly StartableServerModule[];
	readonly env: ServerParts["env"];
	readonly host?: ServerHost;
}

interface StartedServer {
	readonly fetch: (request: Request) => Promise<Response>;
}

interface WireContext {
	readonly headers: Headers;
}

const NOT_A_CALL = "the body is not a widgetarium call";
const NOT_HERE = "{name} runs on no module of this server";

export function server({ modules, env, host = {} }: ServerStart): StartedServer {
	const routes = routesOf({
		side: "server",
		modules: modules.map((module) => readyModuleOf(module, { env })),
		hasAuthenticate: host.authenticate !== undefined,
		hostProvided: { rateLimits: host.rateLimits ?? new MemoryRateLimits() },
	});
	const handler = new RPCHandler<WireContext>(routerOf(routes, serverMediatorOf(routes, host)));
	const hono = new Hono();
	hono.all(`${WIRE_PREFIX}/*`, async (context) => {
		const { headers } = context.req.raw;
		const handled = await handler.handle(context.req.raw, { prefix: WIRE_PREFIX, context: { headers } });
		return handled.matched ? handled.response : context.notFound();
	});
	return { fetch: (request) => Promise.resolve(hono.fetch(request)) };
}

function serverMediatorOf(routes: ReadonlyMap<string, Route>, host: ServerHost): Mediator {
	const local = new LocalRoutes({
		routes,
		authenticate: host.authenticate ?? null,
		doneKeys: host.doneKeys ?? new MemoryDoneKeys(),
		callers: "many",
	});
	const reportFailure = host.reportFailure ?? reportToConsole;
	return new Mediator({ local, remote: null, keyMinting: "caller-gives", missing: notHere, reportFailure });
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
	for (const { handler } of routes.values()) {
		const [module = "", name = ""] = wirePathOf(handler.request);
		router[module] = { ...router[module], [name]: wireProcedureOf(handler.request, mediator) };
	}
	return router;
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
