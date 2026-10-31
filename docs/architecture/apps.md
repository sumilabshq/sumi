# Apps

Sumi is a shell. Every page a person opens (chat, tasks, canvas, terminal, a browser page) is an app: its own repository, runnable alone in a browser, plugged into Sumi through a registry, and speaking to Sumi only through `@sumi/contract`. The design behind this page, with the prior art it rests on, is https://claude.ai/artifact/Y1WxRtpr7h227vGYjpTEY9; where they disagree, this page wins.

> Status: the repositories and `@sumi/contract` 0.1 exist. Everything marked **planned** is not built yet.

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

**What stays in the shell:** Places (tabs, address, history, title, favicon), workspaces, the page frame, the event bus, the app store (install, update, roll back), and every native power: the Rust core, the terminal pty, browser webviews, the agent runner, the file store. **Only the shell imports Tauri.** An app reaches a native power by asking the shell for it (`ask`), never by importing `@tauri-apps/api`.

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

**Two gates.** Before install, the shell skips a release whose `contract` range Sumi does not satisfy and takes the newest that fits (**planned**, in the app store). At runtime, `serveApp` checks `hello.contract` again, because a dev server never passed the install gate.

**The handshake.** The app posts `sumi:port-ask` to its parent window. `serveFrame` answers only an ask whose source is the frame it was given, with a fresh `MessageChannel` port posted into that frame alone; a reloaded frame asks again and gets a new channel, the old one closed. The app sends `hello` on the port and waits for `welcome` or `refused`. An app opened outside Sumi is told so at once, and one Sumi never answers gives up after `CONNECT_TIMEOUT_MS` (10 s) with a reason, never a silent wait.

**An app cannot pretend to be another app.** The shell decides who a frame is when it creates it: `serveFrame` is told the frame's app id, and the port goes only into that frame. A `hello` naming another app is answered `refused` and the port is closed; a second `hello` is ignored and reported; nothing the app sends before its `welcome` reaches the shell. The identity comes from the channel, never from what the app says, which is what will let the shell grant one app a power and refuse it to another (**planned**: no app has any grant today).

**A failure reaches both people.** A service that throws answers the app `"<service>" failed` and nothing more, because the app is untrusted code; the full error, stack included, goes to the shell's `onProblem`. Every `ask` is answered: a throwing service, an answer that cannot be sent and a closed connection all settle it with `ok: false`.

## Modules and the bus

An app's manifest lists its modules: `modules: [{ name, runs: "page" | "background" }]`. The app's code never names the shell's modules; it sends contract messages, and the shell wires each module to the one bus. Background modules run in the shell's hidden core window, all in one for now (**planned**; splitting them into separate processes is a later decision).

**MCP is a transport** (**planned**). A framework server already listens on several transports (`server().modules(...).listen(transport)`, [requests.md](requests.md)); `mcpTransport()` is one more, so every public request of a module becomes an MCP tool with no MCP code in the app. The shell serves one MCP endpoint for any provider (Claude Code, Codex…), tools named by app (`tasks.create_task`), each app switchable on and off. A manifest says `mcp: true`; there is no second registry for MCP.

The chat's sub-tabs under a chat stay drawn by the shell's own code until apps can contribute UI.

## Registry, install and updates (**planned**)

**The registry** is the list of apps Sumi may install. Each row names an id and a source: a GitHub repository (`{ kind: "github", repository: "owner/sumi-tasks" }`) or a folder on this machine (`{ kind: "folder", path: "/Users/…/sumi-tasks" }`). Its schema lives in the shell, because only the shell reads it.

**Sumi never runs an app from its source.** Installing reads the source's built release, checks it, and copies it into Sumi's own folder; the source folder or repository is only where a version comes from:

```
~/Library/Application Support/<Sumi app id>/apps/
  store.json          written only by the shell's app store: current, previous, failed versions
  tasks/1.0.0/        immutable once written
  tasks/1.0.1/
```

The app id is `app.widgetarium.studio` today (`tauri.conf.json`); renaming it moves this folder and every workspace file, so the rename carries a migration.

**Updates** are checked at start, every few hours and on a press; a newer release that passes the install gate is downloaded, checked (hash, then signature), unpacked into its own version folder and made current. A hidden tab reloads at once; a shown one reloads when the app is not `busy`, at the same address, because Places holds it. A version whose frame never sends `ready` is marked failed and the previous one comes back. Apps from the registry update automatically, with a setting to turn it off; an update that would ask for a new grant waits for the person. Installing from anywhere outside the registry is not supported.

## Order

| Step                                                                    | Done when                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1. Folder, dev workspace, `@sumi/contract` 0.1                          | done: `pnpm test` and `pnpm check` in `sumi-contract` pass |
| 2. `sumi-framework` extracted with its history; the shell depends on it | the shell builds and starts                                |
| 3. `sumi-kit` extracted the same way                                    | the shell builds and starts                                |
| 4. App store, `sumi-app://` loading, registry (GitHub or folder)        | a hello app installs, updates and rolls back               |
| 5. Tasks moves to `sumi-tasks`; contract 1.0                            | the board opens from the registry                          |
| 6. Canvas, terminal, browser page; chat last                            | each opens from the registry                               |
