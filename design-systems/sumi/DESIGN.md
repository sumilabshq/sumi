# Sumi

## The idea

Sumi is a quiet tool that gives the screen to the work. Five aims, in this order; every rule below follows from them.

1. **Content first.** The person's work (a chat, a page, code) is the loudest thing on the screen. The interface steps back: no decoration, no frame or fill that spacing can replace, controls invisible until touched.
2. **Minimal and quiet.** Remove what does not help the task, an icon included. Hierarchy comes from text and spacing, not from boxes.
3. **A terminal's feel, not its look.** Taken from the terminal: instant reaction, a clean surface, the keyboard first, the caret, mono where code and commands live. Not taken: green on black, ASCII art, a screen only a developer can read. Sumi reads as a normal product to someone who never opened a terminal.
4. **Monochrome so nothing distracts.** Colour stays out so the eye stays on the content; monochrome is a means, never the point. Colour comes back where it carries meaning: a status, a data mark, the person's own content.
5. **Alive under the hand.** Quiet is the base, not the whole: every press answers, the agent's work is visible while it happens, an empty screen greets the person. Delight is spent in a few places, each with a job (the workspace ink, the working light, the serif voice, the mascot), never as decoration.

### Consequences, not the idea

Today's answers to the aims. Each may change when a better answer serves the same aims; none is a direction to push further.

- **Soft corners from one scale.** A frame takes its corner from `--r-*` (4, 6, 8, 12, 14, 16px): a plate 14, a control 8, a chip 6. The mascot stays square: the clover is drawn in square cells. A corner written as a number in a sheet is debt; many frames still carry a literal 0 and move to the scale as they are touched.
- **The page panel.** The approved Flows redesign (canvas `tab-215`) overrides square frames here: the page is one white panel on the grey `--frame`, radius 10 (`--r-page`), inset `--frame-gap` (8px) from the window, no border, `--shadow-page`; split panes share it with a 1px `--divider`.
- **One surface, no shadows, lines edge to edge.** Depth and boxes compete with content.
- **Icons in one colour.** An icon's margin lives in the icon itself, so an author can draw it to the box's full size.

### Testing a change

A change is right when it puts the content forward, removes something, makes a reaction faster, keeps the eye on the work or makes a touch answer. Making the interface more consistent with a consequence (squarer, greyer, flatter) is not a reason on its own.

## Visual Theme & Atmosphere

The window is one sheet of paper with ink on it. Nothing floats over the page but a popup; nothing is boxed but code. Calm comes from a single surface, one size of text, one left line and few, full-length lines; speed comes from a terminal-like caret and instant answers. The paper is felt, not flat: a fine grain and a soft light from the top of the window, in both themes. It must read as a normal product to a person who never opened a terminal, and feel like home to one who lives in it.

