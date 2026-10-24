import { serve } from "@hono/node-server";
import { server } from "@widgetarium/core/requests/server";
import { FixtureBillingServerModule } from "@widgetarium/fixture-billing/module";
import { DEV_WEB_ORIGIN, rpcApp } from "./rpc-app.js";

const DEFAULT_PORT = 8787;
const LISTENING = "widgetarium server listening on http://localhost:{port}";

const served = server().modules(FixtureBillingServerModule).start({ env: process.env });
const port = Number(process.env["PORT"] ?? DEFAULT_PORT);
const webOrigin = process.env["WEB_ORIGIN"] ?? DEV_WEB_ORIGIN;

serve({ fetch: rpcApp(served, webOrigin).fetch, port }, ({ port: bound }) =>
	console.log(LISTENING.replace("{port}", String(bound))),
);
