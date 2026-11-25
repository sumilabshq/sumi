# Flows redesign: brief for the implementing agent

## TL;DR

Sumi moves to a new model: workspaces become sidebar folders, **Flow** is a new entity, and tabs live only in the header of the open Flow. The sidebar and the header stop being two views of one tab list. The design is on Sumi canvas `tab-215`; the owner gives the concrete task in chat, so read this, study the code, and wait for it.

## The model

```
Sidebar                         Header and content
┌──────────────────┐            ┌───────────────────────────────┐
│ Inbox      Clear │            │ [Chat] [Canvas] +  [Git] [Term]│
│  waiting flows   │            ├───────────────┬───────────────┤
│ Flows            │  opens     │ pane          │ pane          │
│  Quick question ─┼──────────► │               │               │
│  ▸ Sumi (folder) │  a Flow    │               │               │
│     Composer     │            │               │               │
└──────────────────┘            └───────────────┴───────────────┘
Lists folders and Flows.        Shows the tabs and panes of ONE Flow.
Never lists tabs.               Never lists Flows.
```

| Entity | Meaning |
|---|---|
| **Folder** | What a workspace becomes. Groups Flows in the sidebar. Has a name and a custom icon. |
| **Flow** | New entity: one piece of work. Owns its tabs and its split layout. Sits in one folder or in no folder. Has a name and an optional custom icon. |
| **Tab** | Chat, canvas, browser page, terminal, git, any app. Belongs to a Flow and appears only in the header. |
| **Pane** | One area of a Flow's split. Has its own tabs. |
| **Setup** | A saved Flow layout, for example chat and terminal. Starts a new Flow from Home. |

A Flow is not only an AI chat. Notes, browsing and other non-AI work are Flows too, and they simply show no status.

## Sidebar and header separate

Today they are one mechanism with two looks (verified in code):

- `plugins/tabs/tab-strip/.../tab-strip.tsx` and `plugins/tabs/tabs-sidebar/.../tabs-sidebar.tsx` both read `appHost.tabs.tabsSidebar` and share `stripItemsOf` and `useTabActs`.
- `plugins/tabs/tabs-view/src/plugin.ts` chooses which look draws, through the `titleTabs` and `frameStart` slots.

Target: two separate features with separate data. The sidebar shows folders and Flows. The header shows the open Flow's tabs. The "tabs as sidebar or as strip" choice goes away.

Also read first: `plugins/tabs/panes`, `plugins/tabs/pinned-tabs`, `plugins/tabs/tab-groups`, `plugins/workspace-switcher`, `packages/domain/workspaces/shared/schema/workspace.schema.ts`.

## Splits

Obsidian-style: every pane has its own tabs.

- **Side by side:** one header row, and each pane's tabs sit in that row directly above the pane (board-3).
- **Stacked:** the top pane's tabs are in the header, the lower pane has its own tab row (board-4).
- **Narrow panes:** the active tab keeps its label, the others shrink to icons, then overflow into a chevron menu (board-5).

## Sidebar behavior

- **Sections:** `Inbox` and `Flows`, as quiet 12px labels. Flows without a folder come first, then folders.
- **Folder row:** no triangles. It shows its icon. On hover the icon becomes a small chevron and a `+` appears on the right. `+` creates a new tab in that folder.
- **Rename:** double click or the right-click menu turns the row into a field. Pressing its icon opens the icon picker.
- **Flow row:** custom icon or a small hollow dot on the left, status on the right.
- **Status priority:** failed, needs you, running, done. A Flow or closed folder shows only the most urgent one.
- **Done:** the tick shows only until the Flow is opened.
- **Several chats in a Flow:** hovering the row for about 300 ms opens a small panel listing each chat and its status. A Flow with one chat has no panel.
- **Inbox:** a short list of Flows waiting for the person: needs an answer, failed, or finished and unread. Running Flows stay out. Three rows, then `Show more`. `Clear` sits opposite the title, marks all as read, and offers a short Undo. No count.
- Opening an Inbox row opens the Flow, marks it read and removes it from Inbox. The Flow stays in its folder. An empty Inbox hides the whole section.

