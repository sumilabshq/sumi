# Hosts

A host is the framework code that runs apps inside another program: `apps/tauri` (the desktop app, the product), the browser host inside `@widgetarium/vite`. A project writes no host code.

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

A host never builds a module's gateway and never passes a "parts" object. What a module needs from the platform it reaches through its gateways. A module that writes the Tauri store is configured with a `StoreClient` (`@widgetarium/behaviors/tauri-store`), never Tauri's `invoke`. A module that keeps one file is configured with that file instead: `TasksModule({ file })` takes a `BoardFile` whose reads and writes are FileSystem requests.

**Live objects, through a module's config.** A live object only the host has (a file it opened, a running agent) is passed raw where the host lists the module: `CanvasModule({ kind: "project", project })`, and `provide` builds the module's gateways on it ([requests.md](requests.md#a-modules-config)). The config's types are re-exported from the module's `"./module"` entry. A plugin module the core starts is a function of what the core offers, `({ store, file }) => PlacesModule({ store })` in the `SharedModulesSlot`, so the plugin decides its module's config and the core only offers.

`app()`'s host gives `doneKeys`, `reportFailure`, and `fetch` and `headers` for the wire (the token travels in `headers`; a client never authenticates). `server()`'s host gives `authenticate`, `doneKeys`, `rateLimits` and `reportFailure`.

## One platform's code out of another's bundle

- A data module's `"."` is the generated contract: a client package importing it carries no handler and no gateway.
- Only `apps/server` resolves the `server` export condition and imports `@widgetarium/data-framework/server` (Hono, the oRPC server).
- Today a module's picker imports every platform's gateways, so a browser bundle carries the Tauri gateway code, guarded at run time (`TRADE-OFF:` in `state/layout/gateways/layout-parts/tauri.gateway.ts`). **planned**: a build-time platform condition, proven from the bundle's metafile.

## The Tauri host

`apps/tauri` opens the studio windows, keeps the workspaces, and starts each window's app with `platform: "tauri"` and the window's workspace. Settings and sessions are files the module gateways read and write through `@widgetarium/behaviors/tauri-store`.

**Only the host touches the machine.** The core runs the host's capabilities itself, `HOST_CAPABILITY_MODULES` in `src/plugins/host-capabilities.ts` (files and terminal sessions, through Tauri; their modules live in the host, `apps/tauri/capabilities/*`, and apps reach them only through `@sumi/contract`), then the modules plugins put in the host's shared modules slot. Plugins reach a capability only through `@sumi/contract`, never through `@tauri-apps/*` or a host gateway.

`apps/tauri/tauri-reach.mts` holds the rule: only `apps/tauri` resolves `@tauri-apps/*`. Any other import of it fails the host's Vite build and the test loader, and `npm run test:tauri-boundary` fails any package outside `apps/tauri` that declares a Tauri package, imports one or reads `__TAURI`. A module that needs something only Tauri has (a store, the window list, the browser's IPC, the core-changed signal) takes it in an optional config field, `LayoutModule({ tauri: { store, windows } })`, and `apps/tauri/src/startup/tauri-studio-lent.ts` builds it. Code running in the studio window can still reach Tauri's global at run time; only a plugin running in its own frame, as apps do, closes that.

| Plugin      | Is                                                                                                                                                 | Lives in            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `sumi-host` | the host's own declaration of the slots it offers (today `SharedModulesSlot`); it runs nothing                                                     | `plugins/sumi-host` |
| `apps`      | owns the `apps` slot and `AppsModule`, and fills the host's tab page ([plugins.md](plugins.md)); always on                                         | `plugins/apps`      |
| `terminal`  | the Terminal app, a fill of `apps`; on in the built-in profile                                                                                     | `plugins/terminal`  |
| `main`      | the app as it was before plugins: fills the slot with its own modules (places, questions, tasks) and shrinks as pieces move into their own plugins | `plugins/main`      |

`resolvePlugins(profile)` (`apps/studio/src/plugins/sumi-plugins.ts`) answers the host's own slots, the shared modules and the tab page, and every refusal; the core and each studio window resolve it for their workspace ([plugins.md](plugins.md)); the core logs each refusal as `[studio-core] plugins: …`. `sumi-host`, `apps` and `main` are always on: `ALWAYS_ON_PLUGINS` in the host, never in a profile. Each workspace keeps its own `sumi.profile.json` (`{ "plugins": [...] }`, the extra plugins it enables); no file means the built-in profile, `{ "plugins": ["terminal"] }`. `npm run test:sumi-plugins` holds the module set, and starts a core from it in memory to check every module answers.

**Running it.** `npm run dev` in `apps/tauri` is the whole dev start: Tauri's `beforeDevCommand` runs `dev-frontend.mts`, which serves the window's project on port 5173; `npm run build` builds it through `build-frontend.mts`. The project is `apps/tauri/project`: a Widgetarium project inside the repo with no `package.json` and no `node_modules` of its own, so it resolves React and every package from the root `node_modules`. `WIDGETARIUM_PROJECT=<folder>` draws another project instead. A project with its own React loads a second copy, every hook fails with "Invalid hook call" and the window stays empty; `npm run test:single-react` fails when a second copy appears anywhere in the repo.

TODO: `settings.json` and `session.json` each have two holders, the host's own documents and the layout's gateways, both writing rev-checked patches. One owner per file is the target.

## Deploy

| An app's modules…          | It needs                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| all run where the app runs | no server; the app runs every handler itself                                                                                 |
| some run on a server       | `apps/server`: `server().modules(...).start({ env })` serves `/rpc/*`; the app imports them with `.over(orpcTransport(url))` |

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