The canvas "Sumi — paper directions" (https://claude.ai/artifact/H8ZPbB1u4ALCSWcqciU268) draws every rule below; `references/README.md` says which board to read for what. The pictures the direction came from: notes in light ink on a dark tablet, an e-reader's matte page, schematic and sci-fi panels in one colour.

| Setting    | Values                                | Default | What changes                                                         |
| ---------- | ------------------------------------- | ------- | -------------------------------------------------------------------- |
| `theme`    | `dark`, `light`                       | host    | dark is near-black paper, light is plain white                       |
| `text`     | `sans`, `mono`                        | `sans`  | mono sets the whole interface in JetBrains Mono, for developers      |
| `favicons` | `mono`, `colour`                      | `mono`  | site icons as one-colour masks or as they are                        |
| `ink`      | yellow, ember, moss, tide, iris, rose | yellow  | per workspace: the hue of the tint step (82, 42, 145, 225, 285, 355) |
| `paper`    | `grain`, `flat`                       | `grain` | flat drops the grain and the top light                               |

Everything else is fixed. The delight layers are drawn on the canvas's "Delight" page.

## Color Palette & Roles

| Role                                        | Step                                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background`, `sidebar`                     | paper: the one surface; sidebars and panes are the same paper                                                                                                                      |
| `card`, `group`, `muted`, `fill`, `field`   | soft: the one fill: code blocks, inline code, a selected row, a user's message                                                                                                     |
| `popover`, `raise`                          | paper with a 1px `border`, no shadow: the only floating thing                                                                                                                      |
| `sidebar-accent`                            | selected: the shown tab, the chosen option                                                                                                                                         |
| `accent`, `secondary`, `fill-hover`         | active: pressed                                                                                                                                                                    |
| `foreground`                                | ink                                                                                                                                                                                |
| `muted-foreground`, `ink-muted`             | ink-2: rarely used; secondary text takes ink-3                                                                                                                                     |
| `faint`                                     | ink-3: times, verbs in tool rows, hints, table headers                                                                                                                             |
| `group-line`, `sidebar-border`              | line: table rules and dividers inside content; divider (fainter): the splits between panels and the composer edge                                                                  |
| `border`, `input`                           | edge: the code block and popup outline                                                                                                                                             |
| `primary`, `brand`                          | contrast: the one solid control per view, Send                                                                                                                                     |
| `tint`, `on-wash`                           | the workspace ink (Sumi yellow by default): the caret, links, text selection at 26%, the workspace mark, the working line and shimmer, the italic line of a greeting; nothing else |
| `success`, `destructive`, `info`, `warning` | data marks and diff colours only: ok, fail, progress, waits                                                                                                                        |

## Typography Rules

Inter (variable, weight 510, letter-spacing -0.01em) for everything people read; JetBrains Mono for code, commands, file names inside code and the optional `mono` theme; IBM Plex Serif, the one serif, for the voice: greetings, empty pages and a document's title. Plex Serif carries Cyrillic in roman and italic.

| Step       | Size / weight      | Use                                                       |
| ---------- | ------------------ | --------------------------------------------------------- |
| Voice      | 28–34 / 400 serif  | an empty page: two lines, the second italic in the ink    |
| Page title | 30 / 500 serif     | a document's title in a pane                              |
| Workspace  | 15 / 600           | the workspace name in the sidebar                         |
| Chat       | 14 / 400, line 1.6 | every message, tool row, table, question and the composer |
| UI         | 13 / 510           | sidebar rows, headers, menus, options                     |
| Code       | 13 / 400 mono      | code blocks, inline code, commands in tool rows           |
| Label      | 12 / 400           | section labels in the sidebar                             |

- One size per region: inside the chat everything is 14px; tool rows, tables, statuses and hints never shrink below it.
- One weight: bold (600) only for headings and the open question. File names and commands are regular weight in full ink.
- Two inks: full ink for content, ink-3 for everything secondary. Never a third grey.
- No uppercase, no ellipsis written into text, no `·` between items: separate with spacing; crumbs use `/`.

## Component Stylings

- **Row** (sidebar, menu, list): 30px, a 6px corner (`--r-sm`), hover by the menu glide, a 16px solid icon, 10px gap. Hover and keyboard focus: one light fill. Pressed: a stronger fill. Selected: the soft fill and 500.
- **Icons**: Hugeicons stroke-rounded at 12 to 13px, stroke 1.5; the kit's own apps may still draw solid icons on a 16px grid; sites use their real favicon turned into a one-colour mask; controls (search, close, chevron) stay thin line icons, so a control never looks like content.
- **Code block**: filled with the soft step, no border, mono 13px, syntax in muted colours, copy and wrap icons at the right.
- **Inline code**: the soft fill, mono 13px, square, padding 2px 5px.
- **Link**: ink-coloured text, underline on hover. A file path is a link and looks the same.
- **Done item**: the bare tick draws itself in 220ms where the number stood; the text turns ink-3 and is struck through.
- **Working state**: while the agent works, a light of the ink runs along the composer divider (a 36% wide band, 1.8s, linear), the status row holds the mascot and a shimmering line ("Editing Release plan.md"), the chat's row in the sidebar says "working" in the same shimmer, and the caret breathes. The shimmer is a band of the ink sliding across the text, never a blink. Nothing of it stays when the agent stops.
- **Live task list**: `{task <id>}` in an answer draws that task's checklist in place, as part of the chat, and updates it as the task moves; numbered steps turn into ticks as they are done.
- **Empty page**: the mascot (its eyes carry the mood), two lines in the voice serif with the second italic in the ink, one line of plain facts in ink-3, one or two quiet rows to act. It stands on the pane's left line near the top, never centred. No card, no chip, no picture.
- **Table** ("Quiet"): a line under the header row only, no lines between rows, header in ink-3, numbers right-aligned with tabular figures, full width of the reading column.
- **Tool group**: a summary row ("Edited 2 files, ran 3 commands +12 −3 14s") with the chevron on the right; its rows hang under a drawn tree line (│ ├ └ as continuous 1px lines, never characters); an opened diff or output is a code block indented one step under its row.
- **Questions**: one kind only, every question required. A block with the soft fill, the last thing in the chat: the mascot and "Sumi is waiting for you 1 of N", the question in 600, a line of why, numbered options (press 1–9, the number a filled square), "Or answer in your own words" with the caret, the next question as one quiet row. An answered question becomes a tool-group-like row "Asked 1 question" with the question and answer under the tree. Scrolled away from it, the arrow that scrolls to the latest message says "Back to questions".
- **Composer**: the caret (a yellow block when focused, an outlined block when not), the hint, expand at the top right; below, `+` attach, model, effort, mode, folder, usage bar, and Send at the right.
- **Send**: the one solid control: ink square with a paper arrow; an outline when the input is empty; a stop square while the agent works.
- **Popup**: opaque paper, radius 10 (`--r-menu`), 1px `--line-menu` border, `--shadow-menu`, no blur, rows 32px; it scales from 0.85 to full out of its trigger in 70ms and back in 70ms; a divider runs edge to edge; the highlighted row is the inverted block; the picked item ends with the mascot mark.
- **Data marks** (a plugin): `{meter done/total}` squares, the rest empty; `{meter passed/failed/total}` adds red ones; `{bar N%}`; `{trend a b c …}`; `{ok}` green, `{progress}` blue, `{fail}` red, `{neutral}` white, `{skip}` outline. The text always says the number too.

## Layout Principles

- One surface: panes are separated by a vertical hairline, never by a gap or a plate.
- One left line: in a pane, every row, paragraph, table and question starts at the same x. Nesting is shown by the tree line, and a chevron sits on the right, after the text.
- Reading column: chat text sits in a 768px column centred in its pane; dividers and hover fills of rows still run the full width of the pane.
- A pane header has no line under it. The exception is an app with an inner divider that must meet one (the Git app).
- A chat pane keeps one divider: above the input.
- Spacing groups first, a hairline second, never a box around a pane's whole content; content that fills a pane goes edge to edge.
- The shell is one strip of tabs in the header (each a deep link, no pinned tabs, no essentials) over one or more panes; every app draws its own sidebar.

## Depth & Elevation

| Level        | What                          | Anatomy                                                                                                                                        |
| ------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Paper        | the window, sidebars, panes   | one colour, no edge; a fractal-noise grain at 8% and a radial light at 5% ink from the top centre, over everything, never catching the pointer |
| Page         | the active tab, the main page | no border, `--shadow-page`: a 0.5px hairline and a 1px lift                                                                                    |
| Popup        | menus, pickers                | paper, 1px `--line-menu` border, radius 10, `--shadow-menu`                                                                                    |
| Command menu | the ⌘K menu                   | covers the whole window in the paper colour; no shadow, no blur                                                                                |

Only the active tab, the main page and popups cast a shadow. A line stands between panes, under a table header and as the two chat dividers; a code block is filled, never outlined.

## Do's and Don'ts

Suits long work at a desk: an agent chat beside apps, a browser, an editor, a git view, used many times a day by developers and by people who never use a terminal.

- Do keep everything on one surface and one left line.
- Do spend solid colour once per view (Send) and the workspace ink only where its role lists it.
- Do let dividers reach both edges of their pane.
- Don't add a plate, a card or a second surface level.
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

Imagery is domain content only: favicons, app icons, the user's own pictures. Favicons are shown as one-colour masks of the real file (background removed, shape kept, filled with the text colour); a site without one gets its first letter. Attached pictures are square-cornered thumbnails. No illustrations, no hero art; the mascot is the only character, and an empty state is the empty page above.

## Behaviour

- The first response to any press or key is under 100ms.
- One motion scale, one easing (`cubic-bezier(.2,.8,.2,1)`): hover 0ms in, 80ms out; press 80ms, a fill and a dip to 0.97 (Send to 0.9); release 180ms; a tick or a new row 220ms.
- Clicking anywhere in the chat puts the caret in the composer, like a terminal.
- Arrow keys and the mouse move one shared highlight in lists and menus; the last one used wins.
- Menus grow out of their trigger and fold back into it (Cube grammar); a sidebar slides out over 180ms; nothing scales.
- Motion appears when a thing changes place, answers a touch or shows that the agent works.
- `prefers-reduced-motion` turns all motion off.

## Cube grammar

The mascot, a square with an eye, is the alphabet: a few signs taken from it repeat on every screen, so any screen reads as Sumi with the logo covered. Drawn on the canvas "Граматика куба".

- **Frame**: what floats (a menu, a picker, a popover, a floating panel) wears two 1px lines 3px apart, the outer `line-strong`, the inner `line`, on opaque paper. Nothing else is framed.
- **Highlight**: the highlighted row is inverted, one block that slides between rows; its leading edge is faster, so it stretches while it travels and closes up when it lands. It covers the inner line of the frame at both sides, and at the top and bottom rows. It opens from the row's middle and closes back into a line when the pointer leaves; over a label or a gap it stays where it was.
- **Pick mark**: a picked option ends with the mascot mark, a 10px square of ink with a paper eye, where a tick would stand.
- **One spring**: the mascot's corner spring, stiffness 170 and damping 18, moves everything that springs.
- **Grow**: a floating thing opens as a frame growing out of what opened it, every corner on the spring, so the far corner overshoots and comes back; it settles in about half a second. The content stands still at its final place, cut by the growing frame, and fades in over 160ms. It closes the same way backwards, folding into what opened it in about 150ms, without the overshoot. Nothing scales. The highlight is hidden while the frame grows or folds.
- **Lean**: while it is open, the corners facing the pointer lean towards it, up to 6px, fading out 320px away. Only the frame bends: content never scales, moves or reflows.
- **Stillness**: what is read or typed into (fields, sidebars, text, the composer) never bends; one live thing at a time.
- **Reduced motion**: no growth, no lean, no slide; the highlight jumps.

## Never

- A plate, a card around a message, a white pill on grey, a second surface level.
- A corner outside the `--r-*` scale.
- A divider cut short of its pane's edges, or a line under a chat pane's header.
- An ellipsis written into text, or `·` used as a separator.
- A tick inside a box or a circle: a done state is the bare tick, a picked option the mascot mark.
- Uppercase, or a line drawn beside a label: section names are written in normal case.
- The ink anywhere its role does not list; a gradient but the working line, the shimmer and the top light; a violet accent nobody chose; a rainbow glow.
- A third grey, a second text size inside the chat, bold for anything but a heading.
- A status in an uppercase badge.
