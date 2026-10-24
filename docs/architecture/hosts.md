# Hosts

A host is the framework code that runs apps inside another program: `apps/host-obsidian` (the Obsidian plugin), the browser host inside `@widgetarium/vite`. A project writes no host code.

## What a host hands a module

A client module's `provide` takes **parts**: the implementations of its gateways, built by the host for one mount. The domain writes one function per host that builds them:

| Host                                   | Builds parts with                                 | From                           |
| -------------------------------------- | ------------------------------------------------- | ------------------------------ |
| Obsidian, a vault design               | `obsidianCanvasParts(obsidianDesign, canvasHost)` | `@widgetarium/canvas/gateways` |
| a project (browser, Obsidian app note) | `webCanvasParts(project, canvasHost)`             | `@widgetarium/canvas/gateways` |

The host then starts it: `app({ modules: [CanvasClientModule.with(parts)] })`, the module from `@widgetarium/canvas/module`. `CanvasHost` is what the mount itself gives (the opened page, who owns a paste, the GPU supply, `returnToView`), one class built from its fields; `detachedHostOf(opened)` gives the defaults a mount overrides.

A server module's `provide` takes `{ env }` from `server({ modules, env })`. The server's host gives `authenticate`, `doneKeys`, `rateLimits` and `reportFailure`; an app's host gives `doneKeys`, `reportFailure`, and `fetch` and `headers` for the wire (the token travels in `headers`; a client never authenticates).

## One host's code stays out of another's bundle

There is no build-time platform switch. Every platform's implementations sit behind one `./gateways` entry, and `sideEffects: false` lets a bundler keep only what is used: the browser studio imports `webCanvasParts` and carries no Obsidian implementation. Only `apps/server` imports `@widgetarium/core/requests/server` (Hono, the oRPC server). `npm run test:web-canvas-bundle` builds the browser studio and fails if it carries an Obsidian implementation, any `apps/host-obsidian` code, Hono, the oRPC server or `obsidian`; it proves each check can fail by building the whole `./gateways` entry and the server entry.

## The Obsidian host

1. Installs as a plugin and keeps its settings, the AI connection among them.
2. Opens a note whose front matter names `widgetarium-app` in the studio; `Open app` and `Create new app` commands.
3. Builds the canvas parts for each mount: the studio view, the design view, the agent's shots.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault.

## Deploy

| An app has…         | It needs                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------- |
| only client modules | no server; the app runs every handler itself                                              |
| a server module     | `apps/server`: `server({ modules, env })` serves `/rpc/*`; the app passes `server: <url>` |

`apps/server` is Hono: `server({ modules, env })` answers `/rpc/*`, mounted in `src/main.ts` with CORS for Obsidian's origin (`app://obsidian.md`, still to be checked with one `fetch` from the desktop app) and the dev web origin (`WEB_ORIGIN`, `http://localhost:5173` by default). `main.ts` is the one file that reads `process.env`. `npm run dev` runs it under `tsx watch` with the `source` and `server` conditions, `build` bundles it with esbuild under the same conditions, `start` runs the bundle. An app with no `server` answers `no-server` for a request no local module handles. There is never a server per device: desktop and mobile call the same `/rpc`. `npm run test:server` starts it on a free port and calls it over real HTTP.

**CORS is not security.** Obsidian's origin is allowed; the server is protected by guards and `Authenticate` ([requests.md](requests.md#guards)).

## Env

**planned.** Each module and integration declares the variables it needs and on which side; the app joins the parts it uses.

```ts skip-check
export const stripeEnv = env({
	server: {
		STRIPE_SECRET: z.string().describe("Secret key, Stripe dashboard → Developers → API keys"),
		STRIPE_WEBHOOK_SECRET: z.string(),
	},
});
```

- **The side belongs to the part that declares it.** An app cannot move a Stripe secret to the client. Only the `client` part reaches a browser bundle.
- **Checked at start:** a missing or malformed variable stops the app with the variable's name and its `describe` text.
- **Handlers never read `process.env`**: values reach them through a server module's `provide({ env })`.
- **Filled by the person, never seen by the agent.** The studio's integrations page draws a form from each part's schema and writes `.env`; the agent sees only "filled" or "missing".
- A key a person types into the Obsidian plugin's settings is their own key on their own machine, not a secret of the app.

## Other frameworks

Routing, SSR, deploy and loading `process.env` belong to the host. Widgetarium owns requests, handlers, modules and blocks. Pages draw blocks; Next keeps its routing and env loading.

## Next.js

The same Hono app answers a catch-all App Router route, `app/rpc/[[...route]]/route.ts`. Hono's guide (hono.dev, Getting Started, Next.js) exports each method from `handle(app)`, imported from `@hono/vercel`: `hono/vercel` is deprecated in Hono 4 and leaves in 5, and its `handle` is only `(app) => (req) => app.fetch(req)` (read in `hono@4.13.12`). No Next dependency or adapter of ours is needed.

```ts skip-check
import { handle } from "@hono/vercel";
import { server } from "@widgetarium/core/requests/server";
import { BillingServerModule } from "@acme/billing/module";
import { rpcApp } from "./rpc-app";

const app = rpcApp(server({ modules: [BillingServerModule], env: process.env }), process.env.WEB_ORIGIN);

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
```

**Not verified:** how Next passes the `server` export condition to its server bundle only.
