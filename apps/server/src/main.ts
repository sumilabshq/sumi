import { serve } from "@hono/node-server";
import { runtime } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "@widgetarium/data-framework/server";
import { FixtureBillingModule } from "@widgetarium/fixture-billing/module";
import { DEV_WEB_ORIGIN, rpcApp } from "./rpc-app.js";

const DEFAULT_PORT = 8787;
const LISTENING = "widgetarium server listening on http://localhost:{port}";
const SCOPE = {
	workspaceId: "widgetarium-server",
};

const served = runtime().modules(FixtureBillingModule).start({
	platform: "server",
	env: process.env,
	scope: SCOPE,
});
const port = Number(process.env["PORT"] ?? DEFAULT_PORT);
const webOrigin = process.env["WEB_ORIGIN"] ?? DEV_WEB_ORIGIN;

serve({ fetch: rpcApp(dataFrameworkMiddleware(served), webOrigin).fetch, port }, ({ port: bound }) =>
	console.log(LISTENING.replace("{port}", String(bound))),
);
