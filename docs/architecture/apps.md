# Apps

Sumi is a shell. Every page a person opens (chat, tasks, canvas, terminal, a browser page) is an app: its own repository, runnable alone in a browser, plugged into Sumi through a registry, and speaking to Sumi only through `@sumi/contract`. The design behind this page, with the prior art it rests on, is https://claude.ai/artifact/Y1WxRtpr7h227vGYjpTEY9; where they disagree, this page wins.

> Status: the repositories and `@sumi/contract` 0.3 exist. Everything marked **planned** is not built yet.

## The repositories

```
~/Projects/Sumi/                  not a repository: the folder that holds them
  pnpm-workspace.yaml             dev only: links every repository's packages by name
  sumi/                           this repository: the shell (a link to it)
  packages/                       built tarballs apps install outside the workspace (@sumi/contract)
  sumi-framework/                 planned: core (requests, modules, transports), cli, vite, eslint-plugin
  sumi-kit/                       planned: the reusable UI every app imports
  sumi-tasks/  sumi-canvas/  sumi-chat/  sumi-terminal/  sumi-browser-page/
```

An app repository is a pnpm workspace: `packages/domain/*` holds its modules, `apps/*` its frontend. `sumi-app.json` at its root is its manifest.

**What stays in the shell:** Places (tabs, address, history, title, favicon), workspaces, the page frame, the event bus, the app installer (install, update, roll back), and every native power: the Rust core, the terminal pty, browser webviews, the agent runner, the file store. **Only the shell imports Tauri.** An app reaches a native power through a request of a shell module `@sumi/contract` lists (`file-system`, `terminal`), never by importing `@tauri-apps/api`.

**Developing across repositories needs no publish.** `pnpm install` in `~/Projects/Sumi` links `@sumi/contract` from the shell's `packages/shared/contract` (and later the framework and kit) into every repository that depends on it, by package name; `npm pack` of the built contract into `~/Projects/Sumi/packages/` is the self-contained copy an app outside the workspace installs; an edit in one shows in the next run of another. npm is for releases. The shell joins the dev workspace when it moves from npm workspaces to pnpm (**planned**, with the framework extraction).

## The contract

`@sumi/contract` is `packages/shared/contract` in the shell. It holds three things and nothing else:

| File                     | Holds                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `index.ts`, `generated/` | written by `widgetarium generate` from `sumi-contract.json`: each listed module's generated contract |
| `manifest.ts`            | `AppManifestSchema`, `defineApp`, `APP_MANIFEST_FILE` (`sumi-app.json`)                              |
| `version.ts`             | `CONTRACT_VERSION`, `CONTRACT_RANGE`, `contractRefusal(appRange, sumiVersion)`                       |

