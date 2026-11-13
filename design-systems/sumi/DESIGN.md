# Sumi

## The idea

Sumi is a quiet tool that gives the screen to the work. Four aims, in this order; every rule below follows from them.

1. **Content first.** The person's work (a chat, a page, code) is the loudest thing on the screen. The interface steps back: no decoration, no frame or fill that spacing can replace, controls invisible until touched.
2. **Minimal and quiet.** Remove what does not help the task, an icon included. Hierarchy comes from text and spacing, not from boxes.
3. **A terminal's feel, not its look.** Taken from the terminal: instant reaction, a clean surface, the keyboard first, the caret, mono where code and commands live. Not taken: green on black, ASCII art, a screen only a developer can read. Sumi reads as a normal product to someone who never opened a terminal.
4. **Monochrome so nothing distracts.** Colour stays out so the eye stays on the content; monochrome is a means, never the point. Colour comes back where it carries meaning: a status, a data mark, the person's own content.

### Consequences, not the idea

Today's answers to the aims. Each may change when a better answer serves the same aims; none is a direction to push further.

- **Square corners.** Frames are square because it reads cleaner today. What sits inside a frame keeps its natural shape: a dot is round, a git node is a circle, a stroke has round caps. "Make it more square" is never a reason for a change; square is the easiest place to go wrong.
- **One surface, no shadows, lines edge to edge.** Depth and boxes compete with content.
- **Icons in one colour.** An icon's margin lives in the icon itself, so an author can draw it to the box's full size.

### Testing a change

A change is right when it puts the content forward, removes something, makes a reaction faster or keeps the eye on the work. Making the interface more consistent with a consequence (squarer, greyer, flatter) is not a reason on its own.

## Visual Theme & Atmosphere

The window is one sheet of paper with ink on it. Nothing floats over the page but a popup; nothing is boxed but code. Calm comes from a single surface, one size of text, one left line and few, full-length lines; speed comes from a terminal-like caret and instant answers. It must read as a normal product to a person who never opened a terminal, and feel like home to one who lives in it.

