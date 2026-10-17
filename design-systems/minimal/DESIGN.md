# Minimal

## Visual Theme & Atmosphere

A working product that looks expensive because nothing on it is decoration. Content stands on the page; a card appears only where it groups something; type does the hierarchy; one button per region says what to do next.

Minimal removes **decoration, never information**. A page here may hold a 46px-row table of forty records; what it never holds is a gradient, a card around one number, or a second big button.

For products a person works or reads in: dashboards, tools, docs, notes. Landing pages are a separate system, `minimal-landing`.

### References

The pictures in `references/`. Take the feel, never the page.

| File                                | Read it for                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `4-stage-and-side.webp`             | quiet controls, one strong action, a calm split between an object and its detail                                                   |
| `5-worklist-home.png`               | the shell with a top bar of words; a status header; a figure strip as one plate split by lines                                     |
| `6-ledger-full-bleed.png`           | a collection page: a table edge to edge in its region, no card, a mark leading every row                                           |
| `7-row-sheet.png`                   | a row opened in a side sheet: a score with its reasons, one accent button among small outlined ones, facts as label–value rows     |
| `8-dialog.png`                      | a dialog: display title, one line of what will happen, choice rows, the footer explaining the result beside Cancel and one primary |
| `9-second-product-same-system.png`  | another product in the same shell: proof the rules travel                                                                          |
| `10-table-and-filters.png`          | the shell with a sidebar; a filter column beside a dense table; filters as removable chips over it                                 |
| `11-one-object-page.png`            | a page with one object: a display headline, one input, three suggestion pills, history as plain rows                               |
| `12-minimal-sidebar-and-aside.webp` | a simple sidebar of words; a reading page; an aside with one card of the page's own tools                                          |
| `13-aside.png`                      | the aside alone: contents, share and a way back in one card, quieter links below it                                                |
| `14-sidebar-bottom-notice.png`      | a notice at the bottom of the sidebar: a mark, a title, one line, no card                                                          |
| `15-breadcrumb.png`                 | a breadcrumb: earlier step in ink-3, current page in full ink, a slash between                                                     |
| `16-site-header-search.webp`        | a site's top: its name on the left, a filled search and one tinted action on the right                                             |
| `17-hero-page-header.webp`          | a hero header: eyebrow, heading, description and a link beside a large picture, arrows to rotate                                   |

### Settings

Values the agent picks for a product and the person may change later with one switch. Everything else in this file is fixed. `settings.json` lists them for the spec card.

| Setting   | Values                        | Default        | What changes                                                                          |
| --------- | ----------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `ground`  | `white` · `grey`              | `white`        | where white lives (below). Light and dark are not a setting: every product ships both |
| `edges`   | `fill` · `outline`            | `fill`         | a plate is told apart by a 3% fill, or by a hairline on the page colour               |
| `density` | `regular` · `compact`         | `regular`      | row 46 → 38px, UI text 14 → 13px, every spacing step one tighter                      |
| `colour`  | `monochrome` · `spot` · `art` | `monochrome`   | how much colour the product carries; one pattern file per level                       |
| `fonts`   | a pair from `typography.md`   | by the product | the display, heading and text families                                                |

**Ground decides where white lives:**

- `white` — white page; plates are a 3% grey, one step darker. Most dashboards.
- `grey` — a 95–96% grey (neutral or warm) page; plates are white. For overview pages of many separate objects.

## Color Palette & Roles

Each role is the token name the system binds, and the step of the Colour algorithm it takes.