`sumi-contract.json` lists the shell modules an app may call: `["file-system", "terminal", "places", "web-page", "assistant"]`. The generator copies each module's `"."` contract (requests and schemas, no handler, imports only `zod` and `@widgetarium/core/requests`) into `generated/<module>.ts`, so the built package is self-contained: its runtime peers are `@widgetarium/core` and `zod`. `npm run generate -- --check` fails on a stale copy. The transport is the framework's ([requests.md](requests.md#the-frame-transport)); an app writes:

```ts skip-check
const sumi = messagePortTransport(portFromParent());
const tasks = app().imports(FileSystemModule.over(sumi), PlacesModule.over(sumi)).start();
```

There is no message vocabulary between Sumi and an app: everything an app asks is a command or a query of a listed module.

| Module        | Requests                                                                                                                                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file-system` | `ReadFileQuery`, `ReadFolderQuery`, `FileInfoQuery` (answers a missing path), `WriteFileCommand`, `AppendFileCommand`, `MakeFolderCommand`, `RemoveCommand`, `RenameCommand`, `CopyCommand`                                                                                                                                                                   |
| `terminal`    | `SendTerminalCommand { line }` (typed into the app's own shell session, then Enter; the line is never altered), `TerminalOutputQuery` (the last 256 KiB, running, exit code)                                                                                                                                                                                  |
| `places`      | the whole module is imported; `AppCallersGuard` lets an app call only `OpenTabCommand`, `RecordAppPageCommand` and `AppTabQuery`, and `OwnsAppTabGuard` only for a tab that holds that app                                                                                                                                                                    |
| `web-page`    | `OpenWebPageCommand { tab, url }` (http and https only), `PlaceWebPageCommand { tab, area: { x, y, width, height } \| null }` (the frame's own CSS pixels; `null` hides), `GoBackCommand`, `GoForwardCommand`, `ReloadWebPageCommand`, `CloseWebPageCommand` `{ tab }`, `WebPageQuery { tab }` → `{ url, title, isLoading, canGoBack, canGoForward } \| null` |
| `assistant`   | the chat of the tab's address; `AssistantCallersGuard` lets an app call only what a chat view needs, never a folder picker or folder lending (`pick-working-folder`, `choose-working-folder`, `attach-folder`)                                                                                                                                                |

**Paths.** A relative path resolves inside the app's own folder, `<appData>/app-data/<app id>/` (`placedPathOf`); a path climbing out of it is refused; an absolute path is taken as given for now. **Watching** is not a request: every write invalidates the three read queries, which reach the frame through the transport's `changes` (TODO: invalidating only the written path, and changes made outside Sumi).

**Permissions are later; the seams are there.** Each module runs `AuthenticatedGuard`, then `FileAccessGuard` / `TerminalAccessGuard`, which allow every app everything today, then a middleware logging app, request and paths (`[file-system] app notes → file-system/write-file ["tasks.json"]`). Refusing `rm` or limiting folders is one guard.

**Where the work happens.** In Tauri the core window serves both modules: `TauriFilesGateway` calls the Rust plugin `files` (`src-tauri/src/files.rs`, studio windows only), `TauriTerminalSessionsGateway` opens one pty per app through `terminal.rs`, whose end now carries the exit code. The browser studio serves memory gateways; `NodeFilesGateway` and `NodeTerminalSessionsGateway` serve the end-to-end test.

**Routes: who serves a frame.** The relay is built per frame mount from `routesFor({ app, tabId })` (`frameRoutesOf`, `apps/studio/src/tabs/frame-routes.ts`), each route a module contract and the transport serving it; a call goes to its module's route, a change reaches the frame only for that route's queries. `file-system`, `terminal` and `places` go to the core. `web-page` and `assistant` are served inside the studio window, `server().modules(...).listen(localTransport())` with `AppCallerAuthenticate`:

- **`web-page`** owns no page itself. `WebPageAccessGuard` asks Places, through the studio app's `AppTabQuery`, whether the tab holds the calling app. In Tauri the studio lends `nativeWebPagesOver(studioApp)`: it sends the browser module's `OpenPageCommand`, `OpenAddressCommand`, `GoBackCommand`, `GoForwardCommand`, `ReloadPageCommand`, `ClosePageCommand` and `BrowserTabsQuery` keyed by the app's tab id, and places a hole element over the frame at the asked area with `AttachPagesCommand { host, heldTabId: tab }`, so the browser module stays the one owner of native pages. The browser studio and the tests use `MemoryWebPagesGateway`, a fake that keeps history and titles a page by its host. A page change re-reads `WebPageQuery` through `WebPagesChangedEvent` and `RereadWebPageSubscriber`.
- **`assistant`** is `.on(Anywhere)`: the studio still runs it in its chat apps, and `FrameChatServers` serves it for frames, one server per chat id over `portForChat`, started for the first frame and stopped after the last. The chat id is the tab's address without its leading `/`, read once when the port is handed, by the shell, with no app header; a tab with no address gets no assistant route.

**The tab.** The shell opens the frame at `<pageUrl>#sumi-tab=<tab id>`; the app reads its address with `AppTabQuery { id }`, re-reads it on a change (back and forward in Places), and records its address, title and favicon with `RecordAppPageCommand`.

**Versioning: one number, additive only.** Within a major the contract only grows: a new module, request or optional field; nothing is renamed, removed or narrowed. An app's manifest names the range it was built for, `contract: "^0.3"`; `contractRefusal` answers it against what Sumi speaks. Before 1.0 a minor is a breaking line. 0.3 replaced the 0.2 message protocol; 0.3.1 added `web-page` and `assistant`.

**Two gates.** Before install and on an update check, the app installer refuses a release whose `contract` range Sumi does not satisfy (`gatedManifestOf` in `packages/state/app-installer`). TODO: a runtime check for a dev server, which never passed the install gate.

**An app cannot pretend to be another app.** The shell decides who a frame is when it creates it: `servePortHandovers` answers only a handover wanted by that frame, and the relay stamps the app id the shell opened there; nothing the app sends names its caller.

**A failure reaches both people.** A refused or failed call answers the app with its code and reason; the full error goes to the core's `reportFailure`.

`npm run test:sumi-contract` runs the version gate, the manifest, a call over a `MessagePort`, every module over memory gateways or a fake `AssistantPort`, the assistant allow-list and the chat servers' lifetime; `npm run test:contract-frame` runs a tiny app in a real sandboxed iframe in headless Chrome that writes and reads a file and types a line into a real `/bin/sh` (the core, a node server), then opens a web page and chats through routes served in the shell page by `frameRoutesOf` (the memory fake browser and an echoing fake port: no native page and no real agent).

## Modules and the bus

An app's manifest lists its modules: `modules: [{ name, runs: "page" | "background" }]`. The app's code never names the shell's modules; it sends contract messages, and the shell wires each module to the one bus. Background modules run in the shell's hidden core window, all in one for now (**planned**; splitting them into separate processes is a later decision).

**MCP is a transport** (**planned**). A framework server already listens on several transports (`server().modules(...).listen(transport)`, [requests.md](requests.md)); `mcpTransport()` is one more, so every public request of a module becomes an MCP tool with no MCP code in the app. The shell serves one MCP endpoint for any provider (Claude Code, Codex…), tools named by app (`tasks.create_task`), each app switchable on and off. A manifest says `mcp: true`; there is no second registry for MCP.

The chat's sub-tabs under a chat stay drawn by the shell's own code until apps can contribute UI.

## Registry, install and updates

> Built: folder sources, install, the update check on a press, switch, rollback, the frame. **Planned**: GitHub sources, signatures, checks at start and every few hours, the setting that turns updates off, grants.

**The registry** is the list of apps Sumi may install: `<appData>/apps/registry.json`, `{ "apps": [{ id, source }] }`, written by the person; absent means empty. A source is a GitHub repository (`{ kind: "github", repository: "owner/sumi-tasks" }`, refused with "installing from GitHub is not built yet") or a folder on this machine holding a built release (`{ kind: "folder", path: "/Users/…/sumi-tasks/dist" }`). Its schema lives in the shell (`RegistryRowSchema`), because only the shell reads it. A registry that does not parse, or names an id twice, answers with a `problem`, never as an empty list in silence.

**A release** is a folder: `sumi-app.json`, `sumi-release.json` (`{ app, version, files: [{ path, sha256, size }] }`, every file but itself) and the files. `tools/app-release.ts <folder>` lays `sumi-release.json`; an app repository runs it after its build. `tools/fixtures/hello-app/src` is a hello app; `buildHelloReleases` in `tools/hello-app-build.ts` builds three releases of it (1.0.2 never sends `ready`) into a temp folder each time `test:app-installer` runs, so they always carry the contract range Sumi speaks.

**Sumi never runs an app from its source.** Installing reads the source's built release, checks it, and copies it into Sumi's own folder; the source folder or repository is only where a version comes from:

```
~/Library/Application Support/<Sumi app id>/apps/
  registry.json       written by the person, read only
  store.json          written only by the Rust app installer: current, previous, failed versions
  tasks/1.0.0/        immutable once written
  tasks/1.0.1/
```

The app id is `app.widgetarium.studio` today (`tauri.conf.json`); renaming it moves this folder and every workspace file, so the rename carries a migration.

**One writer.** The Rust plugin `apps` (`apps/host-tauri/src-tauri/src/app_installer/`) owns `store.json` and the version folders: `registry`, `installed`, `inspect`, `install` (checks each listed file's size and sha256, the ids and versions, copies, renames; an app's first install is current), `switch`, `fail` (a failed version never becomes current; failing the current one brings `previous` back). `@widgetarium/app-installer` (`packages/state/app-installer`) is the shell's side: `AppRegistryQuery`, `InstalledAppsQuery` (versions and the current manifest, read through `sumi-app://`), `InstallAppCommand` (registry row → `inspect` → contract gate → `install` with the `manifestSha256` inspect answered), `UpdateAppsCommand` (installs each newer release that passes the gate, then switches to it), `SwitchAppVersionCommand`, `FailAppVersionCommand`, `RetryAppVersionCommand`, each logging the `{ was, now }` Rust answers. The tauri gateway parses every answer (`.strict()`), the registry and the fetched manifest. It keeps no copy: every answer is re-read from Rust, and a Rust refusal reaches the person as a refusal (`ran: false`). The ids of pages Sumi draws itself (`canvas`, `browser`, `terminal`, `chat`, `app`) cannot be installed; `tasks` can, and an installed `tasks` replaces the built-in Tasks page (`AppFace.isBuiltIn`, `appPageOf`).

**A tab of an installed app.** Places keeps any app id matching `^[a-z][a-z0-9-]*$` (`AppKindSchema`): a built-in is drawn by the shell, any other id by `InstalledAppPage` (`apps/studio/src/features/app-frame`). An id that is not installed draws a missing-app state naming it, with Install when the registry lists it. The page is `<iframe sandbox="allow-scripts allow-forms">` (`APP_FRAME_SANDBOX`) at the `pageUrl` the installer answers (`sumi-app://<id>/<version>/<ui>`), with `#sumi-tab=<tab id>` and served by the relay ([The contract](#the-contract)): the app records its address, title and favicon with Places' `RecordAppPageCommand`, whose `AppPageSchema` bounds the title (200), the address (2 048) and the favicon (`data:image/…` up to 64 KiB or `sumi-app://<the same id>/…`; another app's is dropped and reported), and reads where Places moved the tab with `AppTabQuery`. TODO: links from an app; `OpenTabCommand` is on the allow-list but needs `at` (window, view, screen), which an app cannot know, and app-host's `OpenLinkCommand` is a studio module the relay does not reach. The command menu lists installed apps by manifest name, "Install <id>" for each registry row not installed (registry ids stay known on purpose: a link to one opens the missing-app tab), and "Update apps"; links and the menu read one decision, `KnownAppsQuery`.

**Updates.** `AppFrameFleet` is the one owner of which frame runs which version. After a switch a frame reloads, shown or hidden, at the same address, because Places holds it. A frame is ready once the relay answers one of its calls ok; a version that has no ready frame in this session gets `READY_TIMEOUT_MS` (10 s), counted only while the frame is shown and the document visible; without one, the version is failed through `FailAppVersionCommand` and every frame reloads on the version now current. A refused or thrown fail is reported and forgotten, so the next failed start tries again. An app left with no current version offers "Try again" (`RetryAppVersionCommand`). `npm run test:app-installer` drives all of it in Chrome against the hello fixture over http.

**What keeps a frame from the IPC.** The frame runs in an opaque origin (no `allow-same-origin`), so `parent.__TAURI_INTERNALS__` and `top.__TAURI_INTERNALS__` throw and it has none of its own; the scheme's `Content-Security-Policy` (`app_installer/frame-policy.txt`, the one owner of that line) names neither `ipc:` nor `http://ipc.localhost` in `connect-src`. `npm run test:app-frame-sandbox` proves both in headless Chrome, the template's `sumi-app://{app}` filled and mapped to the test server's origin. Tauri treats any registered custom scheme as local (`tauri-2.12.4/src/webview/mod.rs:1978-1985`), so what keeps a frame out of IPC is the invoke key only the main frame's scripts hold (`webview/mod.rs:2010-2026`, `manager/webview.rs:161-166`) and the `null` Origin refused on the `ipc://` route (`ipc/protocol.rs:488-495`). Not verified in a real WKWebView.

## The Tasks app

`sumi-tasks` keeps its board in its own `tasks.json`: its page starts `@widgetarium/tasks` with host `file`, a `BoardFile` whose `read` and `write` are `ReadFileQuery` and `WriteFileCommand` over the frame transport. `FileTasksGateway` keeps `{ rev, board }` in the file (TRADE-OFF: the rev is read, then written; FileSystem has no compare-and-write yet). The shell's own tasks module, its `tasks.json` and the chat task lines are a separate board: the app no longer reaches them.

**The shell's own Tasks page stays** (`apps/studio/src/features/tasks`, the built-in `tasks` page) until the loaded app is proven in a real Tauri window: an installed, current `tasks` takes the tab (`AppFace.isBuiltIn`), and without one, or with every version failed, the built-in page is drawn.

## Order

| Step                                                                    | Done when                                                                                                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Folder, dev workspace, `@sumi/contract`                              | done: `pnpm test` and `pnpm check` in `sumi-contract` pass                                                                                                                        |
| 2. `sumi-framework` extracted with its history; the shell depends on it | the shell builds and starts                                                                                                                                                       |
| 3. `sumi-kit` extracted the same way                                    | the shell builds and starts                                                                                                                                                       |
| 4. App installer, `sumi-app://` loading, registry (GitHub or folder)    | folder sources done: the hello app installs, updates and rolls back (`test:app-installer`); GitHub planned                                                                        |
| 5. Tasks moves to `sumi-tasks`; contract 1.0                            | the board opens from the registry: the app installs and keeps its board in its own `tasks.json` through `file-system`; a real Tauri window, the domain moving out and 1.0 planned |
| 6. Canvas, terminal, browser page; chat last                            | each opens from the registry                                                                                                                                                      |
