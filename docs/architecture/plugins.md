# Plugins

Two frameworks, two jobs. **`@widgetarium/data-framework`** carries every piece of data: modules, requests (queries, commands, events), transports ([requests.md](requests.md)). **`@widgetarium/plugin-framework`** says what is switched on and who extends whom: plugins, slots, fills and the workspace profile. Neither imports the other; Sumi joins them.

## The plugin framework

| Piece                                              | Is                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin(id)`                                       | a plugin: `.require(P)` / `.optional(P)` the plugins it builds on, `.declare(Slot)` the slots it owns, `.fill(Slot({ … }))` what it puts into another plugin's slot |
| `slot(name).item(schema)[.list()]`                 | a typed extension point; a fill is checked against the schema; a list fill carries an `id`                                                                          |
| `Slot(SourceSlot, (items) => [...])`               | a fill built from the fills of a slot the plugin declares itself: the function gets that slot's items, each with its `id`, and answers the items to put in `Slot`   |
| `sumi.profile.json`                                | per workspace: `{ "plugins": [...] }`, the plugins switched on beside the always-on ones; no file is the built-in profile                                           |
| `startOrderOf`, `slotFillsOf`, `profileRefusalsOf` | resolve a profile: start order, each slot's fills, every refusal                                                                                                    |
| `slotReaderOf(fills, plugin)`                      | reads the fills of the slots that plugin declares, and refuses any other slot                                                                                       |

## A plugin owns its data

**The rule.** A plugin declares its slots and its modules. The fills of its slots are read by its own code only, through the reader the host hands it. Anyone else reaches that data only through the plugin's module: its queries, commands and events. A plugin that needs it `.require`s the plugin and `.imports` the module.

**The host knows no plugin.** `apps/tauri` and `apps/studio` resolve the profile, start the modules plugins put in the host's slots and draw the pages plugins put there. They never read, parse or interpret another plugin's slot. They offer what any plugin may use: a store, the tasks file, a slot reader scoped to the plugin, transports, a place to draw a tab. A host that reads `apps` fills, or a module of the shell configured with them, is the defect this rule forbids. It happened once: `AppHostModule({ apps })` took the apps list from the host, and it was rewritten.

The host declares its own slots in `plugins/sumi-host` and reads only those:

| Slot                      | Item                                                                                          | The host                                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BackgroundModulesSlot`   | `{ module: (offers) => module, contract }`                                                    | starts `module(offers)` in the core per workspace; each studio window imports `contract` over IPC                                                                                                                                            |
| `TabPageSlot`             | `{ tabPage: (offers) => { page, header, draws(app), modulesOf(tab, windowOffers) } }`, a list | draws the `page` of the first fill that `draws` the tab's app, inside an app over the tab's frame routes that also runs and imports what `modulesOf` answers; `header: "shell"` puts the shell's `AppHeader` above it                        |
| `WindowModulesSlot`       | `{ module: (offers) => module }`                                                              | runs `module(offers)` in each studio window's app, beside the shell's own modules                                                                                                                                                            |
| `WindowLayersSlot`        | `{ layer: (offers) => component }`                                                            | draws `component` over the studio frame, inside the window's app                                                                                                                                                                             |
| `WindowProvidersSlot`     | `{ provider: (offers) => component }`                                                         | wraps the studio frame and its layers in `component`, built once per window from the window offers                                                                                                                                           |
| `WindowServerModulesSlot` | `{ module: (offers) => module }`, a list                                                      | serves every `module(offers)` in one server per studio window, with no app caller, on the transport the window offers lend as `windowServer`; `offers` are `workspaceId`, `platform`, `core` and `assistant` (the machine's assistant ports) |
| `FrameModulesSlot`        | `{ contract, serving: (offers) => { module, frameClosed(tabId) } }`, a list                   | serves `module` in each studio window behind `AppCallerAuthenticate` and routes `contract` to every app frame, each frame hearing only its own `{ tab }`; calls `frameClosed` when a frame goes                                              |

`offers` always holds `fillsOf(slot)`, the plugin's own slot reader. The window offers (`WindowOffers`) are what a window lends a plugin's modules: `workspaceId`, `platform`, `windowApp` (the window's app), `core` (the transport to the core), `windowServer` (the transport to the window server's modules) and `focusedChatId()`; a window provider and a frame module get them with their reader, a tab page's `modulesOf` with the tab. A window also lends what any drawn plugin may use through `@sumi/sumi-host-plugin`: `AskComposerContext` (the chat composer, its app and bar), `TabFaceContext` (a tab's art) and `OPENS_LAYER_MARK` (an element that opens a layer, so a press on it is not a press outside).

