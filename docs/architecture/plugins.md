# Plugins

Two frameworks, two jobs. **`@widgetarium/data-framework`** carries every piece of data: modules, requests (queries, commands, events), transports ([requests.md](requests.md)). **`@widgetarium/plugin-framework`** says what is switched on, who builds on whom and what each plugin offers the others: plugins, services and the plugin runtime with its per-workspace state. Neither imports the other; Sumi joins them: the state reaches the runtime through `PluginStateStore`, a reader and writer the host implements over its store.

## The plugin framework

| Piece                                                                                 | Is                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export const chat = plugin("chat")`                                                  | a plugin, its id the one kebab segment it takes, checked where it is written                                                                                                                            |
| `.require(a, b)`, `.optional(c)`                                                      | the plugins and services it builds on: required ones start first, optional ones may be off                                                                                                              |
| `.apply((app) => api)`                                                                | runs once at start, after everything it builds on; `app.use(dep)` answers a dependency's API (`null` for an optional one that is off); what `apply` returns is this plugin's API                        |
| `export const backend = service<Backend>("backend")`                                  | a capability the host provides rather than a plugin; required or optional like a plugin                                                                                                                 |
| `runtime().provide(backend, (caller) => impl)`                                        | the host's implementation of a service, built per plugin from `caller: { pluginId, prefix }`                                                                                                            |
| `runtime().builtInPlugins(...).alwaysOn(...).state(store).withNameResolves().start()` | the plugin runtime, one per workspace: names, enables, orders and applies the plugins; answers `startedIds`, `refusals`, `notes` and `modulePrefixOf(pluginId)`                                         |
| `src/generated/plugin.ts`                                                             | written by `data-framework generate`: `pluginWithSlots(definition, {})`, the plugin's namespace; `src/index.ts` re-exports it                                                                              |
| `sumi.plugins.json`, `PluginStateStore`                                               | per workspace, owned by the runtime and written through the host's store: `{ "v": 1, "plugins": { "<id>": { "enabled": boolean, "alias"?, "of"?, "from"? } } }` ([The plugin state](#the-plugin-state)) |

```ts skip-check
export const files = plugin("files")
	.require(apps)
	.apply((app) => ({
		viewer: (viewer: FileViewer): void => {
			app.use(apps).app({ ...viewer, tabModules: ({ tabId }) => [filePage({ tabId })] });
		},
	}));

export const markdownViewer = plugin("markdown-viewer")
	.require(files)
	.apply((app) => app.use(files).viewer({ id: "markdown", title: "Markdown", view: MarkdownView }));