| Role                                                                                                | Step                                                            |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `background`, `sidebar`                                                                             | page (a filled sidebar takes plate)                             |
| `foreground`, `card-foreground`, `popover-foreground`, `sidebar-foreground`, `secondary-foreground` | ink                                                             |
| `card`, `popover`, `group`, `raise`                                                                 | plate                                                           |
| `group-inset`                                                                                       | page: the one allowed nesting is white on grey or grey on white |
| `muted`, `secondary`, `fill`                                                                        | sunken                                                          |
| `accent`, `fill-hover`, `sidebar-accent`                                                            | hover; a pressed control takes pressed                          |
| `border`, `group-line`, `sidebar-border`                                                            | line                                                            |
| `input`                                                                                             | control                                                         |
| `muted-foreground`, `ink-muted`                                                                     | ink-2                                                           |
| `neutral`                                                                                           | ink-3                                                           |
| `primary`, `brand`, `ring`, `sidebar-primary`, `sidebar-ring`                                       | pen                                                             |
| `primary-foreground`, `sidebar-primary-foreground`                                                  | page                                                            |
| `accent-wash`                                                                                       | pen at 7%: the selected row                                     |
| `destructive`, `success`, `warning`, `info`                                                         | tones: danger, success, warning, info                           |
| `note`, `standout`, `highlight`                                                                     | tones, used only where they carry a meaning                     |
| `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`                                | tone hues; a wash is the hue at 10% (15% dark)                  |
| `chart-1`                                                                                           | ink: the main series                                            |
| `chart-2`                                                                                           | pen: "this period / you"                                        |
| `chart-3`, `chart-4`, `chart-5`                                                                     | tones, for meaning only                                         |

Outlined buttons take line-strong, which no shadcn role names.

## Typography Rules

Three roles, each a setting. The roles are fixed; the families are not. The pairs are in `minimal/patterns/typography.md`.

| Role    | Default family                                  | Carries                                                                       | Sizes                                               |
| ------- | ----------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| display | a text serif (Source Serif 4, Newsreader class) | page titles, record names, dialog titles, hero figures, empty-state headlines | 24 · 32 · 44, weight 400, tracking −0.01 to −0.02em |
| heading | the text family, semibold                       | section and card titles                                                       | 17 / 24                                             |
| text    | the host's interface font                       | everything that works: UI, tables, menus, body                                | 11 micro · 13 meta · 14 UI · 15 body                |

- **Display is used once or twice per page.** A title and at most one figure. A page set entirely in serif is a different system.
- **Labels are quiet, values are loud:** a small label above a 24–32px display figure; uppercase only as `docs/ai/clean-ui.md` allows.
- **Figures are tabular** wherever they line up; money right-aligns in tables.
- Mono is not a role. It appears only for machine ids (`ENG-51`, `Q-1042`), never for names, dates or amounts.
- Emphasis is size and ink step, never bold inside a sentence.
- **Copy:** plain, specific, sentence case. Live counts instead of labels (`9 waiting to be triaged`). No "Successfully", no exclamation marks.
- TODO: the kit has `--font-sans` and `--font-mono` only; the display and heading roles need `--wg-kit-font-display` and `--wg-kit-font-heading` before `fonts` can switch at runtime.

## Component Stylings

Kit: `@widgetarium/kit` — every element is a kit component; the system decides which, where and how much.

**Controls**

- **Buttons are small.** `size="sm"` in toolbars, rows and cards; `default` in the page header and dialogs.
- **One filled primary per region**: the action that moves the work (New deal, Convert, Save). Everything beside it is `outline` or `ghost`. An `lg` button appears only on an empty state.
- **A word beside every glyph** where there is room; icon-only only in a dense toolbar, with `aria-label`.
- Status: a small dot plus the word in ink, on a 10% wash (`• New`). Late or blocked: the word in its tone (`No response yet`).
- Filters are removable chips under the toolbar, with `Clear all`.
- Switches, segmented controls and tabs are the kit's, at `sm` in toolbars.
- **Counts** are ink-3 numbers; a count that waits on the person is a small pen-coloured pill.

**Data display**

- **Tables:** 46px rows (38 compact), 14px text, header 11px ink-3 on sunken, sortable headers show a caret, name column first and flexible, money right, dates relative (`4w ago`) then absolute past a month. Selected row: pen at 7%.
- **A score or level:** the number, then a three-step bar meter, then its word (`61 ▂▄_ Warm`). Its reasons are listed where the record opens.
- **Figures at page level** in display: `$442.9K open pipeline · $119.5K weighted`; the label always says which number it is.
- **Charts:** ink for the main series, the pen for "this period / you", tones for meaning, dashed gridlines, no gradients, no 3D, no pie past four slices.

