# Hosts

A host is the framework code that runs apps inside another program: `apps/host-tauri` (the desktop app, the product), `apps/host-obsidian` (the Obsidian plugin), the browser host inside `@widgetarium/vite`. A project writes no host code.

## What a host hands an app

**Facts, never gateways.** A host says where the app runs; each module decides what that means for its storage.

| Fact                | Values                                 | Read by                                 |
| ------------------- | -------------------------------------- | --------------------------------------- |
| `platform`          | `"tauri"` \| `"browser"` \| `"server"` | every module's picker (`layoutPartsOn`) |
| `scope.workspaceId` | the workspace, the app id on the web   | gateways keeping data per workspace     |
| `env`               | the variables                          | a module that reaches an outside system |

```ts skip-check
export function startLayoutApp({ platform, workspaceId }: LayoutAppAsk): StartedApp {
	return app().modules(LayoutModule).start({ platform, scope: { workspaceId } });
}
```

A host never builds a module's gateway, never passes a store, a file handle or a "parts" object. What a module needs from the platform it reaches itself, through its gateways (the Tauri store client is `@widgetarium/behaviors/tauri-store`).

`app()`'s host gives `doneKeys`, `reportFailure`, and `fetch` and `headers` for the wire (the token travels in `headers`; a client never authenticates). `server()`'s host gives `authenticate`, `doneKeys`, `rateLimits` and `reportFailure`.

## One platform's code out of another's bundle

- A data module's `"."` is the generated contract: a client package importing it carries no handler and no gateway.
- Only `apps/server` resolves the `server` export condition and imports `@widgetarium/core/requests/server` (Hono, the oRPC server).
- Today a module's picker imports every platform's gateways, so a browser bundle carries the Tauri gateway code, guarded at run time (`TRADE-OFF:` in `state/layout/gateways/layout-parts/tauri.gateway.ts`). **planned**: a build-time platform condition, proven from the bundle's metafile.

## The Tauri host

`apps/host-tauri` opens the studio windows, keeps the workspaces, and starts each window's app with `platform: "tauri"` and the window's workspace. Settings and sessions are files the module gateways read and write through `@widgetarium/behaviors/tauri-store`.

TODO: `settings.json` and `session.json` each have two holders, the host's own documents and the layout's gateways, both writing rev-checked patches. One owner per file is the target.

## The Obsidian host

1. Installs as a plugin and keeps its settings.
2. Opens a note whose front matter names `widgetarium-app` in the studio view.
3. Starts each mount's app with `platform: "browser"`.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault.

## Deploy

| An app's modules…          | It needs                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| all run where the app runs | no server; the app runs every handler itself                                                                |
| some run on a server       | `apps/server`: `server().modules(...).start({ env })` serves `/rpc/*`; the app imports them with `.at(url)` |

`apps/server` is Hono, mounted in `src/main.ts` with CORS for Obsidian's origin and the dev web origin (`WEB_ORIGIN`). `main.ts` is the one file that reads `process.env`. `npm run test:server` starts it on a free port and calls it over real HTTP. There is never a server per device: desktop and mobile call the same `/rpc`.

**CORS is not security.** The server is protected by guards and `Authenticate` ([requests.md](requests.md#guards-and-middleware)).

**planned:** the app's config names, per module, `local` or `server`, and a module says which it can do; today the host chooses by calling `app()` or `server()`.

## Env

**planned.** Each module and integration declares the variables it needs and on which side; the app joins the parts it uses.

```ts skip-check
export const stripeEnv = env({
	server: {
		STRIPE_SECRET: z.string().describe("Secret key, Stripe dashboard → Developers → API keys"),
	},
});
```

- **The side belongs to the part that declares it.** Only the `client` part reaches a browser bundle.
- **Checked at start:** a missing or malformed variable stops the app with its name and its `describe` text.
- **Handlers never read `process.env`**: values reach the module through `provide`'s `env` fact.
- **Filled by the person, never seen by the agent.**

## Next.js

The same Hono app answers a catch-all App Router route, `app/rpc/[[...route]]/route.ts`, through `handle(app)` from `@hono/vercel`. No Next dependency or adapter of ours is needed. **Not verified:** how Next passes the `server` export condition to its server bundle only.
