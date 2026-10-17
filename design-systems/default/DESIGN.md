# Quiet and strict

## Visual Theme & Atmosphere

The Widgetarium kit's own look: the system every app and the Obsidian plugin get when none is chosen. The page is the theme's colour; a group of things that answer one question stands on a faint grey plate with no edge; type and space do the rest. Quiet, because almost nothing is coloured or outlined; strict, because every colour, gap and corner comes from the kit and none is written by hand.

The practice is taken from Material 3 Expressive and Apple's current system, never their look: **maximalist, physical, answering.** Big controls, large corners, generous spacing; shape carries the accent as much as colour; motion is the answer to a press. Their runtimes, colour roles and base components are refused: colours come from `--wg-kit-*`.

A system chosen for an app replaces this one; everything here also holds under it unless that system says otherwise, because `docs/ai/clean-ui.md` and the kit's plate laws are shared.

## Color Palette & Roles

Each role is the token name the system binds, and the step of the Colour algorithm it takes.

| Role                                                                                                                                | Step                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `background`, `sidebar`                                                                                                             | page                                         |
| `foreground`, `primary`, `card-foreground`, `popover-foreground`, `sidebar-foreground`, `secondary-foreground`, `accent-foreground` | ink                                          |
| `primary-foreground`                                                                                                                | page                                         |
| `neutral`                                                                                                                           | neutral                                      |
| `muted-foreground`, `ink-muted`                                                                                                     | ink-muted                                    |
| `card`, `group`                                                                                                                     | group                                        |
| `group-line`, `sidebar-border`                                                                                                      | line                                         |
| `border`, `input`                                                                                                                   | edge                                         |
| `secondary`, `muted`, `fill`                                                                                                        | fill                                         |
| `accent`, `fill-hover`                                                                                                              | fill-hover                                   |
| `popover`, `group-inset`, `raise`                                                                                                   | raise                                        |
| `brand`, `ring`, `sidebar-ring`, `chart-1`                                                                                          | brand                                        |
| `brand-foreground`                                                                                                                  | ink: never white on the brand                |
| `sidebar-primary`                                                                                                                   | ink                                          |
| `accent-wash`, `sidebar-accent`                                                                                                     | accent-wash                                  |
| `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`                                                                | tones                                        |
| `destructive`, `success`, `warning`, `info`, `note`, `standout`, `highlight`                                                        | red, green, orange, blue, cyan, pink, yellow |
| `chart-2`, `chart-3`, `chart-4`, `chart-5`                                                                                          | blue, cyan, orange, pink                     |

The primary is ink, not the brand: a primary button is the kit's `variant="primary"`, never a hand-painted black, which disappears in dark mode. Two text colours carry everything: `--wg-kit-text` and `--wg-kit-text-muted`.

## Typography Rules

The host's interface font, on the kit's four text sizes: `--wg-kit-text-xs|s|m|l`, 11px and the host's three UI steps.

| Step    | Use                                     | Size                              |
| ------- | --------------------------------------- | --------------------------------- |
| Display | the hero title or the page's one number | 3–3.6× body, tight tracking, bold |
| Title   | a page or an opened record              | 2× body                           |
| Section | a region's heading                      | 1.4× body                         |
| Body    | rows, text                              | the host's size                   |
| Label   | meta, captions, counts                  | small, grey                       |

- **One display element per page**: the hero title or the page's one number.
- **Values black, labels grey and small**; counts sit beside headings in grey.
- Uppercase only as `docs/ai/clean-ui.md` allows: a short, small, tracked, muted label for something louder.
- Sentence case; a button says the verb (`Add habit`, never `OK`). Numbers carry their unit, and their trend when they have a history.
- An `h1` or `h2` inside a widget belongs only to a `text` or `layout` role; a region title stands beside the plate as markdown.

## Component Stylings

Every element is a kit component; the system decides which, where and how much.