## Layout Principles

The page structure comes from the shells in `design-catalogue/shells/`; this system suits **sidebar**, **top bar**, **rail and list** and **command-first**. How it draws each navigation piece is in the patterns.

- **Page header**: chosen by the page's job, from `minimal/patterns/page-header.md` or designed anew; pages of one app need not share one.
- Air between regions, density inside them; spacing comes from the tree (`docs/ai/board.md`), never written.

## Depth & Elevation

Lines, plates, padding and icons follow `docs/ai/clean-ui.md`; where a card appears and where it does not is `minimal/patterns/cards.md`. Under `edges: fill` a plate is a 3% step from the page; under `edges: outline` it is a hairline on the page colour. A shadow belongs only to a plate that floats.

## Do's and Don'ts

- Suits: CRMs, trackers, admin, finance, operations, analytics, any product a person works in daily.
- Weak for: landing pages (use `minimal-landing`), photo-led feeds, playful consumer apps, a mobile app of a few big objects.
- The rules a copy most often breaks are under Never.

## Responsive Behavior

On a phone a table row becomes two stacked lines. `density: compact` tightens rows to 38px, UI text to 13px and every spacing step by one.

## Agent Prompt Guide

This file is the look. The `minimal/patterns/` files show how this system solves each task of a product, often in several variants. **They are patterns, not orders.** Read the patterns the product needs, take what fits the person's task, and where nothing fits, design your own piece in the same look. Every system is built on the kit; `docs/ai/clean-ui.md` holds under all of it.

| Pattern                                  | Read it when the product needs                                   |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `minimal/patterns/navigation-sidebar.md` | a navigation column: simple, sectioned, tree, rail and list      |
| `minimal/patterns/navigation-header.md`  | navigation across the top                                        |
| `minimal/patterns/page-header.md`        | what opens a page: a status header, a hero header                |
| `minimal/patterns/aside.md`              | a right column that explains a page or a record                  |
| `minimal/patterns/in-page-navigation.md` | tabs, a contents list, steps, anchors                            |
| `minimal/patterns/breadcrumbs.md`        | pages two or more levels deep                                    |
| `minimal/patterns/navigation-logic.md`   | how addresses, back, selection and keyboard behave               |
| `minimal/patterns/search.md`             | a command menu, a results page, search in a list                 |
| `minimal/patterns/notifications.md`      | toasts, a bell, banners, a sidebar notice, badges                |
| `minimal/patterns/page-widths.md`        | reading, working and split pages                                 |
| `minimal/patterns/collections.md`        | many items of one kind: table, list, card grid, row, view switch |
| `minimal/patterns/cards.md`              | when a card appears and when it does not                         |
| `minimal/patterns/motion.md`             | how every interaction moves: timing, easing, CSS or Motion       |
| `minimal/patterns/settings.md`           | a settings area and how it saves                                 |
| `minimal/patterns/footer.md`             | how each kind of page ends                                       |
| `minimal/patterns/colour-monochrome.md`  | colour level 1: ink on paper, tones only for meaning (default)   |
| `minimal/patterns/colour-spot.md`        | colour level 2: one hue spent on a few things                    |
| `minimal/patterns/colour-art.md`         | colour level 3: a monochrome UI with a few colourful art objects |
| `minimal/patterns/typography.md`         | the font pairs, one per product                                  |

## Colour algorithm

OKLCH. Light first, dark beside it; each theme is stepped against its own surfaces, never inverted.

