# Plugins

Two frameworks, two jobs. **`@widgetarium/data-framework`** carries every piece of data: modules, requests (queries, commands, events), transports ([requests.md](requests.md)). **`@widgetarium/plugin-framework`** says what is switched on and who extends whom: plugins, slots, fills and the workspace profile. Neither imports the other; Sumi joins them.

## The plugin framework

| Piece                                              | Is                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin(id)`                                       | a plugin: `.require(P)` / `.optional(P)` the plugins it builds on, `.declare(Slot)` the slots it owns, `.fill(Slot({ … }))` what it puts into another plugin's slot |
| `slot(name).item(schema)[.list()]`                 | a typed extension point; a fill is checked against the schema; a list fill carries an `id`                                                                          |
| `sumi.profile.json`                                | per workspace: `{ "plugins": [...] }`, the plugins switched on beside the always-on ones; no file is the built-in profile                                           |
| `startOrderOf`, `slotFillsOf`, `profileRefusalsOf` | resolve a profile: start order, each slot's fills, every refusal                                                                                                    |
| `slotReaderOf(fills, plugin)`                      | reads the fills of the slots that plugin declares, and refuses any other slot                                                                                       |

## A plugin owns its data

**The rule.** A plugin declares its slots and its modules. The fills of its slots are read by its own code only, through the reader the host hands it. Anyone else reaches that data only through the plugin's module: its queries, commands and events. A plugin that needs it `.require`s the plugin and `.imports` the module.

**The host knows no plugin.** `apps/tauri` and `apps/studio` resolve the profile, start the modules plugins put in the host's slots and draw the pages plugins put there. They never read, parse or interpret another plugin's slot. They offer what any plugin may use: a store, the tasks file, a slot reader scoped to the plugin, transports, a place to draw a tab. A host that reads `apps` fills, or a module of the shell configured with them, is the defect this rule forbids. It happened once: `AppHostModule({ apps })` took the apps list from the host, and it was rewritten.

The host declares its own slots in `plugins/sumi-host` and reads only those:

| Slot                    | Item                                            | The host                                                                                          |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `BackgroundModulesSlot` | `{ module: (offers) => module, contract }`      | starts `module(offers)` in the core per workspace; each studio window imports `contract` over IPC |
| `TabPageSlot`           | `{ tabPage: (offers) => { page, draws(app) } }` | draws `page` in a tab whose app it `draws`, inside an app over the tab's frame routes             |

`offers` always holds `fillsOf(slot)`, the plugin's own slot reader.

## How Sumi runs them

```
sumi.profile.json ──► resolvePlugins(profile)        apps/studio/src/plugins/sumi-plugins.ts
                        │
      core window ──────┼── host capabilities (files, terminal) + every BackgroundModulesSlot module(offers)
                        │                                       served per workspace over IPC
      studio window ────┼── imports every BackgroundModulesSlot contract over the core transport
                        └── draws the TabPageSlot page in app tabs
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
    <thing>.ts    everything else, one thing per file
  data/           when it owns modules
    <module>/     a data module package (placement.md)
```

| Breaks the layout | Because |
| --- | --- |
| no `src/plugin.ts` | a plugin folder without its plugin has no reason to exist |
| a helper, slot, schema, type or second declaration in `plugin.ts` | `plugin.ts` is read to learn what the plugin is, at a glance |
| `slot(...)` outside `slots.ts` | the slots a plugin offers are one list |
| a `module.ts` or a `"level": "domain"` package outside `data/<module>/` | a plugin's data lives in one place |
| anything in `index.ts` but `export … from` | the entry hides nothing |

## Example: apps

`plugins/apps` declares `AppsSlot` (`{ id, title, icon, view }`) and owns `AppsModule` (`plugins/apps/data/apps`, `@sumi/apps`): the core starts it with the plugin's own fills, and `AppsQuery` answers the apps a workspace has. The plugin fills the host's `TabPageSlot` with the page that draws an app's view. `plugins/terminal` requires it and fills `AppsSlot` with the Terminal. The shell's menu reads `AppsQuery`; nothing reads `AppsSlot` but the apps plugin.

TODO: places' tabs (open, closed, history) move into the apps plugin; decided with the user, not started.
TODO: `app-host` (`packages/domain`) imports `@sumi/apps` until the shell's tabs move into the apps plugin.
