import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { refusalOf } from "../answer";
import type { AdapterOptions, Exposed } from "../exposure";
import { NEVER_ABORTED } from "../handler";
import type { AnyRequest } from "../request";
import type { Runtime } from "../runtime";
import { WIRE_CHANGES_PATH, WIRE_PREFIX, WireCallSchema, wirePathOf } from "../wire";

interface WireContext {
	readonly headers: Headers;
}

const ADAPTER = "dataFrameworkMiddleware()";
const NOT_A_CALL = "the body is not a widgetarium call";
const EMPTY_PATH = "request {request} has no wire path: a request is named by at least one segment";
const LEAF_AND_GROUP =
	"request {request} cannot be placed on the wire: {segment} is both a request and a group of requests there";

export function dataFrameworkMiddleware(runtime: Runtime, { authenticate }: AdapterOptions = {}): Hono {
	const exposed = runtime.expose({ adapter: ADAPTER, authenticate });
	const handler = new RPCHandler<WireContext>(routerOf(exposed));
	const hono = new Hono();
	// TODO: authenticate the changes stream and filter invalidations per user
	hono.get(WIRE_CHANGES_PATH, (context) =>
		streamSSE(context, async (stream) => {
			const stopHearing = exposed.changes((invalidated) => void stream.writeSSE({ data: JSON.stringify(invalidated) }));
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

type WireProcedure = ReturnType<typeof wireProcedureOf>;

interface WireRouter {
	[segment: string]: WireRouter | WireProcedure;
}

interface PlacedProcedure {
	readonly request: string;
	readonly path: readonly string[];
	readonly procedure: WireProcedure;
}

function routerOf(exposed: Exposed): WireRouter {
	const router: WireRouter = {};
	for (const request of exposed.requests) {
		placeProcedure(router, {
			request: request.name,
			path: wirePathOf(request),
			procedure: wireProcedureOf(request, exposed),
		});
	}
	return router;
}

function placeProcedure(router: WireRouter, placed: PlacedProcedure): void {
	const [segment, ...rest] = placed.path;

	if (segment === undefined) {
		throw new Error(EMPTY_PATH.replace("{request}", placed.request));
	}

	const held = router[segment];
	const isLeaf = rest.length === 0;

	if (held !== undefined && isProcedure(held) !== isLeaf) {
		throw new Error(LEAF_AND_GROUP.replace("{request}", placed.request).replace("{segment}", segment));
	}

	if (isLeaf) {
		router[segment] = placed.procedure;
		return;
	}

	const branch: WireRouter = held === undefined || isProcedure(held) ? {} : held;
	router[segment] = branch;
	placeProcedure(branch, {
		...placed,
		path: rest,
	});
}

function isProcedure(held: WireRouter | WireProcedure): held is WireProcedure {
	return "~orpc" in held;
}

function wireProcedureOf(request: AnyRequest, exposed: Exposed) {
	return os.$context<WireContext>().handler(async ({ input, context, signal }) => {
		const call = WireCallSchema.safeParse(input);
		if (!call.success) return refusalOf("invalid-input", NOT_A_CALL);
		const { input: sent, idempotencyKey } = call.data;
		const { headers } = context;
		return exposed.answer({
			name: request.name,
			input: sent,
			idempotencyKey,
			signal: signal ?? NEVER_ABORTED,
			headers,
		});
	});
}