- **Controls are big**: 34, 42 and 52px tall; a pill is fully round (999px). The kit's controls paint fill and corner on a `::before`; the element itself has no radius.
- **Primary is the kit's primary button**, one per page, where the eye ends. Secondary actions are grey pills or text links (`See all ›`). No purple buttons unless the person asked for colour.
- **A card's one action is a round icon button on its corner**; quick actions are three to five round buttons with a label under each.
- **Badges are grey**, frosted on a photo; colour only when the person must act; one per row, and a badge on more than a third of the rows is dropped.
- **A control is not a plate**: a field, a switch, a count keep their own darker grey (fill).
- **Rows** are leading · title · one grey supporting line · trailing value (`Row`, `RowText`, `RowSupporting`, `RowValue`); never a third line. Rows of data stand on the page with a line between them (`ItemGroup`).
- **Forms show the choices**: up to about eight options are chips or a radio list; the value the form is about is drawn large.
- **Icons** are names the kit resolves (`<Icon name="anchor"/>`): the kit's 35 glyphs first, Lucide behind them, stroked to the 20 grid. Obsidian's own icon set is refused.
- **Charts** are the kit's: a soft area under a line, a dotted pace line, a few bars; progress bars black, red when over.

## Layout Principles

- **The shell is chosen once per app**, from `docs/ai/design-system.md`'s table: `sidebar`, `rail + list`, `tabs`, `sidebar + inspector` or `none`, 1440 wide at most, its navigation flush.
- **A page starts from an archetype** (`home`, `index`, `record`, `dashboard`, `form`, `workspace`) or builds its own structure inside `Container`; it never sets a width of its own.
- **Spacing is read off the tree, never written:** children stand 24px apart in a region, 16px one box down, 8px deeper, one step closer after a `text` widget and between repeats of one widget. Grouping is the only decision.
- **Padding order:** the gap inside a plate < the plate's padding ≤ the gap between plates.
- **One focal point** per page; at most five sections; at most two lists stacked in one column; a line of text holds at most 75 characters.
- **A widget prefers a size and is promised none**; only a region is sized by hand, and only across.

## Depth & Elevation

Three surfaces, and most of the screen wears the first: none, `apart` (one 1px line on one side, no plate) and `group`.

- **The page is the theme's colour; a `group` is ink at 3% with no edge.** A `group` on another `group` turns white (raise). Two plates deep from the region at most; a plate whose every child wears a plate is refused.
- **Only a repeat earns a plate**: the same widget beside it again, or a box of several of the same thing. A single thing stands bare. A grid gives every cell its own plate; the grid wears nothing.
- **A tone replaces the plate's grey** for a state: warning, error, success or the accent.
- **Corners are concentric:** a plate's radius is 14px at the tile and steps inward by the padding between them, re-laid on every change; never written by a widget.
- **Raise** lifts 12% toward white, with an edge and no cast shadow: popovers, collapsed boxes drawn as drawers and sheets over a `--wg-overlay-scrim`.
- **A line divides; it never outlines.** It stands between a sidebar and the content, between sections, between the items of an `ItemGroup`; inside a plate it runs to the plate's edges. The only outline is a control's.
- There is no line between regions: the gutter is the boundary.

## Do's and Don'ts

- Suits: any app or board nobody has chosen a system for, and the plugin's own chrome.
- Weak for: a product that needs a brand voice, a marketing page (`minimal-landing`), a photo-led feed.
- Do give every node its surface as it is placed, every list an empty state, every press a destination that is drawn.
- Don't lay a plate because a widget stands alone, write a gap or a radius, or add a badge to every row.

## Responsive Behavior

Nothing is chosen by breakpoint. A box that does not fit collapses into what it declares — `stack`, `drawer`, `sheet`, `menu` or `hide` — opened from the host's header or from a toggle it names; its widgets stay mounted while shut. A widget's preferred size steps by the width of the region it stands in, never the screen. A sidebar folds to an icon rail, never to nothing.

## Agent Prompt Guide

Read `docs/ai/surfaces.md` before placing a node and `docs/ai/clean-ui.md` before drawing; `docs/ai/design-system.md` holds the numbered rules this look is checked by. Choose the shell and each page's archetype first, then give every node its surface, then fill widgets from the kit. Run `widgets.mjs lint` after every write and `widgets.mjs rules <app>` before showing a design.

## Colour algorithm

OKLCH. Light first, dark beside it.

