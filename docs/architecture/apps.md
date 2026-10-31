# Apps

Sumi is a shell. Every page a person opens (chat, tasks, canvas, terminal, a browser page) is an app: its own repository, runnable alone in a browser, plugged into Sumi through a registry, and speaking to Sumi only through `@sumi/contract`. The design behind this page, with the prior art it rests on, is https://claude.ai/artifact/Y1WxRtpr7h227vGYjpTEY9; where they disagree, this page wins.

> Status: the repositories and `@sumi/contract` 0.2 exist. Everything marked **planned** is not built yet.

## The repositories

```
~/Projects/Sumi/                  not a repository: the folder that holds them
  pnpm-workspace.yaml             dev only: links every repository's packages by name
  sumi/                           this repository: the shell (a link to it)
  sumi-contract/                  @sumi/contract: messages, manifest, version gate
  sumi-framework/                 planned: core (requests, modules, transports), cli, vite, eslint-plugin
  sumi-kit/                       planned: the reusable UI every app imports
  sumi-tasks/  sumi-canvas/  sumi-chat/  sumi-terminal/  sumi-browser-page/
```

An app repository is a pnpm workspace: `packages/domain/*` holds its modules, `apps/*` its frontend. `sumi-app.json` at its root is its manifest.

**What stays in the shell:** Places (tabs, address, history, title, favicon), workspaces, the page frame, the event bus, the app installer (install, update, roll back), and every native power: the Rust core, the terminal pty, browser webviews, the agent runner, the file store. **Only the shell imports Tauri.** An app reaches a native power by asking the shell for it (`ask`), never by importing `@tauri-apps/api`.

**Developing across repositories needs no publish.** `pnpm install` in `~/Projects/Sumi` links `@sumi/contract` (and later the framework and kit) into every repository that depends on it, by package name; an edit in one shows in the next run of another. npm is for releases. The shell joins the dev workspace when it moves from npm workspaces to pnpm (**planned**, with the framework extraction).

## The contract

`@sumi/contract` (`sumi-contract/src`) is the only package both sides import.

| File                | Holds                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `messages.ts`       | every message both ways as zod schemas; `readAppMessage` / `readHostMessage`                                  |
| `serve-app.ts`      | `serveFrame({ shell, frame, app }, handlers)`, `serveApp(port, app, handlers)`: the shell's side of one frame |
| `connect.ts`        | `connect(identity)`, `connectOver(port, identity)`: the app's side                                            |
| `message-window.ts` | `MessageWindow`, the slice of `window` both sides use, so tests run without a browser                         |
| `manifest.ts`       | `AppManifestSchema`, `defineApp`, `APP_MANIFEST_FILE` (`sumi-app.json`)                                       |
| `version.ts`        | `CONTRACT_VERSION`, `CONTRACT_RANGE`, `contractRefusal(appRange, sumiVersion)`                                |

**Messages.**

| From  | Type                               | Meaning                                                      |
| ----- | ---------------------------------- | ------------------------------------------------------------ |
| app   | `hello`                            | the first message: app id, version, contract range           |
| app   | `ready`                            | the first render happened                                    |
| app   | `error`                            | an uncaught error, forwarded                                 |
| app   | `navigated`                        | the app moved (`push` \| `replace`); Places records the step |
| app   | `title`, `favicon`, `mark`         | what Places shows for the tab                                |
| app   | `open-link`                        | a link the app does not own (`here` \| `tab` \| `split`)     |
| app   | `busy`                             | unsaved work; an update waits while it is true               |
| app   | `notify`                           | something to tell the person                                 |
| app   | `ask`                              | a request to a shell service; answered by `answer`           |
| shell | `welcome` / `refused`              | the answer to `hello`                                        |
| shell | `show`                             | Places moved (back, forward, a link): draw this address      |
| shell | `theme`, `workspace`, `visibility` | changes                                                      |

**An event says what the app wants, never how Sumi does it.** `notify { title, body, level }` means "tell the person this"; when the shell changes how notifications are drawn, the event stays and no version moves. A message carrying the shell's internals (a sidebar row, a store key) is the defect this rule forbids.

**Versioning: one number, additive only.**

1. Within a major, the contract only grows: a new message type or a new optional field. Nothing is renamed, removed or narrowed; a message that must change becomes a new type (`notify-v2`) beside the old one.
2. Both sides drop a message type they do not know, silently. A known type with the wrong shape is reported (`onProblem` in the shell, the console in the app).
3. An app's manifest names the range it was built for, `contract: "^1.4"`. `contractRefusal` answers it against what Sumi speaks: `^1.4` runs on 1.7; `^1.9` on 1.7 asks for a Sumi update; `^1.x` on 2.0 asks for an app update. Before 1.0 a minor is a breaking line, so `^0.1` runs only on 0.1.x.

The contract is 0.x until the Tasks pilot runs through it in Sumi, then 1.0. The manifest is part of the contract and follows the same rules; it has no version of its own.