## Fills built from a slot

A plugin that collects fills in its own slot can pass them on to another plugin's slot, so the plugins filling it register once:

```ts skip-check
export const FilesPlugin = plugin("files")
	.require(AppsPlugin)
	.declare(FileViewersSlot)
	.fill(
		AppsSlot(FileViewersSlot, (viewers) =>
			viewers.map((viewer) => ({ id: viewer.id, title: viewer.title, icon: viewer.icon, view: viewer.view })),
		),
	);
```

- **The same call.** `AppsSlot({ ... })` is a fill; `AppsSlot(SourceSlot, build)` is a fill built from `SourceSlot`. The function may map, drop, or fold many items into one; its answer is a list of items, typed by the target slot.
- **Only from its own slots.** The source must be a slot the building plugin declares, as `fillsOf` reads only its own slots; any other source is refused.
- **Resolved before anyone reads.** `slotFillsOf` resolves plain fills first, then each built fill once its source is complete, so a built slot may feed another build whatever order the fills are written in. Two builds waiting on each other, or a slot built from itself, are refused as a loop.
- **Checked like any fill.** Each built item passes the same checks as a plain fill of the building plugin: the target's owner is required or optional, and the target's schema accepts the item. A function that throws or answers something that is not a list is refused with the reason.

`tools/plugin-framework-checks.ts` holds each rule, and each was broken on purpose once.

## How Sumi runs them

```
sumi.profile.json ──► resolvePlugins(profile)        apps/studio/src/plugins/sumi-plugins.ts
                        │
      core window ──────┼── host capabilities (files, terminal) + every BackgroundModulesSlot module(offers)
                        │                                       served per workspace over IPC
      studio window ────┼── imports every BackgroundModulesSlot contract over the core transport
                        ├── runs every WindowModulesSlot module, draws every WindowLayersSlot layer
                        ├── wraps its frame in every WindowProvidersSlot provider(window offers)
                        └── draws the TabPageSlot page that draws a tab's app, with the modules it asks for
```

## Layout

A requirement, enforced by `npm run test:plugin-layout` and the `plugin-layout-reviewer` agent:

```
plugins/<name>/
  package.json  tsconfig.json  LICENSE
  src/
    plugin.ts     always: the plugin(...) definition and its imports, nothing else
    slots.ts      when it declares slots: the slots, their item schemas and types
    index.ts      re-exports only
    features/<feature>/ui/<block>/   the feature's blocks, .tsx, and the .css a block uses beside it
    features/<feature>/lib/          the feature's hooks and helpers, .ts
    shared/ui/<block>/               blocks two features use, the root views
    shared/lib/                      hooks and helpers two features use
  data/           when it owns modules
    <module>/     a data module package (placement.md)
```

Apart from `plugin.ts`, `slots.ts` and `index.ts`, `src/` is a client package's inside ([placement.md](placement.md#a-client-package), [views.md](views.md)): one file per thing, each where its kind and its users put it.

| Breaks the layout                                                                   | Because                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| no `src/plugin.ts`                                                                  | a plugin folder without its plugin has no reason to exist    |
| a helper, slot, schema, type or second declaration in `plugin.ts`                   | `plugin.ts` is read to learn what the plugin is, at a glance |
| `slot(...)` outside `slots.ts`                                                      | the slots a plugin offers are one list                       |
| a `module.ts` or a `"level": "domain"` package outside `data/<module>/`             | a plugin's data lives in one place                           |
| anything in `index.ts` but `export … from`                                          | the entry hides nothing                                      |
| any other file or folder at the top of `src/` but `features/` and `shared/`         | a flat heap hides which feature a file serves                |
| a feature or `shared/` holding anything but `ui/` and `lib/`                        | a file's kind decides its folder                             |
| a file loose in `ui/`, or anything but `.tsx` and `.css` in `ui/<block>/`           | a block and its sheet stand together, hooks go to `lib/`     |
| a folder, a `.tsx` or a `.css` in `lib/`                                            | `lib/` is flat `.ts`; what is drawn is a block               |
| a file outside `features/<f>/` importing `features/<f>/lib/` (`plugin.ts` excepted) | a feature's lib is its own; what two features use is shared  |