The canvas "Sumi — paper directions" (https://claude.ai/artifact/H8ZPbB1u4ALCSWcqciU268) draws every rule below; `references/README.md` says which board to read for what. The pictures the direction came from: notes in light ink on a dark tablet, an e-reader's matte page, schematic and sci-fi panels in one colour.

| Setting    | Values           | Default | What changes                                                    |
| ---------- | ---------------- | ------- | --------------------------------------------------------------- |
| `theme`    | `dark`, `light`  | host    | dark is near-black paper, light is plain white                  |
| `text`     | `sans`, `mono`   | `sans`  | mono sets the whole interface in JetBrains Mono, for developers |
| `favicons` | `mono`, `colour` | `mono`  | site icons as one-colour masks or as they are                   |

Everything else is fixed.

## Color Palette & Roles

| Role                                        | Step                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `background`, `sidebar`                     | paper: the one surface; sidebars and panes are the same paper                                     |
| `card`, `group`, `muted`, `fill`, `field`   | soft: the one fill: code blocks, inline code, a selected row, a user's message, an essential tile |
| `popover`, `raise`                          | paper with a 1px `border`, no shadow: the only floating thing                                     |
| `sidebar-accent`                            | selected: the shown tab, the chosen option                                                        |
| `accent`, `secondary`, `fill-hover`         | active: pressed                                                                                   |
| `foreground`                                | ink                                                                                               |
| `muted-foreground`, `ink-muted`             | ink-2: rarely used; secondary text takes ink-3                                                    |
| `faint`                                     | ink-3: times, verbs in tool rows, hints, table headers                                            |
| `group-line`, `sidebar-border`              | line: every divider and table rule                                                                |
| `border`, `input`                           | edge: the code block and popup outline                                                            |
| `primary`, `brand`                          | contrast: the one solid control per view, Send                                                    |
| `tint`, `on-wash`                           | Sumi yellow: the caret and links, nothing else                                                    |
| `success`, `destructive`, `info`, `warning` | data marks and diff colours only: ok, fail, progress, waits                                       |

## Typography Rules

IBM Plex Sans for everything people read; JetBrains Mono for code, commands, file names inside code and the optional `mono` theme.

| Step       | Size / weight      | Use                                                       |
| ---------- | ------------------ | --------------------------------------------------------- |
| Page title | 24 / 600           | a document's title in a pane                              |
| Workspace  | 15 / 600           | the workspace name in the sidebar                         |
| Chat       | 14 / 400, line 1.6 | every message, tool row, table, question and the composer |
| UI         | 13 / 400           | sidebar rows, headers, menus, options                     |
| Code       | 13 / 400 mono      | code blocks, inline code, commands in tool rows           |
| Label      | 12 / 400           | section labels in the sidebar                             |

- One size per region: inside the chat everything is 14px; tool rows, tables, statuses and hints never shrink below it.
- One weight: bold (600) only for headings and the open question. File names and commands are regular weight in full ink.
- Two inks: full ink for content, ink-3 for everything secondary. Never a third grey.
- No uppercase, no ellipsis written into text, no `·` between items: separate with spacing; crumbs use `/`.

## Component Stylings

- **Row** (sidebar, menu, list): 30px, no corner, a 16px solid icon, 10px gap. Hover and keyboard focus: one light fill. Pressed: a stronger fill. Selected: the soft fill and 500.
- **Essentials**: a grid of filled square tiles, 46px, the app's solid icon in ink.
- **Icons**: Sumi's own apps use solid drawn icons on a 16px grid; sites use their real favicon turned into a one-colour mask; controls (search, close, chevron) stay thin line icons, so a control never looks like content.
- **Code block**: filled with the soft step, no border, mono 13px, syntax in muted colours, copy and wrap icons at the right.
- **Inline code**: the soft fill, mono 13px, square, padding 2px 5px.
- **Link**: Sumi yellow text, underline on hover. A file path is a link and looks the same.
- **Table** ("Quiet"): a line under the header row only, no lines between rows, header in ink-3, numbers right-aligned with tabular figures, full width of the reading column.
- **Tool group**: a summary row ("Edited 2 files, ran 3 commands +12 −3 14s") with the chevron on the right; its rows hang under a drawn tree line (│ ├ └ as continuous 1px lines, never characters); an opened diff or output is a code block indented one step under its row.
- **Questions**: one kind only, every question required. A block with the soft fill, the last thing in the chat: the mascot and "Sumi is waiting for you 1 of N", the question in 600, a line of why, numbered options (press 1–9, the number a filled square), "Or answer in your own words" with the caret, the next question as one quiet row. An answered question becomes a tool-group-like row "Asked 1 question" with the question and answer under the tree. Scrolled away from it, the arrow that scrolls to the latest message says "Back to questions".
- **Composer**: the caret (a yellow block when focused, an outlined block when not), the hint, expand at the top right; below, `+` attach, model, effort, mode, folder, usage bar, and Send at the right.
- **Send**: the one solid control: ink square with a paper arrow; an outline when the input is empty; a stop square while the agent works.
- **Popup**: paper, 1px edge, no shadow, rows 32px; a divider runs edge to edge; the chosen item has a bare tick.
- **Data marks** (a plugin): `{meter done/total}` squares, the rest empty; `{meter passed/failed/total}` adds red ones; `{bar N%}`; `{trend a b c …}`; `{ok}` green, `{progress}` blue, `{fail}` red, `{neutral}` white, `{skip}` outline. The text always says the number too.

## Layout Principles

- One surface: panes are separated by a vertical hairline, never by a gap or a plate.
- One left line: in a pane, every row, paragraph, table and question starts at the same x. Nesting is shown by the tree line, and a chevron sits on the right, after the text.
- Reading column: chat text sits in a 768px column centred in its pane; dividers and hover fills of rows still run the full width of the pane.
- A pane header has no line under it. The exception is an app with an inner divider that must meet one (the Git app).
- A chat pane keeps one divider: above the input.
- Spacing groups first, a hairline second, never a box around a pane's whole content; content that fills a pane goes edge to edge.
- The shell is one left sidebar (essentials, Pinned, Recents with each chat's tabs nested under it, New tab, workspace switcher) and one or more panes.

## Depth & Elevation

| Level        | What                        | Anatomy                                                         |
| ------------ | --------------------------- | --------------------------------------------------------------- |
| Paper        | the window, sidebars, panes | one colour, no edge                                             |
| Popup        | menus, pickers              | paper, 1px edge, no shadow                                      |
| Command menu | the ⌘K menu                 | covers the whole window in the paper colour; no shadow, no blur |

Nothing casts a shadow. A line stands between panes, under a table header and as the two chat dividers; a code block is filled, never outlined.

## Do's and Don'ts

Suits long work at a desk: an agent chat beside apps, a browser, an editor, a git view, used many times a day by developers and by people who never use a terminal.

- Do keep everything on one surface and one left line.
- Do spend solid colour once per view (Send) and Sumi yellow only on the caret and links.
- Do let dividers reach both edges of their pane.
- Don't add a plate, a card, a rounded corner or a second surface level.
- Don't box statuses or put them in uppercase badges.
- Don't draw a chevron on the left of one row and on the right of another.

## Responsive Behavior

The system is for a desktop window. A narrow pane drops the reading column's side space first; the sidebar hides before a pane gets narrower than about 480px. A composer row cuts the folder name with CSS truncation before anything wraps. Options never wrap onto a second line.

## Agent Prompt Guide

| Task                                        | Read                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Any screen in this style                    | this file, then the matching board on the canvas                    |
| Exact sizes of a part                       | the board named in `references/README.md`                           |
| Colours                                     | `tokens.css`; never a raw hex in a component                        |
| States                                      | the "States" board                                                  |
| A table, a link, inline code or a data mark | the "Table variants" and "Links, inline code and data marks" boards |

## Colour algorithm

Every neutral is one ladder on a warm hue at almost no chroma; Sumi yellow is the one free colour; status colours are fixed.

| Step     | Job                          | Light L | Dark L | Chroma                   |
| -------- | ---------------------------- | ------- | ------ | ------------------------ |
| paper    | window, sidebars, panes      | 1       | 0.17   | `--neutral-chroma` 0.003 |
| soft     | fills, popups, inline code   | 0.965   | 0.215  | `--neutral-chroma`       |
| selected | shown tab, chosen option     | 0.955   | 0.215  | `--neutral-chroma`       |
| line     | dividers                     | 0.88    | 0.29   | `--neutral-chroma`       |
| edge     | code block and popup outline | 0.82    | 0.35   | `--neutral-chroma`       |
| ink-3    | secondary text               | 0.6     | 0.58   | `--neutral-chroma`       |
| ink      | text, Send                   | 0.19    | 0.93   | `--neutral-chroma`       |
| tint     | Sumi yellow                  | 0.55    | 0.8    | `--chroma` 0.13          |

`--hue` is 82 (Sumi yellow); the neutrals take the same hue at 0.003 chroma, which warms the paper a little. Hover and press are translucent ink over any step (5% and 13% in dark, 4.5% and 12% in light). Status colours keep their hue in both themes: ok 150, progress 255, fail 30, waits 76. Every text pair holds 4.5:1 on paper.

## Imagery

Imagery is domain content only: favicons, app icons, the user's own pictures. Favicons are shown as one-colour masks of the real file (background removed, shape kept, filled with the text colour); a site without one gets its first letter. Attached pictures are square-cornered thumbnails. No illustrations, no hero art; an empty state is a title and one line.

## Behaviour

- The first response to any press or key is under 100ms; hover fills appear at once and leave in 100ms.
- Clicking anywhere in the chat puts the caret in the composer, like a terminal.
- Arrow keys and the mouse move one shared highlight in lists and menus; the last one used wins.
- Menus open at once and close in 100ms; a sidebar slides out over 180ms; nothing bounces, nothing scales above 1.
- Motion appears only when a thing changes place.
- `prefers-reduced-motion` turns all motion off.

## Never

- A plate, a card around a message, a white pill on grey, a second surface level.
- A rounded corner.
- A divider cut short of its pane's edges, or a line under a chat pane's header.
- An ellipsis written into text, or `·` used as a separator.
- A tick inside a box or a circle: a chosen state is the bare tick.
- Sumi yellow anywhere but the caret and links; a gradient; a violet accent nobody chose.
- A third grey, a second text size inside the chat, bold for anything but a heading.
- A status in an uppercase badge.