```

- **An API is plain functions.** A plugin keeps what others hand it in its own arrays and passes those arrays, by reference, into its modules' config; a module reads them when it starts, after every `apply` ran. No schema guards an API: TypeScript types it.
- **Calls happen inside `apply`.** After start every API is closed: a later call throws `X.method was called after start: call it inside apply`.
- **Using what was not listed is refused.** `app.use(dep)` on a dependency missing from `.require` / `.optional` refuses the plugin; so does a required service no host provides.
- **Refusals spread.** A plugin refused (its `apply` threw, a requirement is off, a cycle) does not start, and every plugin requiring it is refused too, each naming why. Every cycle is refused, optional ones included: `plugin X optionally uses Y, which uses it back`.

A plugin's constant may meet a data module's of the same name (`apps`, `commandMenu`). The plugin keeps the name; the data side is imported under an alias: `apps as appsContract` from `"./contract"`, `apps as appsModule` from `"./implementation"`.

## A plugin owns its data

**The rule.** A plugin owns its modules and what other plugins hand it through its API. Only its own code reads that; anyone else reaches the data through its module's queries, commands and events. A plugin that needs it `.require`s the plugin and `.imports` the module.

**The host knows no plugin.** `apps/tauri` and `apps/studio` start the plugin runtime, provide the host services and start or draw what plugins register through them. They never read another plugin's API or configure a module with its data. It happened once: `appHost({ apps })` took the apps list from the host, and it was rewritten.

The services are declared in `plugins/sumi-host` (`src/shared/lib/host-services.ts`); `apps/studio/src/plugins/host-services.ts` provides them and collects every registration into `ResolvedPlugins`:

| Service   | Call                                                                 | The host                                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend` | `module(module, contract)`, `moduleOf((offers) => module, contract)` | starts the module in the core per workspace (`offers`: `store`, `file`); each studio window imports `contract` over IPC                                                                                                                                         |
| `backend` | `server({ name, modules, serve })`                                   | after the core, starts one runtime per server with `modules`, every core module and the host capabilities imported over the core's local transport, then calls `serve(runtime)`; a module both in the core and in a server is refused for the server: one owner |
| `windows` | `module(module)`, `moduleOf((offers) => module)`                     | runs it in each studio window's app; in Tauri `offers.tauri` lends the store and the core-changed signal                                                                                                                                                        |
| `windows` | `serverModule((offers) => module)`                                   | serves it in one server per studio window, with no app caller, on the transport the window offers lend as `windowServer`; `offers` are `workspaceId`, `platform`, `core` and `assistant`                                                                        |
| `shell`   | `tabPage({ page, header, draws(app), modulesOf(tab, offers) })`      | draws `page` for the first registration that `draws` the tab's app, inside an app over the tab's frame routes that also runs and imports what `modulesOf` answers; `header: "shell"` puts the shell's `AppHeader` above it                                      |
| `shell`   | `layer(component)`, `provider((offers) => component)`                | draws the layer over the studio frame; wraps the frame and its layers in the provider, built once per window                                                                                                                                                    |
| `shell`   | `frameModule(contract, (offers) => { module, frameClosed(tabId) })`  | serves `module` in each window behind `AppCallerAuthenticate` and routes `contract` to every app frame, each frame hearing only its own `{ tab }`; calls `frameClosed` when a frame goes                                                                        |