| Step              | Token                                                                                                                                                                                                  | Light                                                                   | Dark             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------- |
| page              | background, sidebar                                                                                                                                                                                    | L 1.00                                                                  | L 0.226          |
| ink               | foreground, primary, card/popover/sidebar foregrounds                                                                                                                                                  | L 0.252                                                                 | L 0.888          |
| neutral           | neutral                                                                                                                                                                                                | L 0.475                                                                 | L 0.767          |
| ink-muted         | muted-foreground                                                                                                                                                                                       | neutral mixed 94% into page                                             | same             |
| group             | card, group                                                                                                                                                                                            | ink at 3% alpha                                                         | same             |
| line              | group-line, sidebar-border                                                                                                                                                                             | ink at 7% alpha                                                         | same             |
| edge              | border, input                                                                                                                                                                                          | ink at 9% alpha                                                         | same             |
| fill / fill-hover | secondary, muted / accent                                                                                                                                                                              | ink mixed 5.5% / 10.5% into page                                        | same             |
| raise             | popover, group-inset                                                                                                                                                                                   | white mixed 12% into page                                               | same             |
| brand             | brand, ring, sidebar-ring, chart-1                                                                                                                                                                     | hue 293, L 0.654, C 0.190                                               | L 0.604, C 0.218 |
| brand-hover       | —                                                                                                                                                                                                      | L 0.706, C 0.159                                                        | same             |
| accent-wash       | sidebar-accent                                                                                                                                                                                         | brand mixed 12% (hover 20%) into page                                   | same             |
| tones             | red orange yellow green cyan blue purple pink; destructive = red, success = green, warning = orange, info = blue, note = cyan, standout = pink, highlight = yellow; chart-2..5 = blue cyan orange pink | fixed hues, lightness and chroma from `--l-tone` / `--c-tone` per theme | brighter, softer |

- **Free:** the hue (`--hue`) and the neutral tint (`--neutral-chroma`, 0 by default).
- **Fixed:** the tone hues and their meanings.
- **The brand is 3.5:1 against white**, so text on a brand fill is ink (`brand-foreground`), never white.
- **Colour means something or is absent:** the brand and the status tones, nothing else. A tone is a state of a plate, never a kind of one, and never the only signal.

`tokens.css` declares the parameters (`--hue`, `--chroma`, lightness steps per theme, `--neutral-chroma` for the tint) and every colour as an `oklch()` formula of them in `:root` and in `.dark, .theme-dark`; changing `--hue` re-derives every colour in both themes. The shipped values are an example.

## Imagery

- **Pictures are found, never drawn:** real photos from the record or CC0 sources, ready vector line art used as it is, the kit's icons, or a labelled placeholder (`design-catalogue/README.md`). Code draws only data and interface geometry.
- **One kind of imagery per app**, by what it is about: real photos for places, things, people and media; calm photos for a life area or a plan; abstract colour fields for routines; none for money, numbers and work.
- **Shape carries the accent:** one unusual form per widget, from the kit's 35 Material shapes (`Shape`), on the thing the eye is looking for.
- **An emoji is a drawing:** `<Emoji name="…"/>` from `widgetarium/kit/emojis`, the 129 Fluent faces, and only for a feeling, a reaction or text the person typed. Everywhere else, an icon.
- Text on a photo stands on a dark fade at its bottom edge.

## Behaviour

- **Motion is the answer to a press**, never decoration on load: springy, interruptible, immediate, a control that moves under the finger. Nothing animates because a screen appeared.
- A collapsed box grows from the point that was pressed; whether it is open is a fact of the screen, never written to the note.
- Whatever looks pressable answers a press, and a press leads somewhere that is drawn.
- A command that writes runs only once the person switched it on; a switched-off one says so on the tile.
- An empty collection gets a sentence and one action, a failed read its reason; a widget never goes blank.

## Never

- a colour written by hand instead of a `--wg-kit-*` token
- a border on a group plate, or a line around a card, a cell or a picture
- a cast shadow on a plate
- an unchosen violet as a product's accent: the brand hue is the kit's until a product picks its own
- white text on the brand fill
- a plate around one figure, a grid of two or three plates, grey on grey, a third plate level
- a gap, a radius or a height written by hand
- an icon on every element, or no icon on a list of kinds; an emoji as decoration
- a drawn picture, a traced photo, a stock illustration
- motion on load
- every mistake listed at the end of `docs/ai/clean-ui.md`