A feature may draw another feature's block; it never imports another feature's `lib/`. Which feature a file belongs to, and whether a `shared/` file really serves two, is the `plugin-layout-reviewer`'s call.

## Example: apps

`plugins/apps` declares `AppsSlot` (`{ id, title, icon, view }`) and owns `AppsModule` (`plugins/apps/data/apps`, `@sumi/apps`): the core starts it with the plugin's own fills, and `AppsQuery` answers the apps a workspace has. The plugin fills the host's `TabPageSlot` with the page that draws an app's view. `plugins/terminal` and `plugins/browser-page` require it and fill `AppsSlot` with the Terminal and the Browser. The browser-page plugin also owns `WebPageModule` (`plugins/browser-page/data/web-page`, `@widgetarium/web-page`) and fills `FrameModulesSlot` with it, so every frame, its own Browser view included, reaches web pages while the host names no `web-page` module. The shell's menu reads `AppsQuery`; nothing reads `AppsSlot` but the apps plugin.

## Example: command menu

`plugins/command-menu` declares `MenuDoorsSlot` (`{ id, letter, label, placeholder, startsWith }`), `MenuPagesSlot` (`{ id, draftsOf }`, the sections a door draws) and `MenuRowSourcesSlot` (`{ id, isFindable, rowsOf(send) }`, rows other plugins add). It owns `CommandMenuModule` (`plugins/command-menu/data/command-menu`, `@sumi/command-menu`), started with its own fills through `WindowModulesSlot`, and draws the menu and its keys through `WindowLayersSlot`. Its own fills are the doors ⌘K, ⌘N and ⌘L; ⌘I is the chat plugin's. The module's built-in pages and rows answer when no fill replaces them; a page filled for a door wins. The shell opens the menu only through `ToggleCommandMenuCommand` and reads the doors' keys through `MenuDoorsQuery`.

## Example: chat

`plugins/chat` owns the chat's modules, `plugins/chat/data/assistant` (`@widgetarium/assistant`), `plugins/chat/data/questions` (`@widgetarium/questions`) and `plugins/chat/data/mascot` (`@widgetarium/mascot`), and every drawn part of the chat: the page (`src/features/`: chat-page, assistant, mascot, questions) and the Ask composer (`src/features/ask`). It fills the host's `BackgroundModulesSlot` with `QuestionsModule`; `TabPageSlot` with the chat page, which draws the `chat` app with no shell header and whose `modulesOf` runs `MascotModule` in the tab's app and imports `TasksModule` over `offers.core` and `AssistantModule` over `offers.windowServer`; `WindowServerModulesSlot` with `AssistantModule(offers.assistant)`, one instance per window serving every chat: each request names its `chat` (the chat's id, `null` for the Ask composer), and the module's `ChatPartsGateway` picks that chat's ports from the lent host and keeps its state; `WindowProvidersSlot` with the Ask composer, whose app imports the same module; and the menu's `MenuDoorsSlot` and `MenuPagesSlot` with the Ask door, ⌘I, and its page (Create and send, Create only); a picked row hands its draft to a chat through the composer the window lends. A chat is a tab of the `chat` app in places, and it tears off, opens and closes through the same places commands as every tab: places decides which window shows it, and app-host only carries out the effects.

The chat's sheets reach the window through the canvas sheet (`tools/canvas-sheet.mts`), as the menu's do.

TODO: the chat pane's plate, its crumb and more menu, the chats column and the chat tab's mascot icon are still the shell's: they draw app-host's chat rows and pane kind, and move once app-host's chats move into the chat plugin.

TODO: a row source of another plugin sends only to modules the menu's module imports.

TODO: `app-host` (`packages/domain`) imports `@sumi/apps` until the shell's tabs move into the apps plugin.