The window offers (`WindowOffers`) are `workspaceId`, `platform`, `windowApp`, `core`, `windowServer` and `focusedChatId()`. A window also lends any drawn plugin, through `@sumi/sumi-host-plugin`, `AskComposerContext` (the chat composer), `TabFaceContext` (a tab's art) and `OPENS_LAYER_MARK` (an element that opens a layer, so a press on it is not a press outside). Every module a plugin under an alias registers is prefixed with the alias (`prefixedModule`, [requests.md](requests.md#a-prefix)).

`tools/plugin-framework-checks.ts` and `tools/plugin-apply-checks.ts` hold each rule, and each was broken on purpose once.

## The plugin state

`sumi.plugins.json` belongs to the runtime; the host only reads and writes it through `PluginStateStore` (`keptPluginState()`, `initialEnabledIds()` and `initialSource`, `queuePluginStateSave(state, reason)`), in the workspace's folder of the store. Its version is the store's own `v`; the file carries no other.

- **A plugin the state does not list starts enabled**, and its entry is written. A plugin dropped from `builtInPlugins` keeps its entry; one still marked enabled is a note (`notes`, logged at info by the core on each start), never a refusal.
- **Fields this build does not know are kept.** The file and each entry are read loose, and a write keeps every field it read.
- **The first start changes nothing for the person.** With no state file the runtime seeds it from `initialEnabledIds()`, and the save names `initialSource`: the host answers the workspace's old `sumi.profile.json`, or the built-in profile without one, so the enabled set is the one the profile gave. A profile that is unreadable, kept aside or of another shape seeds from the built-in profile, logged as an error; once the seeded file is written the host logs that `sumi.profile.json` is superseded.
- **Always-on plugins cannot be disabled.** `.alwaysOn(...)` plugins start whatever the state says; an `enabled: false` on one is set to `true` in the next save, whose reason logs it.
- **A newer state is read, never written.** A file of a newer `v` is read as far as this build understands it; `queuePluginStateSave` logs "newer state kept, not written" instead of writing.
- **A state that cannot be parsed resets, loudly.** A file the store kept aside as unparseable is treated as missing and reseeded, and the host logs an error naming the copy kept aside and that the choices were reset. The core and the window read it in turn (the first is told it was kept aside, the second finds none), and both seed the same set. A state the store cannot read at all, or of a shape this build does not read, fails the start with the reason: the core answers every call unreachable and the window shows the failure with a retry.
- **A save that loses the rev race** re-reads the file and logs the plugins it computed → the ones stored, when they differ.

## Two plugins with one id

Plugin ids are the strings in `plugin("…")`. Two built-in plugins with one id are refused by default: the second does not start, and the refusal names both and says to rename one string. Started `.withNameResolves()`, the runtime runs every plugin but one of that id under an alias, `<id>-2`, `-3`… (the only names with digits; a plugin id still takes none). The state records which plugin each name stands for: `"chat-2": { "enabled": true, "alias": "chat-2", "of": "chat", "from": "3f9a12bc" }`, and `"from"` on the plain `chat` entry too. `from` is the plugin's origin: a hash of the plugins and services it requires and marks optional. Names resolve saved first: a plugin whose origin matches a saved entry takes that name, the others take the plain id when free, then a saved name nobody claimed, then the next free suffix; so reordering `builtInPlugins` never moves an alias to another plugin. TRADE-OFF: two plugins of one id with the same dependencies share an origin and fall back to `builtInPlugins` order. The alias is the prefix of that plugin's modules (`modulePrefixOf`, `caller.prefix`); a plugin running under its own id takes no prefix, so every wire name stays as it was.

## How Sumi runs them

1. `startSumiPlugins(state)` (`apps/studio/src/plugins/sumi-plugins.ts`) starts the plugin runtime for a workspace with the three host services; every `apply` registers through them.
2. The core window starts the host capabilities (files, terminal) and every `backend` module, serves them per workspace over IPC, then starts every `backend.server` (`startBackendServers`).
3. Each studio window imports every `backend` contract over the core transport, runs every `windows` module, serves every `windows.serverModule`, wraps its frame in every `shell.provider` and draws every `shell.layer`.
4. A tab draws the `shell.tabPage` that draws its app, with the modules its `modulesOf` asks for.

## Layout

A requirement, enforced by `npm run test:plugin-layout` and the `plugin-layout-reviewer` agent:

```
plugins/<name>/
  package.json  tsconfig.json  LICENSE
  src/
    plugin.ts     always: the plugin() definition and its imports, nothing else
    index.ts      re-exports only: ./generated/plugin.js, and what other code needs
    generated/plugin.ts   written by data-framework generate: the plugin's namespace
    features/<feature>/ui/<block>/   the feature's blocks, .tsx, and the .css a block uses beside it
    features/<feature>/lib/          the feature's hooks and helpers, .ts
    shared/ui/<block>/               blocks two features use, the root views
    shared/lib/                      hooks and helpers two features use
  data/           when it owns modules
    <module>/     a data module package (placement.md)
```

Apart from `plugin.ts`, `index.ts` and `generated/`, `src/` is a client package's inside ([placement.md](placement.md#a-client-package), [views.md](views.md)): one file per thing, each where its kind and its users put it.

| Breaks the layout                                                                         | Because                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| no `src/plugin.ts`                                                                        | a plugin folder without its plugin has no reason to exist    |
| a helper, schema, type or second declaration in `plugin.ts`                               | `plugin.ts` is read to learn what the plugin is, at a glance |
| a `module.ts` or a `"level": "domain"` package outside `data/<module>/`                   | a plugin's data lives in one place                           |
| anything in `index.ts` but `export … from`                                                | the entry hides nothing                                      |
| any other file or folder at the top of `src/` but `features/`, `shared/` and `generated/` | a flat heap hides which feature a file serves                |
| anything in `src/generated/` but `plugin.ts`                                              | `generated/` holds only what the generator writes            |
| a feature or `shared/` holding anything but `ui/` and `lib/`                              | a file's kind decides its folder                             |
| a file loose in `ui/`, or anything but `.tsx` and `.css` in `ui/<block>/`                 | a block and its sheet stand together, hooks go to `lib/`     |
| a folder, a `.tsx` or a `.css` in `lib/`                                                  | `lib/` is flat `.ts`; what is drawn is a block               |
| a file outside `features/<f>/` importing `features/<f>/lib/` (`plugin.ts` excepted)       | a feature's lib is its own; what two features use is shared  |

A feature may draw another feature's block; it never imports another feature's `lib/`. Which feature a file belongs to, and whether a `shared/` file really serves two, is the `plugin-layout-reviewer`'s call.

## Example: apps

`plugins/apps` returns `{ app(entry) }`: an app is `{ id, title, icon or art, view?, tabs?, … }`, kept in the plugin's own list. It owns the `apps` module (`plugins/apps/data/apps`, `@sumi/apps`) and `places`, both started in the core through `backend.moduleOf` with that list; `apps.apps.all` answers the apps a workspace has. It runs `appHost` in each window (`windows.moduleOf`) and registers the tab page that draws an app's view. `terminal`, `main`, `chat` and `files` call `app.use(apps).app(...)`; nothing reads the list but the apps plugin.

## Example: command menu

`plugins/command-menu` returns `{ door, page, rowSource }`. Its own doors are ⌘K, ⌘N and ⌘L; ⌘I is the chat plugin's. It runs `commandMenu` (`plugins/command-menu/data/command-menu`, `@sumi/command-menu`) in each window with its lists and draws the menu through `shell.layer`. A page added for a door wins over the module's built-in one. The shell opens the menu only through `commandMenu.opening.toggle`.

## Example: mcp

`plugins/mcp` owns the `mcp` module (`plugins/mcp/data/mcp`, `@sumi/mcp`), the one list of MCP servers, and registers one backend server, `mcp`, whose `serve` mounts `mcpServerOf(runtime, { name })`: every `.public()` request of every module in that runtime is a tool, named by its full name with dots → `_` (`questions_dock_questions-of-chat`) and described by `metadata.description`. It returns `{ tools(modules) }`: a plugin hands it modules to serve to agents, and those modules run only in the MCP server. `mcp.servers.all` answers each server with its tools. A tool name past 64 characters is refused, and the server is logged unserved. TODO: hand the mounted servers to the agent's MCP relay; servers from a file (GitHub, Jira) with no plugin.

## Example: chat

`plugins/chat` owns `plugins/chat/data/assistant` (`@widgetarium/assistant`), `plugins/chat/data/questions` (`@widgetarium/questions`), `plugins/chat/data/mascot` (`@widgetarium/mascot`) and `plugins/chat/data/chat-tabs`, and every drawn part of the chat. Its `apply` adds the `chat` app to `apps`, starts `questions` in the core (`backend.module`), registers the chat tab page (no shell header; `modulesOf` runs `mascot` and imports `tasks` over `offers.core` and `assistant` over `offers.windowServer`), runs `chatTabs` in each window, serves `assistant(offers.assistant)` per window (`windows.serverModule`; each request names its `chat`), wraps the window in the Ask composer (`shell.provider`) and adds the menu's Ask door ⌘I with its page. A chat is a tab of the `chat` app in places.

The chat's sheets reach the window through the canvas sheet (`tools/canvas-sheet.mts`), as the menu's do.

TODO: the chat pane's plate, its crumb and more menu, the chats column and the chat tab's mascot icon are still the shell's: they draw app-host's chat rows and pane kind, and move once app-host's chats move into the chat plugin.
