# Hosts

A host is the framework code that runs apps inside another program: `packages/host-obsidian` (the Obsidian plugin), the browser host inside `@widgetarium/vite`. A project writes no host code.

## What a host hands a module

A client module's `provide` takes **parts**: the implementations of its adapters, built by the host for one mount. The domain writes one function per host that builds them:

| Host                                   | Builds parts with                           | From                        |
| -------------------------------------- | ------------------------------------------- | --------------------------- |
| Obsidian, a vault design               | `vaultCanvasParts(vaultDesign, canvasHost)` | `packages/canvas/vault.ts`  |
| a project (browser, Obsidian app note) | `projectCanvasParts(project, canvasHost)`   | `packages/canvas/module.ts` |

The host then starts it: `app({ modules: [canvasModule.with(parts)] })`. `CanvasHost` is what the mount itself gives (the opened page, who owns a paste, the GPU supply, `returnToView`); `MountedCanvasHost` builds it from a `CanvasMount`.

A server module's `provide` takes `{ env }` from `server({ modules, env })`. The server's host gives `authenticate`, `doneKeys`, `rateLimits` and `reportFailure`; an app's host gives `doneKeys`, `reportFailure`, and `fetch` and `headers` for the wire (the token travels in `headers`; a client never authenticates).

## One host's code stays out of another's bundle

There is no build-time platform switch. A host's implementations live in files only that host imports: the browser studio imports `module.ts`, the Obsidian host imports `vault.ts`, and only `apps/server` imports `@widgetarium/core/requests/server` (Hono, the oRPC server). `npm run test:web-canvas-bundle` builds the browser studio and fails if it carries a vault implementation, any `packages/host-obsidian` code, Hono, the oRPC server or `obsidian`; it also proves each check can fail by building `vault.ts` and the server entry.

## The Obsidian host

1. Installs as a plugin and keeps its settings, the AI connection among them.
2. Opens a note whose front matter names `widgetarium-app` in the studio; `Open app` and `Create new app` commands.
3. Builds the canvas parts for each mount: the studio view, the design view, the agent's shots.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault.

## Deploy

| An app has…                   | It needs                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| only `runs: "client"` modules | no server; the app runs every handler itself                                              |
| a `runs: "server"` module     | `apps/server`: `server({ modules, env })` serves `/rpc/*`; the app passes `server: <url>` |

`apps/server` is **planned**: Hono, with `dev`, `build` and `start`; Next.js runs the same Hono app through Hono's Vercel handler (to verify when built). Until it exists a request no local module handles answers `no-server`. There is never a server per device: desktop and mobile call the same `/rpc`.

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

Routing, SSR, deploy and loading `process.env` belong to the host. Widgetarium owns requests, handlers, modules and blocks. Inside Next.js the `/rpc/*` route is the Hono app's `fetch`; pages draw blocks, Next keeps its routing and env loading.
