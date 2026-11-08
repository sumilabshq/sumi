# Plugins

Two frameworks, two jobs. **`@widgetarium/data-framework`** carries every piece of data: modules, requests (queries, commands, events), transports ([requests.md](requests.md)). **`@widgetarium/plugin-framework`** says what is switched on and who extends whom: plugins, slots, fills and the plugin runtime with its per-workspace state. Neither imports the other; Sumi joins them: the state reaches the runtime through `PluginStateStore`, a reader and writer the host implements over its store.

## The plugin framework

| Piece                                                                                  | Is                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export const chat = plugin("chat")`                                                   | a plugin, its id the one kebab segment it takes (`plugin("command-menu")`), checked where it is written: `.require(p)` / `.optional(p)` the plugins it builds on, `.declare(slot)` the slots it owns, `.fill(…)` what it puts into slots                                                                            |
| `export const menuDoors = slot().item(schema)[.list()]`                                | in `src/slots.ts`: a typed extension point, named `<plugin-id>.<slot-kebab>` (`command-menu.menu-doors`); a fill is checked against the schema; a list holds `z.object()` items, each fill with an `id` holding no `.`                                                                                              |
| `commandMenu.menuDoors.add({ id, … })`, `slot.set(item)`                               | a fill, written subject first: a list slot takes `.add` (the item carries its `id`), a single slot `.set`                                                                                                                                                                                                           |
| `apps.apps.addFrom(source, (items) => [...])`, `slot.setFrom(source, (items) => item)` | a fill built from the fills of a slot the plugin declares itself: the function gets that slot's items, each with its `id`, and answers the items to put in the target                                                                                                                                               |
| `src/generated/plugin.ts`                                                              | written by `data-framework generate`: names the plugin's slots (`namedSlot`), places them under the plugin's id (`pluginWithSlots(definition, { … })`) and exports one namespace named after the plugin's constant, the plugin with its slots as properties (`commandMenu.menuDoors`); `src/index.ts` re-exports it |
| `runtime().builtInPlugins(...).alwaysOn(...).state(store).withNameResolves().start()`  | the plugin runtime, one per workspace: names, enables and starts the plugins, resolves each slot's fills and every refusal; answers `startedIds`, `refusals`, `notes`, `fillsOf(slot)`, `readerOf(pluginId)` and `modulePrefixOf(pluginId)`                                                                         |
| `sumi.plugins.json`, `PluginStateStore`                                                | per workspace, owned by the runtime and written through the host's store: `{ "v": 1, "plugins": { "<id>": { "enabled": boolean, "alias"?: string, "of"?: string, "from"?: string } } }` ([The plugin state](#the-plugin-state))                                                                                     |
| `readerOf(pluginId)`                                                                   | reads the fills of the slots that plugin declares, and refuses any other slot                                                                                                                                                                                                                                       |

A plugin's constant may meet a data module's of the same name (`apps`, `commandMenu`). The plugin keeps the name; the data side is imported under an alias: `apps as appsContract` from `"./contract"`, `apps as appsModule` from `"./implementation"`. In its own `plugin.ts` a plugin imports a slot named like itself as `apps as appsSlot`.

## A plugin owns its data

**The rule.** A plugin declares its slots and its modules. The fills of its slots are read by its own code only, through the reader the host hands it. Anyone else reaches that data only through the plugin's module: its queries, commands and events. A plugin that needs it `.require`s the plugin and `.imports` the module.

**The host knows no plugin.** `apps/tauri` and `apps/studio` start the plugin runtime, start the modules plugins put in the host's slots and draw the pages plugins put there. They never read, parse or interpret another plugin's slot. They offer what any plugin may use: a store, the tasks file, a slot reader scoped to the plugin, transports, a place to draw a tab. A host that reads `apps` fills, or a module of the shell configured with them, is the defect this rule forbids. It happened once: `appHost({ apps })` took the apps list from the host, and it was rewritten.

The host declares its own slots in `plugins/sumi-host` and reads only those:

| Slot                           | Item                                                                                          | The host                                                                                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sumiHost.backgroundModules`   | `{ module: (offers) => module, contract }`                                                    | starts `module(offers)` in the core per workspace; each studio window imports `contract` over IPC                                                                                                                                            |
| `sumiHost.tabPage`             | `{ tabPage: (offers) => { page, header, draws(app), modulesOf(tab, windowOffers) } }`, a list | draws the `page` of the first fill that `draws` the tab's app, inside an app over the tab's frame routes that also runs and imports what `modulesOf` answers; `header: "shell"` puts the shell's `AppHeader` above it                        |
| `sumiHost.windowModules`       | `{ module: (offers) => module }`                                                              | runs `module(offers)` in each studio window's app, beside the shell's own modules; in Tauri `offers.tauri` lends the store and the core-changed signal                                                                                       |
| `sumiHost.windowLayers`        | `{ layer: (offers) => component }`                                                            | draws `component` over the studio frame, inside the window's app                                                                                                                                                                             |
| `sumiHost.windowProviders`     | `{ provider: (offers) => component }`                                                         | wraps the studio frame and its layers in `component`, built once per window from the window offers                                                                                                                                           |
| `sumiHost.windowServerModules` | `{ module: (offers) => module }`, a list                                                      | serves every `module(offers)` in one server per studio window, with no app caller, on the transport the window offers lend as `windowServer`; `offers` are `workspaceId`, `platform`, `core` and `assistant` (the machine's assistant ports) |
| `sumiHost.frameModules`        | `{ contract, serving: (offers) => { module, frameClosed(tabId) } }`, a list                   | serves `module` in each studio window behind `AppCallerAuthenticate` and routes `contract` to every app frame, each frame hearing only its own `{ tab }`; calls `frameClosed` when a frame goes                                              |

`offers` always holds `fillsOf(slot)`, the plugin's own slot reader. The window offers (`WindowOffers`) are what a window lends a plugin's modules: `workspaceId`, `platform`, `windowApp` (the window's app), `core` (the transport to the core), `windowServer` (the transport to the window server's modules) and `focusedChatId()`; a window provider and a frame module get them with their reader, a tab page's `modulesOf` with the tab. A window also lends what any drawn plugin may use through `@sumi/sumi-host-plugin`: `AskComposerContext` (the chat composer, its app and bar), `TabFaceContext` (a tab's art) and `OPENS_LAYER_MARK` (an element that opens a layer, so a press on it is not a press outside).

