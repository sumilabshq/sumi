# Folders and Flows: data architecture

## TL;DR

The default workspace stays as one hidden storage root, so chats, canvases and tasks do not move. The navigation module owns Folders and Flows and writes them with tabs in one atomic change. Old plugins are removed only after the new ones work on the test copy.

`$NAV` = `plugins/tabs/navigation/data/navigation`.

## Prior art

| Product | Model | Taken |
|---|---|---|
| Arc | Spaces own tabs | A heavy container becomes a mode, so folders stay light |
| Obsidian | Split, tabs, leaf tree | The PaneTree shape |
| VS Code | Grid of editor groups with tabs | Active tab per pane, closing the last tab collapses the pane |
| Linear | Inbox with read state | Inbox is derived attention, not a location |

## Storage root

`scope.workspaceId` stays as a storage key. The workspace entity leaves the UI and API:

- `packages/domain/workspaces/features/workspaces/requests.ts`
- `plugins/command-menu/data/command-menu`
- `plugins/ai/sessions`
- `apps/tauri/src/startup/read-opening.ts`
- `apps/tauri/src/workspace/workspace-switch.ts`
- `$NAV/features/workspace-moves`

`workspaces.chats.*` stays.

## Schemas

New file `$NAV/shared/schema/flows.schema.ts`. Stored as a top-level `flows` key of `navigation.json`, beside `tabs`, because `PlacedTabsSchema` strips unknown fields.

```ts
FlowIcon = {kind:"icon",name} | {kind:"emoji",emoji}
FlowPane = {kind:"pane", id, tabIds:string[], activeTabId:string|null}
FlowSplit = {kind:"split", id, dir:"row"|"column", children:FlowNode[], shares:number[]}
FlowLayout = {root:FlowNode, focusedPaneId:string, minted:number}
Flow = {id, name, icon:FlowIcon|null, layout:FlowLayout, createdAt, lastOpenedAt}
FlowFolder = {id, name, icon:FlowIcon|null, baseDir:string|null, isOpen:boolean, flowIds:string[]}
SetupPane = {kind:"pane", tabs:{app:string, address:string|null}[]}
Setup = {id, name, icon:FlowIcon|null, root:SetupPane|SetupSplit}
FlowsDoc = {
  v:1, flows:Flow[], folders:FlowFolder[], looseFlowIds:string[], setups:Setup[],
  windowFlows:Record<window,flowId>,
  inboxUndo:{clearId, at, marks:{tabId,mark}[]}|null,
  conversion:{key:"workspace-to-flows-v1", sourceRev:number, sourceDigest:string, at:number}
}
```

Laws:

- Every live tab stands in exactly one pane of one Flow.
- A Flow stands in `looseFlowIds` or in one folder's `flowIds`. It has no `folderId`.
- Only a Flow's sole pane may be empty. That state draws Home.

Read state is the existing `tab.mark`; `unread` means done. `flowStatusOf` takes the most urgent chat-tab mark: `failed > asking > running > unread`. No chat means no status.

Inbox holds Flows with status failed, asking or unread. Opening a Flow clears `unread` and `failed`. `asking` stays until answered and is hidden only while that Flow is open. Clear does the same across Inbox and writes `inboxUndo`. Undo restores only tabs still at `none`.

## Owner and requests

The navigation module is the one writer. `movePlaces(plan)` commits `{tabs, flows}` in one `HeldDoc.change` and is the only write path.

| Feature in `$NAV/features/` | Requests |
|---|---|
| `flows` | `sidebar`, `one`, `create`, `open`, `rename`, `setIcon`, `move`, `remove`, `adoptChats` |
| `folders` | `create`, `rename`, `setIcon`, `setBaseDir`, `toggle`, `remove` (spills Flows to loose) |
| `flow-panes` | `board`, `split`, `closePane`, `resize`, `focus`, `showTab`, `moveTab` |
| `inbox` | `rows`, `clear`, `undoClear` |
| `setups` | `all`, `saveFrom`, `start`, `remove` |

Event: `flowsChanged` in `$NAV/gateways/flows/flows.events.ts`, fired from the same doc watch.

