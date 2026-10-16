# Hosts

A platform is where an app runs: `obsidian`, `web`, `mobile`, `desktop`, `server`. A host is the framework package that runs apps there (`packages/host-obsidian`, the web host inside `@widgetarium/vite`); a project writes no host code.

## The host a module receives

`app({ modules, platforms, host })` takes the host of its platform, and each `provided()` factory receives the host of **its** platform, typed:

| Platform                       | Host                        | Carries                                       |
| ------------------------------ | --------------------------- | --------------------------------------------- |
| `obsidian`                     | `ObsidianHost`              | `app` (Obsidian's `App`, the vault inside it) |
| `web`                          | `WebHost`                   | `project`, the started project                |
| `server`                       | `ServerHost`                | `env`, the server's variables                 |
| `mobile`, `desktop` _(future)_ | `MobileHost`, `DesktopHost` | the platform's own objects                    |

The engine declares the hosts; a domain that needs more from whoever mounts it adds a field by module augmentation of `@widgetarium/core/mediator/platform.js`, typed per platform. The canvas adds `canvas`: what a mount gives it (the opened page, who owns a paste, the GPU supply, whether it reads a vault design or a project). A host built without that field is a type error, never a null to check.

## One build per platform

Each build defines `__WG_PLATFORM__` (`"obsidian"` in the plugin's esbuild, `"web"` in the Vite plugin); the test loader sets it to `"obsidian"`, or to `WG_PLATFORM`. `app()` refuses a host of another platform than the build.

A build from source keeps only its own platform's code, the way React Native resolves `file.ios.ts` or `file.android.ts`: an import of `adapters/<what>/<platform>.adapter.ts` (or `<platform>/<platform>.adapter.ts`) for another platform, or of any file under a domain's `server/` in a build that is not `server`, resolves to a stand-in exporting the same names, each throwing `… belongs to the obsidian build, and this build is for web` on construction, call or read. A stood-in handler keeps its `request`, so the module still routes it to the server. The record keeps its entry, so the types stay whole; the code behind it never ships. **Packed packages do not hold this yet**: `npm run pack:engine` bundles every platform's adapters into `dist` (TODO in `tools/pack-engine.mts`). The esbuild side is `packages/host-obsidian/platform-adapters-plugin.mts`, the Vite side the `load` hook of `@widgetarium/vite`; both use `platform-adapters.ts` in that package.

## The Obsidian host

1. Installs as a plugin and keeps its settings, the AI connection among them.
2. Opens a note whose front matter names `widgetarium-app` in the studio; `Open app` and `Create new app` commands.
3. Builds the `ObsidianHost` for each mount: the studio view, the design view, the agent's shots.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault.

## Deploy

| An app has…              | It needs                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| no `.onServer()` request | no server; every host runs the handlers itself                                            |
| one or more              | `apps/server`: `server({ modules })` runs the `server` factories and serves `/rpc/<name>` |

`apps/server` is created with the first server request; until then an app's `.onServer()` requests are refused by `NoServerTransport` ([requests.md](requests.md#the-server)). There is never a server per device: desktop and mobile call the same `/rpc`.

## Env

**planned.** Each module and integration declares the variables it needs and on which side; the app joins the parts it uses.

```ts skip-check
export const stripeEnv = env({
	server: {
		STRIPE_SECRET: z.string().describe("Secret key, Stripe dashboard → Developers → API keys"),
		STRIPE_WEBHOOK_SECRET: z.string(),
	},
});

export const appEnv = env(stripeEnv, supabaseEnv, { client: { PUBLIC_API_URL: z.string().url() } });
```

- **The side belongs to the part that declares it.** An app joins `stripeEnv`; it cannot move a Stripe secret to the client. Only the `client` part reaches a browser bundle.
- **Checked at start:** a missing or malformed variable stops the app with the variable's name and its `describe` text.
- **Handlers never read `process.env`**: values reach them through `ServerHost.env` in the module's `server` factories.
- **Filled by the person, never seen by the agent.** The studio's integrations page draws a form from each part's schema and writes `.env`; the agent sees only "filled" or "missing".
- A key a person types into the Obsidian plugin's settings is their own key on their own machine, not a secret of the app.

## Other frameworks

Routing, SSR, deploy and loading `process.env` belong to the host. Widgetarium owns requests, handlers, modules and blocks. Inside Next.js it is an adapter, the way tRPC is: a route handler serves `/rpc`, pages draw blocks, Next keeps its routing and env loading. A `host-next` package is written when a project needs it.
