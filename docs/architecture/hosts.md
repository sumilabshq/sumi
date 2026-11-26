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
export function startLayoutApp({ platform, workspaceId }: LayoutAppAsk): Runtime {
	return runtime().modules(layout).start({ platform, scope: { workspaceId } });
}
```

A host never builds a module's gateway and never passes a "parts" object. What a module needs from the platform it reaches through its gateways. A module that writes the Tauri store is configured with a `StoreClient` (`@widgetarium/behaviors/tauri-store`), never Tauri's `invoke`. A module that keeps one file is configured with that file instead: `tasks({ file })` takes a `BoardFile` whose reads and writes are FileSystem requests.

**Live objects, through a module's config.** A live object only the host has (a file it opened, a running agent) is passed raw where the host starts the module: `canvas({ kind: "project", project })`, and `provide` builds the module's gateways on it ([requests.md](requests.md#a-modules-config)). The config's types are re-exported from the module's `"./implementation"` entry. A capability the host provides is named by the module itself with `.requireServices(…)` ([plugins.md](plugins.md#what-a-module-needs-from-the-host)); how the rest of its config reaches it is [open](plugins.md#open).

A runtime's host gives `doneKeys` and `reportFailure`; `orpcTransport` takes `fetch` and `headers` for the wire (the token travels in `headers`; an importing runtime never authenticates). `authenticate` is given to the adapter that exposes the runtime (`dataFrameworkMiddleware`, `servePort`, `local.serve`, the core's IPC), and `rateLimits` comes from the runtime's `.provide` ([requests.md](requests.md#runtime-provides)).

## One platform's code out of another's bundle

- A data module's `"./contract"` is the generated contract: a client package importing it carries no handler and no gateway.
- Only `apps/server` resolves the `server` export condition and imports `@widgetarium/data-framework/server` (Hono, the oRPC server).
- Today a module's picker imports every platform's gateways, so a browser bundle carries the Tauri gateway code, guarded at run time (`TRADE-OFF:` in `layout`'s `gateways/layout-parts/tauri.gateway.ts`). **planned**: a build-time platform condition, proven from the bundle's metafile.

## The Tauri host

`apps/tauri` opens the studio windows, keeps the workspaces, and starts each window's app with `platform: "tauri"` and the window's workspace. Settings and sessions are files the module gateways read and write through `@widgetarium/behaviors/tauri-store`.

**A workspace is a folder.** Everything the store keeps for it (chats, places, canvases, plugin state, each app's `app-data/<app id>/`) lives in `<folder>/.sumi/`, with a `.gitignore` of `*` so a repository never sees it; `<folder>/.sumi/workspace.json` holds its id and name. `~/.sumi/workspaces.json` only lists the opened workspaces with their folders (`home`), and `~/.sumi` keeps what belongs to no workspace: settings, browser profiles, the agent socket, and the chats of "no workspace". New workspace = pick a folder (`create_workspace`): a folder with a `.sumi/workspace.json` opens that workspace, any other becomes a new one named after it; the same workspace open from a second folder is refused, the user's home folder too. The first start opens `Default` in `~/Sumi`. The working folders an agent or terminal starts in (`folder`, `recentFolders` in `workspace.json`) are separate from it and start as the workspace's own folder.

**Only the host touches the machine.** The host's capabilities (files, terminal sessions, haptics) are background modules registered once in `apps/studio/src/plugins/host-services.ts`, so every runtime that runs or imports the background modules has them (through Tauri; their modules live in the host, `apps/tauri/capabilities/*`, and apps reach them only through `@sumi/contract`), then the modules enabled plugins list. Plugins reach a capability only through `@sumi/contract`, never through `@tauri-apps/*` or a host gateway.

`apps/tauri/tauri-reach.mts` holds the rule: only `apps/tauri` resolves `@tauri-apps/*`. Any other import of it fails the host's Vite build and the test loader, and `npm run test:tauri-boundary` fails any package outside `apps/tauri` that declares a Tauri package, imports one or reads `__TAURI`. A module that needs something only Tauri has (a store, the window list, the browser's IPC, the core-changed signal) takes it in an optional config field, `layout({ tauri: { store, windows } })`, and `apps/tauri/src/startup/tauri-studio-lent.ts` builds it. Code running in the studio window can still reach Tauri's global at run time; only a plugin running in its own frame, as apps do, closes that.

| Plugin                      | Is                                                                                                                                                                                                                  | Lives in               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `@sumi/sumi-host-plugin`    | the host's services (`shell`, `agents`) and the window offers; it runs nothing                                                                                                                                      | `plugins/sumi-host`    |
| `@sumi/apps-plugin`         | API `app(entry)`; registers each app in the `apps` module and draws the app tab page; always on                                                                                                                     | `plugins/apps`         |
| `@sumi/terminal-plugin`     | the Terminal app, added through `apps`; on in the built-in profile                                                                                                                                                  | `plugins/terminal`     |
| `@sumi/browser-page-plugin` | the Browser app, added through `apps`, and the `web-page` module, served to every frame; its native web page is placed over the view; on in the built-in profile                                                    | `plugins/browser-page` |
| `@sumi/command-menu-plugin` | API `door`, `page`, `rowSource`; its module runs in the window and its layer draws the menu; always on                                                                                                              | `plugins/command-menu` |
| `@sumi/chat-plugin`         | draws the chat page over the assistant, mascot and chat-tabs modules; registers the chat tab page, the Ask composer provider and the menu's Ask door, and marks the slots where questions and tasks draw; always on | `plugins/ai/chat`      |
| `@sumi/main-plugin`         | the app as it was before plugins: registers its apps, and shrinks as pieces move into their own plugins                                                                                                             | `plugins/main`         |
| `@sumi/agent-plugin`        | each plugin registers its own MCP server; hands each server to the agents through `agents.mcpServer`; the `mcp` module lists them; always on                                                                        | `plugins/ai/agent`     |
| `@sumi/questions-plugin`    | draws the open questions in the chat through a slot over the `questions` module, and serves the `questions` MCP server; always on                                                                                   | `plugins/ai/questions` |
| `@sumi/tasks-plugin`        | draws the Tasks app and the chat's tasks UI through slots over the `tasks` module, and serves the `tasks` MCP server; always on                                                                                     | `plugins/tasks`        |

`startSumiPlugins(state)` (`apps/studio/src/plugins/sumi-plugins.ts`) starts the plugin runtime for a workspace ([plugins.md](plugins.md#the-plugin-state)) with the host services and answers what plugins registered (the tab pages, providers and layers) and every refusal; the core and each studio window start one for their workspace, the core logging each refusal as `[studio-core] plugins: …`. `@sumi/sumi-host-plugin`, `@sumi/apps-plugin`, `@sumi/command-menu-plugin`, `@sumi/chat-plugin`, `@sumi/main-plugin`, `@sumi/agent-plugin`, `@sumi/questions-plugin` and `@sumi/tasks-plugin` are always on: `.alwaysOn(...)` in the host, never in the state. Each workspace keeps its own `sumi.plugins.json`, read and written through `workspacePluginStateOf` (`apps/tauri/src/plugins/workspace-plugin-state.ts`); on its first start it is seeded from the workspace's `sumi.profile.json`, or the built-in profile without one. A state file the store kept aside as unparseable is reseeded with an error naming the copy; one of a newer `v` is read and never written; one of a shape this build does not read fails the start with the reason. `npm run test:sumi-plugins` holds the module set, and starts a core from it in memory to check every module answers.

**Running it.** `npm run dev` in `apps/tauri` is the whole dev start: Tauri's `beforeDevCommand` runs `dev-frontend.mts`, which serves the window's project on port 5173; `npm run build` builds it through `build-frontend.mts`. The project is `apps/tauri/project`: a Widgetarium project inside the repo with no `package.json` and no `node_modules` of its own, so it resolves React and every package from the root `node_modules`. `WIDGETARIUM_PROJECT=<folder>` draws another project instead. A project with its own React loads a second copy, every hook fails with "Invalid hook call" and the window stays empty; `npm run test:single-react` fails when a second copy appears anywhere in the repo.

TODO: `settings.json` and `session.json` each have two holders, the host's own documents and the layout's gateways, both writing rev-checked patches. One owner per file is the target.

## Deploy

| An app's modules…          | It needs                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| all run where the app runs | no server; the app runs every handler itself                                                                                                                                    |
| some run on a server       | `apps/server`: `dataFrameworkMiddleware(runtime().modules(...).start({ platform: "server", env }))` serves `/rpc/*`; the app imports them with `({ over: orpcTransport(url) })` |

`apps/server` is Hono, mounted in `src/main.ts` with CORS for Obsidian's origin and the dev web origin (`WEB_ORIGIN`). `main.ts` is the one file that reads `process.env`. `npm run test:server` starts it on a free port and calls it over real HTTP. There is never a server per device: desktop and mobile call the same `/rpc`.

**CORS is not security.** The server is protected by guards and the adapter's `Authenticate` ([requests.md](requests.md#guards-and-middleware)).

**planned:** the app's config names, per module, `local` or `server`, and a module says which it can do; today the host chooses by which runtime it lists a module in and which adapter exposes that runtime.

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