## Fills built from a slot

A plugin that collects fills in its own slot can pass them on to another plugin's slot, so the plugins filling it register once:

```ts skip-check
export const files = plugin("files")
	.require(apps)
	.declare(fileViewers)
	.fill(
		apps.apps.addFrom(fileViewers, (viewers) =>
			viewers.map((viewer) => ({ id: viewer.id, title: viewer.title, icon: viewer.icon, view: viewer.view })),
		),
	);
```

- **Subject first.** `apps.apps.add({ ... })` is a fill; `apps.apps.addFrom(source, build)` is a fill built from `source`, and a single slot's `setFrom(source, build)` folds the items into its one item. The function may map, drop, or fold many items into one; `addFrom`'s answer is a list of items, typed by the target slot. Inside its own `plugin.ts` a plugin names its slots by their constants from `./slots.js` (`fileViewers`); everyone else through the namespace (`files.fileViewers`).
- **Only from its own slots.** The source must be a slot the building plugin declares, as `fillsOf` reads only its own slots; any other source is refused.
- **Resolved before anyone reads.** The runtime resolves plain fills first, then each built fill once its source is complete, so a built slot may feed another build whatever order the fills are written in. Two builds waiting on each other, or a slot built from itself, are refused as a loop.
- **Checked like any fill.** Each built item passes the same checks as a plain fill of the building plugin: the target's owner is required or optional, and the target's schema accepts the item. A function that throws or answers something that is not a list is refused with the reason.

`tools/plugin-framework-checks.ts` holds each rule, and each was broken on purpose once.

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

Plugin ids are the strings in `plugin("…")`. Two built-in plugins with one id are refused by default: the second does not start, and the refusal names both and says to rename one string. Started `.withNameResolves()`, the runtime runs every plugin but one of that id under an alias, `<id>-2`, `-3`… (the only names with digits; a plugin id still takes none). The state records which plugin each name stands for: `"chat-2": { "enabled": true, "alias": "chat-2", "of": "chat", "from": "3f9a12bc" }`, and `"from"` on the plain `chat` entry too. `from` is the plugin's origin: a hash of what it fills, builds, declares and requires, since a plugin has no identity beyond its id. Names resolve saved first: a plugin whose origin matches a saved entry takes that name, the others take the plain id when free, then a saved name nobody claimed, then the next free suffix; so reordering `builtInPlugins` never moves an alias to another plugin. TRADE-OFF: a plugin whose fills change gets a new origin and falls back to `builtInPlugins` order. The alias names the plugin's fills, and the host passes it as the prefix of that plugin's modules (`modulePrefixOf`, [requests.md](requests.md#a-prefix)). A plugin running under its own id has no alias, so its modules take no prefix and every wire name stays as it was. A plugin that would run under an alias and declares slots does not start, refused with the reason. TODO: slots of an aliased plugin.

## How Sumi runs them

```
sumi.plugins.json ──► startSumiPlugins(state)        apps/studio/src/plugins/sumi-plugins.ts, the plugin runtime
                        │
      core window ──────┼── host capabilities (files, terminal) + every sumiHost.backgroundModules module(offers)
                        │                                       served per workspace over IPC
      studio window ────┼── imports every sumiHost.backgroundModules contract over the core transport
                        ├── runs every sumiHost.windowModules module, draws every sumiHost.windowLayers layer
                        ├── wraps its frame in every sumiHost.windowProviders provider(window offers)
                        └── draws the sumiHost.tabPage page that draws a tab's app, with the modules it asks for
```