**Two gates.** Before install and on an update check, the app installer refuses a release whose `contract` range Sumi does not satisfy (`gatedManifestOf` in `packages/state/app-installer`); taking the newest release that fits waits for sources that hold more than one (**planned**). At runtime, `serveApp` checks `hello.contract` again, because a dev server never passed the install gate.

**The handshake.** The app posts `sumi:port-ask` to its parent window. `serveFrame` answers only an ask whose source is the frame it was given, with a fresh `MessageChannel` port posted into that frame alone; a reloaded frame asks again and gets a new channel, the old one closed. The app sends `hello` on the port and waits for `welcome` or `refused`. An app opened outside Sumi is told so at once, and one Sumi never answers gives up after `CONNECT_TIMEOUT_MS` (10 s) with a reason, never a silent wait.

**An app cannot pretend to be another app.** The shell decides who a frame is when it creates it: `serveFrame` is told the frame's app id, and the port goes only into that frame. A `hello` naming another app is answered `refused` and the port is closed; a second `hello` is ignored and reported; nothing the app sends before its `welcome` reaches the shell. The identity comes from the channel, never from what the app says, which is what will let the shell grant one app a power and refuse it to another (**planned**: no app has any grant today).

**A failure reaches both people.** A service that throws answers the app `"<service>" failed` and nothing more, because the app is untrusted code; the full error, stack included, goes to the shell's `onProblem`. Every `ask` is answered: a throwing service, an answer that cannot be sent and a closed connection all settle it with `ok: false`.

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