| Step                | Job                                                | Light                                        | Dark                  |
| ------------------- | -------------------------------------------------- | -------------------------------------------- | --------------------- |
| page                | the ground                                         | `white` ground: L 1.00 · `grey`: L 0.96–0.97 | L 0.15–0.17           |
| plate               | cards, sheets, popovers, a filled sidebar          | `white`: L 0.97 · `grey`: L 1.00             | page + 0.03           |
| sunken              | table header, wells, inactive segment              | page − 0.025                                 | page + 0.015          |
| hover / pressed     | row hover, pressed control                         | page − 0.03 / − 0.06                         | page + 0.05 / + 0.08  |
| line                | lines between rows, cells, shell regions           | L 0.90–0.92                                  | L 0.26–0.28           |
| line-strong         | outlined buttons                                   | L 0.84–0.86                                  | L 0.32–0.34           |
| control             | an input's border: often the only thing marking it | ≥ 3:1 against its plate                      | ≥ 3:1                 |
| ink / ink-2 / ink-3 | text, secondary, tertiary                          | L 0.18 / 0.42 / 0.50                         | L 0.93 / 0.76 / 0.68  |
| pen                 | the accent                                         | any hue, L 0.40–0.48, C 0.08–0.14            | same hue, L 0.75–0.80 |
| tones               | success, warning, danger, info                     | text in the tone; wash = tone at 10%         | wash at 15%           |

- **The tint is free.** Neutrals may lean toward one hue at chroma ≤ 0.01 (a warm paper, a cool grey). Never a blue-grey by accident.
- **The pen is spent a few times per screen:** the one primary button, links, the focus ring, the selected row (pen at 7%). Nothing else is coloured by it.
- **Colour on a record means something or is absent.** Overdue is danger text, stalled is warning, won is success. A list of statuses is one ink scale, never one colour per status.
- **Text is never faded with opacity.** Grey text is ink-2 or ink-3, so contrast stays measurable.
- Every text pair is ≥ 4.5:1, measured, in both themes.

`tokens.css` declares the parameters (`--hue`, `--chroma`, lightness steps per theme, `--neutral-chroma` for the tint) and every colour as an `oklch()` formula of them in `:root` and in `.dark, .theme-dark`; changing `--hue` re-derives every colour in both themes. The shipped values are an example.

## Imagery

- **Role:** domain content only — a person, a company, an object of the product. Never decoration, never a banner.
- **Marks over pictures:** a company is a rounded square monogram on a muted pigment chosen from its name; a person is a round avatar with initials. A real logo or photo replaces the mark when the record has one.
- A record page may carry one real photo of its object; a collection page carries marks only.
- Sources: the record's own picture, or nothing. Never drawn (`design-catalogue/README.md`).
- **Shapes are flat:** a kit `Shape` is drawn `look="flat"` in ink or one tone, as a quiet marker of a number or a kind. Never the 3D look, a glow or a gradient on it.

## Behaviour

| Kind                                               | Opens in                                        | Why                                              |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| A short write: create, rename, convert, confirm    | `Dialog`                                        | done and gone                                    |
| One record from a list: read it, act several times | `Sheet` from the side, the list still behind it | the person stays; the sheet survives each action |
| The record in full                                 | its own page, one press from the sheet          | for long work on one record                      |

- A dialog says what will happen in one line under its title and again in the footer beside the buttons.
- Every list has an empty state (what the surface is for, one action) and a filtered-empty state (`Clear filters`).
- Frequent writes are optimistic and say nothing on success; a failure says what failed in a toast.

**Motion.** Every interactive element has at least a transition: smooth, non-linear, 120–280ms. CSS transitions by default, Motion only where an element leaves, siblings close a gap or something travels. Nothing moves on load except content arriving. Timing, easing and every interaction are in `minimal/patterns/motion.md`.

## Never

The defaults a generated screen falls into. Each one is refused by name.

- every mistake listed at the end of `docs/ai/clean-ui.md`
- a gradient on any plate, a KPI card per number, a glow
- an indigo or violet accent picked because nothing was chosen
- one colour per status, rainbow tags
- text faded with opacity
- a table or calendar inside a card
- a second filled button in a region
- an icon with no word where a word fits
- a shadow on a plate that does not float
- a 3D shape (`Shape` with its default `look="3d"`), or the kit's `EmptyState` with its 3D cluster
- a banner picture, a stock illustration, a drawn picture
- the display serif on body text, buttons or table cells
