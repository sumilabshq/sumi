---
id: frosted
title: Frosted
source: "the person's own reading of one studio's dashboards and mobile apps (audit log, credit, cash management, health)"
credit: "[AUTHOR — add the studio and links before anything is published] (refs 1–15)"
kit: "@widgetarium/kit — every element is a kit component; the pill and blur parts this system needs are TODO in the kit"
centre: [information, function]
activity: [track, browse, operate]
photogenic: [no, objects]
session: [glance, browse]
density: [low, medium]
tone: [calm, premium, quiet]
device: [desktop, phone, both]
---

# Frosted

## Idea

A quiet product where **only the chosen thing has a body**. Everything at rest is grey text on a soft ground; the one item that is selected — a page, a tab, a filter, an opened record — turns black, gets a pill or a card, and is the only filled shape in its row. Hierarchy is carried by type size and the black/grey step, never by colour and rarely by lines.

The material is **frost**: soft grey grounds, blurred plates, and, as an option, a wash of colour glowing through them. Shapes are round: pills and large radii.

For products a person glances at and drills into: overviews, logs, trackers, money, health. A dense all-day work tool is better in Minimal.

## How to use this system

This file is the look. Take what fits the person's task; where nothing fits, design your own piece in the same look. Every system is built on the kit; `clean-ui.md` holds under all of it, except where this file says otherwise about plates **and lines**: here no line stands inside a plate or between rows, and a strip of figures is figures spaced apart, never split by lines.

## References

Take the feel, never the page.

| File                             | Read it for                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `1-overview-type-led.webp`       | the whole look: pill navigation with one black item, a light display title, one giant figure, no cards     |
| `2-overview-angle.webp`          | the same page: how little ink there is, the neon status pills as the only colour                           |
| `3-page-hero-divider.webp`       | the page hero ending in one full-width hairline: the only kind of line this system draws                   |
| `4-table-no-lines.webp`          | a table with no row lines: rhythm from spacing, grey headers, one status mark in colour                    |
| `5-grey-pill-controls.png`       | controls at rest: grey pills, no outline, a value beside the label                                         |
| `6-phone-grid-and-detail.webp`   | the cards variant on a phone: a grid of frosted tiles; the chosen one opens over the grid                  |
| `7-phone-opened-card.webp`       | an opened tile: a frosted plate with soft colour behind it, facts as label–value pairs, one white circle   |
| `8-cards-variant-blur-wash.webp` | the cards variant on desktop: frosted plates, two cards washed in colour, one black pill in the navigation |
| `9-colour-wash-sheet.webp`       | the colour wash at full strength: a blurred gradient plate, white type over it                             |
| `10-white-card-on-frost.png`     | a white card on a frosted ground, a large radius, one small warning mark                                   |
| `11-icon-rail.png`               | a rail of circled icons with no fill, an avatar at the bottom                                              |
| `12-mark-and-menu.png`           | the product mark and a circled menu button                                                                 |
| `13-cards-dark-feature.webp`     | one dark feature plate among warm grey cards; the accent as a single acid-green series                     |
| `14-objects-and-one-pill.webp`   | soft round plates, a found object picture, one tinted pill as the label                                    |
| `15-record-figures.webp`         | a record led by a big figure, small grey labels                                                            |

## Settings

Values the agent picks for a product and the person may change later with one switch. `settings.json` beside this file lists them for the canvas.

| Setting  | Values            | Default    | What changes                                                                                                     |
| -------- | ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `plates` | `none` · `cards`  | `none`     | `none`: content stands on the ground, type and space group it. `cards`: groups sit on frosted plates (refs 6, 8) |
| `ground` | `frost` · `white` | `frost`    | a 95–96% cool grey page, or white                                                                                |
| `wash`   | `off` · `on`      | `off`      | `on`: one or two plates per screen show a blurred gradient of colour behind their glass (refs 7–9)               |
| `accent` | `none` · `neon`   | `neon`     | `neon`: one acid hue (lime, violet) on status pills and one chart series; `none`: status in ink only             |
| `fonts`  | a geometric sans  | by product | Light (300) for display, Regular for text; one family                                                            |

**Choosing `plates`:** `none` when the page leads with one figure, a chart or a table (an overview, a log); `cards` when the page is a set of separate objects the person opens one by one (accounts, medicines, loans, sessions on a phone).

## Navigation and selection

The rule that makes this look: **at rest, nothing has a background.**

- **Top navigation** is a row of words in ink-2 with no plates; the current page is a black pill with white text (ref 1). Only one item in the row has a body.
- **A sidebar or rail** follows the same rule: items are an icon in a thin circle or a grey word; the current one is filled black (ref 11). A word sidebar opens from the menu button (ref 12).
- **Top pills or a rail:** top pills when the app has up to seven sections and its pages lead with type (refs 1, 8); a rail of circled icons with an avatar at the foot when it has more sections or its pages are records (ref 11). One app uses one of them.
- **Tabs** are grey words. The chosen one is black and underlined (ref 1, `Authorized`), or a black pill (ref 1, `1M`). Tabs switch views, filter a list and pick a period alike — one mechanism for all three.
- **Filters and toolbars** are grey pills with no outline: `Filters`, `Export CSV ⌄`, `Page size 15 ⌄` (ref 5). A pill shows its current value beside its label.
- **Selected content** — an opened row, a picked card — gets the plate or the black fill; its siblings stay bare (ref 7).
- **The rule is for rows of choices** (navigation, tabs, filters, periods, list rows). Under `plates: cards` the tiles are content and carry their frosted plate at rest; the chosen tile is told apart by turning **white** (ref 10) or, with `wash: on`, by being the washed one (ref 7). Never by a border.
- **Buttons at rest are grey pills.** There is no colour primary: the strongest button is black. Use it for the one action that commits; everything else is a grey pill or a circled icon.