## Layout

A requirement, enforced by `npm run test:plugin-layout` and the `plugin-layout-reviewer` agent:

```
plugins/<name>/
  package.json  tsconfig.json  LICENSE
  src/
    plugin.ts     always: the plugin() definition and its imports, nothing else
    slots.ts      when it declares slots: the slots, their item schemas and types
    index.ts      re-exports only: ./generated/plugin.js, and what other code needs of slots.ts
    generated/plugin.ts   written by data-framework generate: the plugin's namespace
    features/<feature>/ui/<block>/   the feature's blocks, .tsx, and the .css a block uses beside it
    features/<feature>/lib/          the feature's hooks and helpers, .ts
    shared/ui/<block>/               blocks two features use, the root views
    shared/lib/                      hooks and helpers two features use
  data/           when it owns modules
    <module>/     a data module package (placement.md)
```

Apart from `plugin.ts`, `slots.ts`, `index.ts` and `generated/`, `src/` is a client package's inside ([placement.md](placement.md#a-client-package), [views.md](views.md)): one file per thing, each where its kind and its users put it.

| Breaks the layout                                                                         | Because                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| no `src/plugin.ts`                                                                        | a plugin folder without its plugin has no reason to exist    |
| a helper, slot, schema, type or second declaration in `plugin.ts`                         | `plugin.ts` is read to learn what the plugin is, at a glance |
| `slot()` outside `slots.ts`                                                               | the slots a plugin offers are one list                       |
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

`plugins/apps` declares `apps.apps` (`{ id, title, icon, view }`) and owns the `apps` module (`plugins/apps/data/apps`, `@sumi/apps`): the core starts it with the plugin's own fills, and `apps.apps.all` answers the apps a workspace has. The plugin fills the host's `sumiHost.tabPage` with the page that draws an app's view. `plugins/terminal` and `plugins/browser-page` require it and fill `apps.apps` with the Terminal and the Browser. The browser-page plugin also owns the `webPage` module (`plugins/browser-page/data/web-page`, `@widgetarium/web-page`) and fills `sumiHost.frameModules` with it, so every frame, its own Browser view included, reaches web pages while the host names no `web-page` module. The shell's menu reads `apps.apps.all`; nothing reads `apps.apps` but the apps plugin.

## Example: command menu

`plugins/command-menu` declares `commandMenu.menuDoors` (`{ id, letter, label, placeholder, startsWith }`), `commandMenu.menuPages` (`{ id, draftsOf }`, the sections a door draws) and `commandMenu.menuRowSources` (`{ id, isFindable, rowsOf(send) }`, rows other plugins add). It owns `commandMenu` (`plugins/command-menu/data/command-menu`, `@sumi/command-menu`), started with its own fills through `sumiHost.windowModules`, and draws the menu and its keys through `sumiHost.windowLayers`. Its own fills are the doors ⌘K, ⌘N and ⌘L; ⌘I is the chat plugin's. The module's built-in pages and rows answer when no fill replaces them; a page filled for a door wins. The shell opens the menu only through `commandMenu.opening.toggle` and reads the doors' keys through `commandMenu.opening.doors`.

## Example: chat

`plugins/chat` owns the chat's modules, `plugins/chat/data/assistant` (`@widgetarium/assistant`), `plugins/chat/data/questions` (`@widgetarium/questions`) and `plugins/chat/data/mascot` (`@widgetarium/mascot`), and every drawn part of the chat: the page (`src/features/`: chat-page, assistant, mascot, questions) and the Ask composer (`src/features/ask`). It fills the host's `sumiHost.backgroundModules` with `questions`; `sumiHost.tabPage` with the chat page, which draws the `chat` app with no shell header and whose `modulesOf` runs `mascot` in the tab's app and imports `tasks` over `offers.core` and `assistant` over `offers.windowServer`; `sumiHost.windowServerModules` with `assistant(offers.assistant)`, one instance per window serving every chat: each request names its `chat` (the chat's id, `null` for the Ask composer), and the module's `ChatPartsGateway` picks that chat's ports from the lent host and keeps its state; `sumiHost.windowProviders` with the Ask composer, whose app imports the same module; and the menu's `commandMenu.menuDoors` and `commandMenu.menuPages` with the Ask door, ⌘I, and its page (Create and send, Create only); a picked row hands its draft to a chat through the composer the window lends. A chat is a tab of the `chat` app in places, and it tears off, opens and closes through the same places commands as every tab: places decides which window shows it, and app-host only carries out the effects.

The chat's sheets reach the window through the canvas sheet (`tools/canvas-sheet.mts`), as the menu's do.

TODO: the chat pane's plate, its crumb and more menu, the chats column and the chat tab's mascot icon are still the shell's: they draw app-host's chat rows and pane kind, and move once app-host's chats move into the chat plugin.

TODO: a row source of another plugin sends only to modules the menu's module imports.
