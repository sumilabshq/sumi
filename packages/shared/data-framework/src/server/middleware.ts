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

function routerOf(exposed: Exposed): WireRouter {
	const router: WireRouter = {};
	for (const request of exposed.requests) {
		placeProcedure(router, wirePathOf(request), wireProcedureOf(request, exposed));
	}
	return router;
}

function placeProcedure(
	router: WireRouter,
	[segment = "", ...rest]: readonly string[],
	procedure: WireProcedure,
): void {
	if (rest.length === 0) {
		router[segment] = procedure;
		return;
	}

	const held = router[segment];
	const branch: WireRouter = held === undefined || isProcedure(held) ? {} : held;
	router[segment] = branch;
	placeProcedure(branch, rest, procedure);
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