## Home

Composition 1, centered, opens in a new Flow.

- Mascot, `Where to?`, and a launcher, not the AI composer. Typing an app name opens it, an address opens the site, anything else searches the web, `?` asks Sumi, `/` runs commands. `plugins/command-menu/data/command-menu/features/results/lib/typed.ts` already detects addresses and web search.
- **Setups:** gray tiles, no border, no shadow. New setups are saved from a Flow's tab menu with `Save as setup`. There is no setup editor and no New setup tile.
- **Apps:** icon and label only, no background, border or shadow.
- **Continue:** recent Flows with `Show more`.
- **Edit mode:** one small pencil in the page's top right corner, which becomes `Done`. Tiles drag, remove, and apps resize. The remove cross has no outline, only a ghost background on hover.

## Locked visual values

| Element | Value |
|---|---|
| Active tab and main page, light | no border, `box-shadow: 0 0 0 .5px rgba(0,0,0,.05), 0 1px 1.5px rgba(0,0,0,.1)` |
| Active tab and main page, dark | no border, `box-shadow: 0 0 0 .5px rgba(255,255,255,.08), 0 1px 1.5px rgba(0,0,0,.7)` |
| Menus and dropdowns, light | radius 10, border `rgba(0,0,0,.09)`, `box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.06)` |
| Menus and dropdowns, dark | radius 10, border `rgba(255,255,255,.09)`, `box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 4px 12px rgba(0,0,0,.45)` |
| Panel animation | scale from small to full out of its trigger, 70 ms in, 70 ms out |
| Text | Inter, 13px, weight 510, letter-spacing `-.01em` |
| Sidebar rows | 28px high, 1px gap, radius 6 |
| Icons | Hugeicons stroke-rounded, 12 to 13px |

Change only what the owner names. No extra borders or shadows.

## Canvas map

Open canvas `tab-215`, "Sumi layout v2".

| Page | Boards | Status |
|---|---|---|
| Home | `board-6` light, `board-7` dark, `board-17` edit mode, `board-18` save as setup | **Source of truth.** `board-18` still has the old sidebar and menu |
| Home | `board-8` launcher inputs | Behavior reference |
| Home | `board-9` to `board-12` | Rejected options, ignore |
| Home compositions | `board-13` to `board-16` | Explorations, ignore except search option 2 |
| Sidebar | `board-19` states, `board-20` Inbox states | Source of truth for behavior. `board-6` wins for Inbox: no count, with Clear and Show more |
| Panels and dropdowns | `board-21` style A, `board-23` option 3 | Approved. `board-22` motion is replaced by the 70 ms value above |
| Git changes | `board-1`, `board-2` | Layout approved, sidebar is old |
| Splits | `board-3`, `board-4`, `board-5` | Layout approved, sidebar is old |
| Layout | none | Empty. Older chat and canvas screens are on canvas `tab-213`, `board-3` to `board-8` |

## Not decided

Ask the owner, do not guess:

- How existing workspaces, tabs, Pinned lists and tab groups migrate into folders and Flows.
- What happens to Pinned and tab groups in the new header.
- Whether switching Flows keeps every Flow's tabs alive or suspends them.
- Whether a Flow can be open in two windows.
- Where Flow status and read state are stored.
- The final Home picture. The dotted mascot is a placeholder.

## Repository state

- The redesign is not in the app yet.
- The working tree holds uncommitted, unreviewed Button and composer work from this design round. Check `git status` before branching.
- Keep the uncommitted `CLAUDE.md` and `docs/architecture/*` changes untouched.
- Never commit, push or merge to `main`, `master`, `dev`, `develop`, `staging` or `release`.
