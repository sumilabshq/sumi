# Plugins

The code is moving to this model; a package not moved yet has the older shape in [legacy.md](legacy.md#the-older-plugin-shape).

A plugin is the view, a module is the logic and the data, and each is its own package named by `name` in its `package.json`. A plugin lists the modules and plugins it uses by that package name, takes their types through a type-only import, and the host checks every name at start.

Two frameworks, two jobs. **`@widgetarium/data-framework`** carries every piece of data: modules, requests (queries, commands, events), transports ([requests.md](requests.md)). **`@widgetarium/plugin-framework`** says what is switched on, who builds on whom and what each plugin offers the others: plugins, services and the plugin runtime with its per-workspace state. Neither imports the other; Sumi joins them: the state reaches the runtime through `PluginStateStore`, a reader and writer the host implements over its store.

## Two things

|             | Plugin                                              | Module                                       |
| ----------- | --------------------------------------------------- | -------------------------------------------- |
| Is          | the view: blocks, slots, tab pages                  | the logic and the data: requests, storage    |
| Runs        | in each window                                      | once per workspace, in the core or a server  |
| Owns data   | never; view state only                              | all of it, as the one writer                 |
| Depends on  | modules, for data; plugins, for slots and their API | modules                                      |
| Replaced by | another plugin filling the same slots               | a package that declares it replaces this one |
| Folder      | `plugins/<name>/`                                   | `modules/<name>/`                            |

A plugin never starts a module and never imports its implementation. Switching a plugin off stops its views and leaves every module and its data as they were. A plugin depends on another plugin only for its slots and its API.

## Identity

**One name: `name` in `package.json`, scope included (`@sumi/tasks`, `@sumi/chat-plugin`).** Dependencies, `app.use(…)` and links all write it whole.

- **The version is `version` in `package.json`.** A plugin states the range it works with in `peerDependencies`.
- **`plugin()` and `module()` take no string.** `data-framework generate` reads the name from `package.json`, so it is written in one place.
- **No other id exists.** No id file, no generated id, no short name beside the package name.
- **Unique** in a registry once published; before that, by its author's scope. Two installed packages of one name cannot exist: the package manager keeps one.

## Replacing

A package takes another's place by saying so in its own `package.json`:

```json
{
	"name": "@acme/tasks-sqlite",
	"widgetarium": {
		"level": "domain",
		"replaces": "@sumi/tasks"
	}
}
```

Once it is installed, everyone who asks for `@sumi/tasks` gets it; `@sumi/tasks` itself need not be installed. Nothing that depends on `@sumi/tasks` changes.

## A plugin

**Dependencies are written once, in `package.json`.** The code names a package only where it uses it.

```json
{
	"name": "@sumi/tasks-plugin",
	"version": "0.2.0",
	"peerDependencies": {
		"@sumi/chat-plugin": "^0.1.0",
		"@sumi/files": "^1.0.0",
		"@sumi/tasks": "^1.0.0"
	},
	"peerDependenciesMeta": {
		"@sumi/files": {
			"optional": true
		}
	},
	"devDependencies": {
		"@sumi/files": "1.0.0"
	},
	"widgetarium": {
		"level": "plugin"
	}
}
```

```ts skip-check
import { plugin } from "@widgetarium/plugin-framework";
import { LiveTaskRows } from "./features/chat-tasks/ui/live-task-rows/live-task-rows.js";

export const tasks = plugin().apply((app) => {
	app.use("@sumi/chat-plugin").slots.liveRows.add(LiveTaskRows);
});
```

| Written                                   | Means                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| in `peerDependencies`                     | the plugin does not start unless that package, or its replacement, is installed              |
| also `optional` in `peerDependenciesMeta` | starts without it; `app.use(name)` answers `null`                                            |
| `devDependencies`                         | only the optional ones: a package manager does not install those for types                   |
| `app.use("@sumi/tasks")`                  | the contract of a module, or the slots and API of a plugin; the package's `level` says which |
| `.requireServices("shell")`               | a capability the host provides; it is no package                                             |

A view reads a module the same way: `useModule("@sumi/tasks")` answers the contract, and `useQuery(tasks.tasks.all)` stays as it is. A module uses another by the same rule: it lists it in `peerDependencies`, and a handler sends through its contract.

| Piece                                          | Is                                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export const chat = plugin()`                 | a plugin; its name is `name` in its `package.json`                                                                                                                              |
| `.apply((app) => api)`                         | runs once at start, after everything it builds on; `app.use(name)` answers a dependency's API (`null` for an optional one that is off); what `apply` returns is its API         |
| `runtime().alwaysOn(...).state(store).start()` | the plugin runtime, one per workspace: reads the installed packages, checks, enables, orders and applies the plugins; answers `startedIds`, `refusals` and `notes`              |
| `src/generated/plugin.ts`                      | written by `data-framework generate` ([Types](#types))                                                                                                                          |
| `sumi.plugins.json`, `PluginStateStore`        | per workspace, owned by the runtime and written through the host's store: `{ "v": 1, "plugins": { "<name>": { "enabled": boolean } } }` ([The plugin state](#the-plugin-state)) |

- **An API is plain functions.** A plugin keeps what others hand it in its own arrays. Data meant for a module goes to that module by a command ([What a plugin hands a module](#what-a-plugin-hands-a-module)). No schema guards an API: TypeScript types it.
- **Calls happen inside `apply`.** After start every API is closed: a later call throws `X.method was called after start: call it inside apply`.
- **Using what was not listed is refused.** An unlisted name in `app.use` is a type error and refuses the plugin; so does a required service no host provides.
- **Refusals spread.** A plugin refused (its `apply` threw, a requirement is missing or off, a cycle) does not start, and every plugin requiring it is refused too, each naming why. Every cycle is refused, optional ones included: `plugin X optionally uses Y, which uses it back`.

## Types

`data-framework generate` reads `package.json` and writes everything else into `src/generated/plugin.ts`:

```ts skip-check
import type {} from "@sumi/chat-plugin";
import type {} from "@sumi/files/contract";
import type {} from "@sumi/tasks/contract";
import { pluginWithSlots } from "@widgetarium/plugin-framework";
import { tasks as definition } from "../plugin.js";

export const tasks = pluginWithSlots(definition, {
	required: ["@sumi/chat-plugin", "@sumi/tasks"],
	optional: ["@sumi/files"],
});
```

- The type-only imports are erased at build, so no code of another package is linked.
- A package's generated file registers its name, so `app.use` autocompletes exactly what `package.json` lists. An unlisted name is a type error, an optional one is typed `| null`.
- The host reads `required` and `optional` at start.

## Installing

Everything installed lives in one Sumi-owned folder, created by Sumi, never by the person:

```
~/.sumi/plugins/
├── package.json      Sumi writes it: what is installed, npm workspaces over local/*
├── node_modules/     one copy of everything
└── local/            plugins the person created
    └── my-plugin/    package.json, src/plugin.ts
```

One command, any source; the package manager links the package into the workspace, so the type-only import resolves for all of them. The value in the root `package.json` is the source:

| Source     | Value                            |
| ---------- | -------------------------------- |
| a registry | a version, `^1.2.0`              |
| Git        | `github:acme/tasks-sqlite#<sha>` |
| a folder   | `file:../tasks-sqlite`           |

- **A plugin's own `package.json` never holds a local path,** so it can go to Git as is.
- **A local plugin needs no `node_modules` of its own:** type-checking from its folder and Node resolution both find packages in the root `node_modules` (verified on a demo).
- **npm only warns on a peer version mismatch,** so the host's start check is what refuses it ([At start](#at-start)).
- **A Sumi workspace stores only which plugins are on or off,** in `sumi.plugins.json` ([The plugin state](#the-plugin-state)).
- **`peerDependencies` is used because a module must exist once and be shared;** a normal dependency would bring a private copy.

## At start

1. The host lists the installed packages, their names, versions and `replaces`.
2. It starts every module some enabled plugin requires, once, whoever asked, from the module's declaration.
3. It applies the plugins in dependency order.

| Found                                           | The host                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| a required name not installed and not replaced  | refuses the plugin, naming the package                                     |
| an optional name not installed and not replaced | answers `null`                                                             |
| a package and one replacing it, both installed  | uses the replacement                                                       |
| two installed packages replacing one name       | refuses the start, naming both, until one is switched off in the workspace |
| an installed version outside the plugin's range | refuses the plugin, naming both versions                                   |

## Names on the wire

A package name may hold `@`, `/`, digits and dots, so `#` separates it from the path inside the package.

| Thing       | Name                               |
| ----------- | ---------------------------------- |
| a request   | `@sumi/tasks#tasks.create`         |
| a slot      | `@sumi/chat-plugin#composer-model` |
| an MCP tool | `task-work_tasks_create`           |

- **A replacement answers under the name it replaces.** `@acme/tasks-sqlite` serves `@sumi/tasks#tasks.create`, so no caller and no stored key changes.
- **An MCP tool keeps a short name.** MCP allows only letters, digits, `_` and `-`, up to 64 characters (`mcp-tools.ts`), so the tool takes the package name without its scope. Two modules of one short name in one MCP server are refused.

## What a module needs from the host

A module names the host capabilities it needs, with the verb a plugin uses, and the host hands them over when it starts the module:

```ts skip-check
export const tasks = module()
	.on(Server)
	.requireServices("file")
	.guard(PublicGuard)
	.provide(({ services }) => tasksPartsOn(services));
```

## What a plugin hands a module

A list a module keeps, such as the apps of a workspace, is filled by a command of that module, sent from `apply`. The registration is reversible: when the plugin stops, its entries leave.

```ts skip-check
app.use("@sumi/apps").apps.register({ id: "tasks", title: "Tasks", art: "tasks" });
```

- **Data goes to the module, the view stays in the plugin.** `apps.app({ view })` splits: the entry is registered, the component is drawn through a slot.
- **The key is the plugin's name and the entry's id,** so a restart registers nothing twice.
- **No new mechanism:** it is an ordinary command over the same transport.

## UI slots

A plugin marks a place in its own view where other plugins may draw. Slots exist only in the UI; data goes through the API.

```tsx skip-check
<PluginSlot name="@sumi/chat-plugin#composer-model" props={{ chatId }}>
	<DefaultModel />
</PluginSlot>
<ListPluginSlot name="@sumi/chat-plugin#composer-badges" props={{ chatId }} />

app.use("@sumi/chat-plugin").slots.composerModel.replace(ModelPicker);
app.use("@sumi/chat-plugin").slots.composerBadges.add(UsageBadge);
```

| Element            | Filled with                                                                | Draws                                                                            |
| ------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `<PluginSlot>`     | `.replace(Component)`, one plugin; a second replacement refuses its plugin | the replacement with the slot's `props`, else its children                       |
| `<ListPluginSlot>` | `.add(Component)`, any number of plugins                                   | every added component with the slot's `props`, in apply order, else its children |

- **Named under the owner.** `name` is `"<package name>#<slot>"`, a string literal in a `.tsx` of the owning plugin; `data-framework generate` reads every slot element there and writes `slots: { composerModel: pluginSlot<…>("@sumi/chat-plugin#composer-model"), … }` into `src/generated/plugin.ts`. A name under another package's name, one name drawn twice, or `props` that is not an object literal is refused.
- **Typed by the generator.** A typo in `slots.composerModl` or `.add` on a single slot is a type error; a component must take only the keys of `props`. TRADE-OFF: each prop is typed `never`, so the value types are not checked: reading them needs the type checker.
- **Filled inside `apply`.** A call after start throws `slot @sumi/chat-plugin#composer-model.replace was called after start: call it inside apply`; the fills of a plugin whose `apply` fails are dropped.
- **Drawn through context.** `runtime().start()` answers `slotFills`; the studio window passes them in `PluginSlotsContext` (`@widgetarium/plugin-framework/react`), and every slot element under it reads its own. `tools/plugin-slot-checks.ts` renders each case.

## A module owns its data

**The rule.** A module owns its data and is its one writer. A plugin is the view and owns none: only view state and what other plugins hand it through its API. Anyone who needs the data reaches it through the module's queries, commands and events; a plugin that needs a module lists it in `peerDependencies`.

**The host knows no plugin.** `apps/tauri` and `apps/studio` start the plugin runtime, provide the host services, start the modules enabled plugins list and draw what plugins register through the services. They never read another plugin's API or configure a module with its data. It happened once: `appHost({ apps })` took the apps list from the host, and it was rewritten.

The services are declared in `plugins/sumi-host` (`src/shared/lib/host-services.ts`); `apps/studio/src/plugins/host-services.ts` provides them and collects every registration into `ResolvedPlugins`. A plugin asks for one with `.requireServices(…)`. The `backend` and `windows` services, through which a plugin started modules, are gone: the host starts a module from its declaration.

| Service  | Call                                                  | The host                                                                                                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell`  | `tabPage({ page, header, draws(app) })`               | draws `page` for the first registration that `draws` the tab's app, inside an app over the tab's frame routes; `header: "shell"` puts the shell's `AppHeader` above it                                                                                                                   |
| `shell`  | `layer(component)`, `provider((offers) => component)` | draws the layer over the studio frame; wraps the frame and its layers in the provider, built once per window                                                                                                                                                                             |
| `agents` | `mcpServer((offers) => server)`                       | builds the MCP server in each studio window from the window offers and hands it to the agents that window starts: each turn's agent gets every registered server, its tools allowed by server name, and every call carries the turn's headers (`sumi-chat`, `sumi-folder`, `sumi-model`) |

The window offers (`WindowOffers`) are `workspaceId`, `platform`, `windowApp`, `core`, `windowServer` and `focusedChatId()`. A window also lends any drawn plugin, through `@sumi/sumi-host-plugin`, `AskComposerContext` (the chat composer), `TabFaceContext` (a tab's art) and `OPENS_LAYER_MARK` (an element that opens a layer, so a press on it is not a press outside).

`tools/plugin-framework-checks.ts` and `tools/plugin-apply-checks.ts` hold each rule, and each was broken on purpose once.

## The plugin state

`sumi.plugins.json` belongs to the runtime; the host only reads and writes it through `PluginStateStore` (`keptPluginState()`, `initialEnabledIds()` and `initialSource`, `queuePluginStateSave(state, reason)`), in the workspace's folder of the store. It holds only which plugins are on or off, keyed by package name. Its version is the store's own `v`; the file carries no other.

- **A plugin the state does not list starts enabled**, and its entry is written. A plugin no longer installed keeps its entry; one still marked enabled is a note (`notes`, logged at info by the core on each start), never a refusal.
- **Fields this build does not know are kept.** The file and each entry are read loose, and a write keeps every field it read.
- **The first start changes nothing for the person.** With no state file the runtime seeds it from `initialEnabledIds()`, and the save names `initialSource`: the host answers the workspace's old `sumi.profile.json`, or the built-in profile without one, so the enabled set is the one the profile gave. A profile that is unreadable, kept aside or of another shape seeds from the built-in profile, logged as an error; once the seeded file is written the host logs that `sumi.profile.json` is superseded.
- **Always-on plugins cannot be disabled.** `.alwaysOn(...)` plugins start whatever the state says; an `enabled: false` on one is set to `true` in the next save, whose reason logs it.
- **A newer state is read, never written.** A file of a newer `v` is read as far as this build understands it; `queuePluginStateSave` logs "newer state kept, not written" instead of writing.
- **A state that cannot be parsed resets, loudly.** A file the store kept aside as unparseable is treated as missing and reseeded, and the host logs an error naming the copy kept aside and that the choices were reset. The core and the window read it in turn (the first is told it was kept aside, the second finds none), and both seed the same set. A state the store cannot read at all, or of a shape this build does not read, fails the start with the reason: the core answers every call unreachable and the window shows the failure with a retry.
- **A save that loses the rev race** re-reads the file and logs the plugins it computed → the ones stored, when they differ.

## How Sumi runs them

1. `startSumiPlugins(state)` (`apps/studio/src/plugins/sumi-plugins.ts`) starts the plugin runtime for a workspace with the host services; every `apply` registers through them.
2. The core window starts the host capabilities (files, terminal), then every module an enabled plugin lists, from its declaration, and serves them per workspace over IPC.
3. Each studio window imports the core's contracts, wraps its frame in every `shell.provider` and draws every `shell.layer`.
4. A tab draws the `shell.tabPage` that draws its app.

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
```

A plugin has no `data/` folder: it owns no data. A module is `modules/<name>/`, a data module package ([placement.md](placement.md#a-data-module)).

**Groups.** Plugins of one area may stand in a group folder, `plugins/<group>/<name>/`: a folder with no `package.json` and no `src/` that holds only plugin folders. `plugins/ai/` groups the agent and its chat (`chat`, `mcp`, `questions`, `composer-expand`, `slash-commands` and the composer options `permission-mode`, `plan-usage`, `model-picker`, `effort-picker`). A group is a place on disk only: it is no plugin, owns nothing and is named nowhere in code. The root `package.json` lists `plugins/<group>/*` as workspaces.

Apart from `plugin.ts`, `index.ts` and `generated/`, `src/` is a client package's inside ([placement.md](placement.md#a-client-package), [views.md](views.md)): one file per thing, each where its kind and its users put it.

| Breaks the layout                                                                         | Because                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| no `src/plugin.ts`                                                                        | a plugin folder without its plugin has no reason to exist    |
| a helper, schema, type or second declaration in `plugin.ts`                               | `plugin.ts` is read to learn what the plugin is, at a glance |
| a `module.ts` or a `"level": "domain"` package inside a plugin                            | a plugin owns no data: a module is `modules/<name>/`         |
| anything in `index.ts` but `export … from`                                                | the entry hides nothing                                      |
| any other file or folder at the top of `src/` but `features/`, `shared/` and `generated/` | a flat heap hides which feature a file serves                |
| anything in `src/generated/` but `plugin.ts`                                              | `generated/` holds only what the generator writes            |
| a feature or `shared/` holding anything but `ui/` and `lib/`                              | a file's kind decides its folder                             |
| a file loose in `ui/`, or anything but `.tsx` and `.css` in `ui/<block>/`                 | a block and its sheet stand together, hooks go to `lib/`     |
| a folder, a `.tsx` or a `.css` in `lib/`                                                  | `lib/` is flat `.ts`; what is drawn is a block               |
| a file outside `features/<f>/` importing `features/<f>/lib/` (`plugin.ts` excepted)       | a feature's lib is its own; what two features use is shared  |

A feature may draw another feature's block; it never imports another feature's `lib/`. Which feature a file belongs to, and whether a `shared/` file really serves two, is the `plugin-layout-reviewer`'s call.

## MCP

Every `.public()` request of a module an MCP server serves is a tool, named by its short name with dots → `_` (`task-work_tasks_create`) and described by `metadata.description` (`mcpServerOf`, [requests.md](requests.md)). A server name is lowercase letters, digits and `-`, so an agent allows it as `mcp__<name>`. `AgentCallAuthenticate` turns the relay's `sumi-chat` header into `user`, so a tool module guards with `AuthenticatedGuard` and reads the asking chat as `user.id`. A tool name past 64 characters is refused.

The relay (`apps/tauri/src/agent/agent-relay.ts`, `apps/tauri/src-tauri/src/agent/`) knows no server: the window tells the Rust hub the names it serves, each agent turn gets one `--mcp-config` entry per name (the Sumi binary in `--mcp --server <name>` mode, with the turn's chat, folder and model), and every JSON-RPC message passes through unchanged to that server's `answer`. The same socket serves a terminal: `widgetarium-host-tauri --open <link> [--new-tab]` asks the window to open a link through `appHost.links.openLink`, and `--mcp --server <name> --chat <id>` with no `--socket` and `--token` finds the app's socket and the owner-only token file it writes beside it at start (`~/.sumi/agent-tools.token`). TODO: servers from a file (GitHub, Jira) with no plugin.

## Open

| Question                                                                                            | Why it blocks                                                         |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| whether a stored done key or saved state holds an old wire name                                     | the rename to `@sumi/tasks#…` must not lose them                      |
| what proves a replacement keeps the contract                                                        | equal types do not mean equal behaviour                               |
| build scripts of a package installed from Git                                                       | they run on the person's machine                                      |
| the order of the move                                                                               | `test:plugin-layout` changes with the folders, in the same change     |
| where a module runs (core, each window, a server) and how it gets its `.config` and offers          | `backend` and `windows` told the host; a declaration must now say it  |
| which modules a tab page needs running, and how a module is served to app frames                    | `tabPage` took `modulesOf` and `shell.frameModule` started a module   |
| how a plugin names the modules of its MCP server                                                    | it handed them to `agents`, and a plugin starts none                  |
| how a workspace chooses between two packages replacing one name                                     | only on or off is stored, so the choice can only be switching one off |
| how `.alwaysOn(...)` and the built-in list meet the installed packages                              | the runtime took a fixed list; the host now lists what is installed   |
| the slot through which the apps plugin draws the view of an app another plugin registered in `apps` | `apps.register` carries data only; the view needs a place             |

## Prior art

| Source           | Taken                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Cordis, Koishi   | `inject` lists names as strings; types by a type-only import. Not taken: its short service names beside the package name  |
| DeepSeek Harness | a plugin is a package installed from a registry, Git or a folder by one command; its identity is `name` in `package.json` |
| npm              | a scope is the author; a published name and version are never reused                                                      |
| Backstage        | plugins meet over the wire; a service can be replaced by another implementation                                           |