New view plugins: `plugins/tabs/flows-sidebar`, `flow-strip`, `flow-board`. Removed last: `workspace-switcher`, `tabs-view` with `tab-views`, `tabs-sidebar`, `tab-groups`, `sub-pages`, old `tab-strip` and `panes`. `AssistantRow` moves out of `sub-pages` first.

## Conversion

Pure `flowsOf(placed)` in `$NAV/features/flows/lib/flow-conversion.ts`, called from `heldNavigationOf` after `panesCarried`, for the default root only.

1. Refuse on any `tabBreaksOf` result, write nothing, log why.
2. Each group becomes `folder-<groupId>` in list order. Nested groups flatten into their parent. Empty groups stay as empty folders.
3. Each main chat becomes `flow-chat-<chatId>`, holding the chat and `lists[chatId]`.
4. Layout comes from `shelved[chatId]`, or the live root when `root.chatId` matches. Each leaf becomes a pane with one tab. Sub-pages missing from the layout join the chat's pane. Foreign or gone leaves are dropped and logged.
5. Non-chat main tabs in a group become one `flow-loose-<groupId>`, named after the group.
6. A loose non-chat tab outside any group becomes its own Flow.
7. Assert the laws, commit in one patch, log counts.

Ids derive from source ids, so the same input yields the same output, and the `conversion` key prevents a rerun. Later tabs go through `adoptStrays` with the same id scheme.

No chat is lost: every `chats.json` id is in a Flow, `closed` or `sessions`, otherwise `adoptChats` gives it a Flow. Conversion never writes `chats.json`.

- Sub-pages become ordinary tabs of the chat's Flow with unchanged ids.
- `closed` is kept verbatim.
- `pins.json` is unchanged. A pin opens the Flow holding its tab.
- `views` becomes `windowFlows`, choosing the Flow of `root.chatId`, then `shownId`.
- A saved split becomes a layout only if all members are in one Flow.

Expected from the test copy: 5 folders, 24 Flows (22 chat, 2 loose: MCP and Refactoring), 45 tabs placed, 16 Flows outside folders.

`retire_other_workspaces` (Rust) drops registry rows, adds `retiredIds` and sets `lastOpenedId` in one `update_doc`. It never deletes `<home>/.sumi`.

## Runtime decisions

- Switching Flows suspends views and keeps work alive. Layout and active tabs persist per Flow.
- A Flow is open in one window. A second window opening it focuses the holder through `focus-window`. The hold is derived, never stored.

## Slices

| # | Slice | Proof |
|---|---|---|
| S0 | Schemas, status, pure conversion | `tools/flows-conversion-checks.ts`: expected counts, rerun identical, mutated fixture goes red |
| S1 | Root safety and retirement in Rust | Temp-home tests: a retired workspace does not return |
| S2 | Atomic gateway, flagged conversion | Flag off: `test:places` unchanged. Crash-before-flush rerun |
| S3 | Commands and tab reconcile | One place per tab under every command |
| S4 | Per-pane tabs | Split, move, close last tab, two-window hold |
| S5 | Sidebar, header, board plugins | `test:plugin-layout`, real-app screenshot, `test:paint` |
| S6 | Single writer and consumers | Turn marks reach Inbox, no outside `movePlacedTabs` |
| S7 | Cutover on the test root | Full `npm test`, invariant on the copy, restart twice |
| S8 | Remove old plugins, `lists`, `groups` | `test:types`, `test:plugin-layout`, full `npm test` |

## Risks

1. A test run can convert real data. The conversion flag must also require the registry home to equal the expected test home.
2. `move_legacy_workspaces` runs on every open (`dispatch.rs:110`) and can re-register retired workspaces. `retiredIds` must block it.
3. An unreadable `tabs` value empties tabs. Never tighten `PlacedTabsSchema`.
4. `HeldDoc` merges per top-level key, so `movePlaces` is the only write path.
5. The store already has a `folder:<id>` root. Use `FlowFolder` and `baseDir`.
6. `baseDir` needs an assistant change: a new chat receives its directory at creation.
7. The no-workspace root stays on disk and is no longer opened.