## Page hero and layout

- **Hero:** a light display title (300 weight, 40–56px) with one grey line under it; a small note or link on the right. The hero ends in one full-width hairline (ref 3).
- **One figure leads an overview:** a giant light number (96–120px) with its month under it in ink-3, beside two or three small figures with their change pills (ref 1). The small figures stand left in a row; the giant one is centred over the chart it summarises.
- **Charts are the canvas:** a full-width line or bar chart with a soft range brush under it, period pills centred below (ref 1). Markers on the chart are round pills with an icon.
- **Content below the hero obeys the tabs:** tabs on the left, a count pill (`237 Items`) and a search pill, then the list (ref 4).
- **Phone:** a top bar of two circled buttons around a centred title; tabs become a large swipeable title row where the next tab is cut off grey (refs 6–7).

## Lines and plates

- **Lines are rare and only divide screens:** the sidebar from the content, the hero from the content. A table has no row lines and no outer border; spacing is the row (ref 4).
- **`plates: none`:** groups are made by space and a small grey label. No plate around figures, no plate around the chart.
- **`plates: cards`:** a group sits on a frosted plate — the ground lightened 4–6% with a backdrop blur of 24–40px, radius 24–32px, no border, no shadow (refs 6, 8). A white card on a frosted ground is the one allowed lift (ref 10). Cards are tiles of a grid; one tile opens into the full record over the grid.
- **`wash: on`:** a plate shows a blurred gradient of two neighbouring hues behind its glass (ref 9). At most two washed plates per screen, never behind a table. A wash belongs to one plate, inside its edges; the ground never glows.

## Colour algorithm

OKLCH. Light first; dark beside it.

| Step                | Job                               | Light                                                          | Dark                 |
| ------------------- | --------------------------------- | -------------------------------------------------------------- | -------------------- |
| ground              | the page                          | `frost`: L 0.955–0.965, C ≤ 0.008 cool · `white`: L 1.00       | L 0.16–0.18          |
| glass               | a frosted plate                   | ground + 0.03, 70–85% opacity, blur 24–40px                    | ground + 0.05        |
| pill                | a control at rest                 | ground − 0.03                                                  | ground + 0.06        |
| ink / ink-2 / ink-3 | chosen text, quiet text, labels   | L 0.15 / 0.50 / 0.62                                           | L 0.95 / 0.70 / 0.58 |
| chosen              | the one filled item in a row      | ink (near black), text white                                   | L 0.95, text black   |
| line                | the few screen dividers           | L 0.90                                                         | L 0.27               |
| neon                | status pills and one chart series | lime L 0.90 C 0.20 · violet L 0.50 C 0.25                      | same hues, L −0.05   |
| wash                | the glow behind a washed plate    | two neighbouring hues, L 0.70–0.85, C 0.08–0.14, blurred 60px+ | L 0.40–0.55          |

- **Black is the primary.** The chosen item, the committing button, the selected period are ink-filled. No hue does that job.
- **Colour is information, with two named exceptions.** Information: `+33%` on lime, `-22%` on violet, a green check for finished. Exceptions: the one chart series that is the page's subject (and the range it highlights), and a wash when `wash: on`. Nothing else is coloured.
- **What each hue means:** lime = done, up, good; violet = in progress, down, needs a look; a warning is a black triangle, never red.
- **The black/grey step is the hierarchy:** what is chosen or a value is ink; what is at rest or a label is ink-2 or ink-3. Never fade text with opacity.

## Type

One geometric sans (Urbanist, Outfit, Manrope class). Light weights carry size; regular carries reading.

| Role    | Weight | Sizes        | Carries                            |
| ------- | ------ | ------------ | ---------------------------------- |
| figure  | 300    | 96 · 120     | the one leading number of a page   |
| display | 300    | 40 · 56      | page and record titles             |
| heading | 400    | 20 · 24      | a tab row on a phone, a card title |
| text    | 400    | 13 · 15 · 17 | everything else                    |

- Labels are small and ink-3; values beside them are ink and larger.
- Figures are tabular and never bold.

## Controls

- Pills everywhere: height 40–48px on desktop, 44–56px on a phone; fully round.
- An icon-only control is an icon in a thin 1px circle, 44–56px.
- A count is a pill with the number in ink and its word in ink-3 (`237 Items`).
- A status is a small filled circle with an icon (green check, violet clock, black warning) then the word in ink.
- TODO: the kit's pill button, circled icon button, frosted plate and wash plate are needed before this system draws in the kit; until then the canvas draws them by the rules above.

## Behaviour

- A row or a tile opens its record **over the list**, as a frosted plate with a close circle (ref 7); the list stays visible behind the blur.
- Period and filter pills redraw the chart in place; nothing reloads the page.

## Motion

Soft and physical: plates fade and blur in over 220ms, a chosen pill slides to its new place, an opened tile grows from where it stood. Reduced motion keeps only the fades.

## Fit

- Suits: overviews and logs, money and credit, health, trackers glanced at daily, phone-first apps of a few kinds of record.
- Weak for: dense all-day tables of many columns (Minimal), text-heavy reading, products with many simultaneous actions per screen.

## Never

- a background on an item at rest
- a coloured primary button; colour on anything that is not information
- a line between table rows, a border around a plate
- more than one chosen item in a row
- bold figures, heavy display weights
- a wash behind a table or more than two washed plates on a screen
- every mistake listed at the end of `docs/ai/clean-ui.md` that does not contradict `plates: cards`
