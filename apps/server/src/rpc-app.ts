import { Hono } from "hono";
import { cors } from "hono/cors";
import { WIRE_PREFIX } from "@widgetarium/data-framework/server";

interface Served {
	readonly fetch: (request: Request) => Promise<Response>;
}

// TODO: verify the origin with one fetch from the Obsidian desktop app
export const OBSIDIAN_ORIGIN = "app://obsidian.md";
export const DEV_WEB_ORIGIN = "http://localhost:5173";

const RPC_ROUTES = `${WIRE_PREFIX}/*`;

export function rpcApp(served: Served, webOrigin: string): Hono {
	const hono = new Hono();
	hono.use(RPC_ROUTES, cors({ origin: [OBSIDIAN_ORIGIN, webOrigin] }));
	hono.all(RPC_ROUTES, (context) => served.fetch(context.req.raw));
	return hono;
}