**A tab of an installed app.** Places keeps any app id matching `^[a-z][a-z0-9-]*$` (`AppKindSchema`): a built-in is drawn by the shell, any other id by `InstalledAppPage` (`apps/studio/src/features/app-frame`). An id that is not installed draws a missing-app state naming it, with Install when the registry lists it. The page is `<iframe sandbox="allow-scripts allow-forms">` (`APP_FRAME_SANDBOX`) at the `pageUrl` the installer answers (`sumi-app://<id>/<version>/<ui>`), wired with `serveFrame`: `welcome` carries the tab's address, the theme and the workspace; `navigated`, `title` and `favicon` are kept on the tab by Places' `RecordAppPageCommand`, whose `AppPageSchema` bounds the title (200), the address (2 048) and the favicon (`data:image/…` up to 64 KiB or `sumi-app://<the same id>/…`; another app's is dropped and reported); Places moving the tab sends `show`; an `ask` reaches `frameServicesOf` (`frame-services.ts`), which answers `storage` and refuses every other service by name; `open-link` runs app-host's `OpenLinkCommand` (`frame-link.ts`: `here` opens in place, `tab` and `split` in a new tab), which opens `sumi://` links and `https://` pages (a browser tab) and refuses any other scheme. The command menu lists installed apps by manifest name, "Install <id>" for each registry row not installed (registry ids stay known on purpose: a link to one opens the missing-app tab), and "Update apps"; links and the menu read one decision, `KnownAppsQuery`.

**Updates.** `AppFrameFleet` is the one owner of which frame runs which version. After a switch a frame reloads when its last `busy` was false, shown or hidden, at the same address, because Places holds it; a busy frame waits. A frame on a version that has not sent `ready` in this session gets `READY_TIMEOUT_MS` (10 s), counted only while the frame is shown and the document visible; without `ready`, or after an `error` before it, the version is failed through `FailAppVersionCommand` and every frame reloads on the version now current. A refused or thrown fail is reported and forgotten, so the next failed start tries again. An app left with no current version offers "Try again" (`RetryAppVersionCommand`). `npm run test:app-installer` drives all of it in Chrome against the hello fixture over http.

**What keeps a frame from the IPC.** The frame runs in an opaque origin (no `allow-same-origin`), so `parent.__TAURI_INTERNALS__` and `top.__TAURI_INTERNALS__` throw and it has none of its own; the scheme's `Content-Security-Policy` (`app_installer/frame-policy.txt`, the one owner of that line) names neither `ipc:` nor `http://ipc.localhost` in `connect-src`. `npm run test:app-frame-sandbox` proves both in headless Chrome, the template's `sumi-app://{app}` filled and mapped to the test server's origin. Tauri treats any registered custom scheme as local (`tauri-2.12.4/src/webview/mod.rs:1978-1985`), so what keeps a frame out of IPC is the invoke key only the main frame's scripts hold (`webview/mod.rs:2010-2026`, `manager/webview.rs:161-166`) and the `null` Origin refused on the `ipc://` route (`ipc/protocol.rs:488-495`). Not verified in a real WKWebView.

## Storage and the Tasks app

> Built: the `storage` service over the tasks board, the `sumi-tasks` app keeping its board through it, its release installing from a folder row. **Planned**: a `chats` service, storage for any other app or key, a change event.

**The `storage` service** (`@sumi/contract` 0.2) is `{ op: "read", key }` → `{ doc, rev }` and `{ op: "write", key, doc, baseRev }` → `{ ok, rev }` or `{ ok: false, why: "stale", rev }`. The app's side is `StorageClient`. The shell's side, `frame-storage.ts`, parses the ask with the contract's `StorageAskSchema` and routes it by app and key to one document: key `tasks` for app `tasks`, served by the tasks domain's `keptBoardDocOf(send)`. Any other app or key is refused (`Sumi keeps no "<key>" for <app>`). Every refusal, a rate limit included, is an answer the app reads; only a failure it cannot act on throws and reaches it as `"storage" failed`.

**One writer of `tasks.json`: the shell's tasks module.** A storage read is `KeptBoardQuery` (`{ board, rev }`), a write `ReplaceKeptBoardCommand` with the app's `baseRev`; both live in `packages/domain/tasks/features/storage` and go through the module's gateway, so the rev check is the gateway's (the Rust store's `baseRev` in Tauri). A write over a moved rev answers stale with the rev that won, and the app's own tasks module re-reads and runs the rule again. A board holds at most `MOST_TASKS` (5 000) tasks and a written one at most `MOST_BOARD_BYTES` (16 MiB); neither number is measured against a real board yet. Reads are limited to 1 200 a minute, because the app reads the whole board on every read of its own; writes to 60.

**A whole-board write keeps the task rules.** `refuseBoardReplace` (`shared/lib/board-replace.ts`) holds the written board against the held one: the next number never goes down, no task leaves the board, `chats`, `workplaces` and `owner` (facts of Sumi's chats) never change and a new task carries none, a status change passes `refuseMove` as the person's move, and a criterion never leaves its task and passes `refuseCriterionState` when it changes, the rule `CheckCriterionCommand` uses. A write over a moved rev is answered stale before the rules run. Where the module writes:

| Host           | Tasks module runs                                 | Store                                                  |
| -------------- | ------------------------------------------------- | ------------------------------------------------------ |
| Tauri          | the core window (`start-core.ts`), host `store`   | `TauriTasksGateway` → Rust store → `tasks.json`        |
| Browser studio | in process (`startCoreInProcess`), host `storage` | `StorageTasksGateway` over a `MemoryDocStore`          |
| The app page   | its own server in the frame, host `storage`       | `StorageTasksGateway` over `StorageClient` → the shell |

The module needs one of two hosts, `TASKS_HOST_NEEDS`: `store`, a `StoreClient`, or `storage`, a contract `DocStore`. It imports no Tauri and is lent no `invoke`.

**Links from a frame.** A frame opens at most five links in ten seconds (`FrameLinkPace`); one past that is reported, not opened. `OpenLinkCommand` takes an `href` of at most 2 048 characters and opens an `https://` page in a new browser tab only when `opensNew`.

**Chat task lines and the agent's task tools stay on the shell's tasks module**: they run where the chats and the agent runner are, and they write through the same gateway, so the board still has one writer. A `chats` contract service (**planned**) is what lets the app's Continue and Send back reach a chat; until then the app draws a task's chat as closed.

**The app.** `sumi-tasks/apps/web` starts `@widgetarium/tasks` in its page with host `storage: new StorageClient(port)` (`tasks-app.ts`); it carries no Tauri stub. In the dev host (workspace `dev`) an empty board is seeded with four tasks, through the same storage. `pnpm build && pnpm release` in `sumi-tasks` lays `apps/web/dist` as a release (`scripts/release.ts` copies `sumi-app.json` in and runs this repository's `tools/app-release.ts`). `npm run test:tasks-app` (`tools/tasks-app-test.ts`) runs the service, the rev, each rule refusal, the bounds and the link pace in node, then, in headless Chrome over the memory installer gateway, the built release installs from a `folder` row, replaces the built-in page, draws a task seeded only in the shell's store, an Accept pressed in the frame lands in that store and survives a frame reload, a write over an old rev answers stale, and `sumi://` and `https://` links from the frame open through Places. It reads the release from `~/Projects/Sumi/sumi-tasks/apps/web/dist` (or `SUMI_TASKS_RELEASE`) and fails while none is built.

**The shell's own Tasks page stays** (`apps/studio/src/features/tasks`, the built-in `tasks` page) until the loaded app is proven in a real Tauri window: an installed, current `tasks` takes the tab (`AppFace.isBuiltIn`), and without one, or with every version failed, the built-in page is drawn.

## Order

| Step                                                                    | Done when                                                                                                                                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Folder, dev workspace, `@sumi/contract` 0.1                          | done: `pnpm test` and `pnpm check` in `sumi-contract` pass                                                                                                                             |
| 2. `sumi-framework` extracted with its history; the shell depends on it | the shell builds and starts                                                                                                                                                            |
| 3. `sumi-kit` extracted the same way                                    | the shell builds and starts                                                                                                                                                            |
| 4. App installer, `sumi-app://` loading, registry (GitHub or folder)    | folder sources done: the hello app installs, updates and rolls back (`test:app-installer`); GitHub planned                                                                             |
| 5. Tasks moves to `sumi-tasks`; contract 1.0                            | the board opens from the registry: the app installs and keeps its board through `storage` in Chrome (`test:app-installer`); a real Tauri window, the domain moving out and 1.0 planned |
| 6. Canvas, terminal, browser page; chat last                            | each opens from the registry                                                                                                                                                           |
