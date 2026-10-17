# Pill

## Visual Theme & Atmosphere

A tool that talks back loudly: every control is a pill, every group is a tight grey container holding big white plates, and the one answer that matters is a full-bleed blue card beside a near-black one. Contrasting padding is the idea: containers hug their contents (6px), the buttons inside them are large (48–52px), so the shapes, not lines or shadows, say what belongs together.

References, numbered in `references/`:

| File             | Read it for                                                                             |
| ---------------- | --------------------------------------------------------------------------------------- |
| `1-loud.png`     | the signature: a blue hero card beside a black card, white pill buttons, blue send      |
| `2-calm.png`     | the same chat and canvas without the hero, the quiet default of every screen            |
| `3-menus.png`    | strict menus: 36px rows, 12px corners, one hairline edge, one soft drop                 |
| `4-messages.png` | user and assistant turns, tool rows, a diff, running, failed, a question, a result card |
| `5-text.png`     | headings, body, lists, inline code, a code block, a quote, a table, keys, the scale     |

Settings a product picks once and a person may switch later:

| Setting | Values          | Default | What changes                                             |
| ------- | --------------- | ------- | -------------------------------------------------------- |
| `hue`   | any             | 266     | the brand card, the send button, washes, rings           |
| `voice` | `loud`, `calm`  | `loud`  | `loud` lets one result per turn stand as a brand card    |
| `font`  | `geist`, `host` | `geist` | `host` takes the host's interface font on the same scale |

Everything else is fixed.

## Color Palette & Roles

| Role                                                                                                                     | Step                                                |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `background`, `sidebar`                                                                                                  | page                                                |
| `foreground`, `card-foreground`, `popover-foreground`, `secondary-foreground`, `accent-foreground`, `sidebar-foreground` | ink                                                 |
| `muted-foreground`, `ink-muted`, `neutral`                                                                               | ink-muted                                           |
| `group`, `card`, `secondary`, `muted`, `fill`, `sidebar-accent`                                                          | plate                                               |
| `accent`, `fill-hover`                                                                                                   | plate stepped                                       |
| `raise`, `group-inset`, `popover`                                                                                        | raise: white in light, a lifted grey in dark        |
| `group-line`, `sidebar-border`                                                                                           | line                                                |
| `border`, `input`                                                                                                        | edge                                                |
| `primary`, `sidebar-primary`                                                                                             | contrast: near-black in light, near-white in dark   |
| `primary-foreground`, `sidebar-primary-foreground`                                                                       | on-contrast                                         |
| `brand`, `ring`, `sidebar-ring`, `chart-1`                                                                               | brand                                               |
| `brand-foreground`                                                                                                       | white, in both themes                               |
| `accent-wash`, `accent-wash-hover`                                                                                       | brand mixed into the page                           |
| `red` … `pink`; `destructive`, `success`, `warning`, `info`, `note`, `standout`, `highlight`                             | tones: red, green, yellow, blue, cyan, pink, yellow |

Three fills carry a screen: the plate (grey container), raise (the white plate inside it) and contrast (the black card, the chosen tab, the current workspace). The brand is spent once per turn.

## Typography Rules

Geist 400, 500 and 600, bundled; the host's interface font behind it.

| Step       | Size / weight | Tracking  | Use                                         |
| ---------- | ------------- | --------- | ------------------------------------------- |
| Display    | 34–36 / 500   | −0.03em   | the one figure on a brand card              |
| Card title | 22 / 500      | −0.02em   | a black card's statement                    |
| Heading    | 20–22 / 600   | −0.02em   | a heading inside an answer                  |
| Subheading | 16 / 600      | 0         | a section of an answer                      |
| Body       | 14 / 400      | line 1.55 | messages, rows                              |
| Secondary  | 13 / 400      | 0         | tabs, menu rows, hints                      |
| Meta       | 12 / 400      | 0         | counts, durations, file names, ink-muted    |
| Label      | 11 / 500 caps | +0.06em   | a section label in a sidebar or menu, faint |
| Code       | 12.5 / mono   | 0         | inline on the plate fill, 6px corners       |

Weight, not colour, ranks text: a value is 500 or 600, its label 400 and ink-muted.

## Component Stylings

- **Every control is a pill** (999px). Large: 52px (send, attach, a card's action). Medium: 48px (rail tiles, canvas header). Small: 36–40px (header buttons, tabs, sidebar rows). Tiny: 32px (collapse, copy, stop).
- **Containers are tight, plates are big:** a container is the plate fill, 34px corners, 6px padding; the plates inside it are 28px; rows inside a container are white pills.
- **Primary** is contrast with on-contrast text: the agent picker, the chosen tab, the current workspace, a black card's button in dark.
- **Secondary** is the plate fill with ink; on a plate it is raise (white).
- **The send button** is the brand, round, 52px; the composer is a plate pill with the field bare inside it.
- **A brand card** is the brand with white text, a translucent chip (white at 18%) for its label, white round buttons (52px) with brand-coloured glyphs.
- **A contrast card** is primary with on-contrast text and one on-contrast pill button.
- **A tool row** is a white pill on the plate: a 40px round mark (wash with a brand glyph for a read, brand for a write, contrast for a run), the sentence, a meta value or a tone chip at its end.
- **Tone chips** are 24–26px pills: the tone's wash with the tone's ink. A failure is a tone container (error wash, 30px corners) with a 52px round tone mark and a white action pill.
- **Menus** are raise with one hairline edge (`border`), 16–20px corners, 6px padding, 36px rows on 12px corners; the chosen row wears the plate fill; shortcuts and "Soon" are faint at 11px.
- **Tables** stand on a white plate inside a plate container; header ink-muted 500; rows split by `group-line`.

## Layout Principles

- **Contrasting padding:** the padding of a container (6px) is always smaller than the controls it holds (36–52px). Never pad a container as wide as its contents are tall.
- **Gaps step down with depth:** 8px between messages, 6px between plates in a container, 2px between rows of a list.
- **One loud thing per turn:** a brand card stands for the result; everything else is plate and raise.
- **A container is a column or a row of plates, never a plate of plates of plates:** two levels at most, container then plate.
- **A card has a shape and fills its row:** `wide` is 3 / 2 (`--shape-wide`), `square` 1 / 1 (`--shape-square`), `band` 5 / 2 (`--shape-band`), `strip` one row as tall as a large control plus two frames (`--shape-strip`) with its eyebrow, headline and action inline. Cards always fill the column; the shape comes from how the width is split and from the ratio, never from a cap or from the content. Where the card space is 560px or wider, a pair splits 3fr / 2fr, so the hero is `wide` and the side card `square` at the same height; a card alone is a `band`. Narrower, cards stack at full width: the hero `wide`, the side card a `strip`. A plate is exactly as wide as its cards, never a lone card beside empty space. The space is measured by a container query, never the viewport, and the headline follows the card in container units.
- **A second card carries a decision:** only a blocker or a failure stands beside the hero. A tally that needs no answer folds into the hero's chip.
- **A region is a card:** the canvas or any second region sits in a 34px plate container inset from the window, the chat stands on the page.

## Depth & Elevation

- Three fills, no shadows on plates: page, plate (container), raise (plate inside). In dark the order is the same, each step lifted.
- A line stands only between list sections (a sidebar's pages and layers) and under a table head; it is `group-line` and runs to the container's edges.
- The only drop shadow is a menu's: soft, wide, below it, over an edge.
- Corners are concentric: container 34px, plate 28px (34 − 6), a white row in a 30px container is a pill.

## Do's and Don'ts

- Suits: an AI chat, a builder's chrome, a tool that reports progress and asks questions, dashboards with one headline.
- Weak for: dense data tables, a reading app, a calm journal (use `default` or `minimal`).
- Do keep containers tight and controls big; give each turn at most one brand card; let the black card hold the blocker or the question.
- Don't put a border on a plate, square a control, pad a container by more than 8px, use the brand for two things in one view, or put white text on anything but the brand or contrast.

## Responsive Behavior

Below 480px a card row stacks: the brand card on top, the contrast card under it at full width. Controls keep their height; labels shorten before buttons shrink. A rail folds to its marks, a sidebar to its toggle.

## Agent Prompt Guide

Read `USAGE.md`, then this file, then `tokens.css`; copy `tokens.css` with `widgetarium system use pill` and change only `--hue`. For a chat, follow `references/4-messages.png` for turn shapes and `5-text.png` for answer text; for chrome, `1-loud.png` and `3-menus.png`. Design the product's structure first; these pictures show shapes, not screens.

## Colour algorithm

OKLCH. Every neutral carries the brand hue at a whisper of chroma (`--neutral-chroma` 0.006), so changing `--hue` tints the greys too.

| Step          | Tokens                                        | Light                                                      | Dark                              |
| ------------- | --------------------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| page          | background, sidebar                           | L 1.00, C 0                                                | L 0.16, C n                       |
| plate         | group, card, secondary, muted, fill           | L 0.961, C n/3                                             | L 0.215, C n                      |
| plate stepped | accent, fill-hover                            | plate − 0.03                                               | plate + 0.04                      |
| raise         | raise, group-inset, popover                   | L 1.00                                                     | L 0.265                           |
| line          | group-line, sidebar-border                    | L 0.944                                                    | L 0.255                           |
| edge          | border, input                                 | L 0.898                                                    | L 0.33                            |
| ink           | foreground                                    | L 0.196, C n                                               | L 0.965                           |
| ink-muted     | muted-foreground, neutral                     | L 0.538, C 2n                                              | L 0.72                            |
| contrast      | primary, sidebar-primary                      | L 0.294                                                    | L 0.965                           |
| on-contrast   | primary-foreground                            | L 1.00                                                     | L 0.196                           |
| brand         | brand, ring, chart-1                          | hue 266, L 0.49, C 0.247                                   | same                              |
| brand-hover   | brand-hover                                   | L 0.44 (darker)                                            | L 0.55 (lighter)                  |
| wash          | accent-wash                                   | brand 12% into page (hover 20%)                            | brand 22% into page (hover 30%)   |
| tones         | red orange yellow green cyan blue purple pink | fixed hues, L and C from `--l-tone` 0.58 / `--c-tone` 0.16 | `--l-tone` 0.68 / `--c-tone` 0.15 |

- **Free:** `--hue`. **Fixed:** the tone hues and meanings (success green, error red, warning yellow).
- **The brand carries white text in both themes,** so its lightness is held at 0.49: at that step every hue in the 30° sweep keeps 4.5:1 under white; the reference blue (#2E5BFF, L 0.55) failed it at cyan.
- **Dark is designed, not inverted:** the shell goes near-black, plates lift by steps, the brand stays the same blue, and contrast turns near-white, so the chosen tab, the current workspace and the black card become white pills and white cards on black.

## Imagery

- **Role:** none forms the design; the chrome is shapes and type. Content pictures (a page frame, an attachment) stand on raise with 18px corners.
- **Kind:** screenshots of the product's own pages; for another domain, the domain's real photos, CC0, cropped square or 4:3, never on the brand card.
- Pictures are found, never drawn; a missing one is a labelled placeholder on the plate fill.

## Behaviour

- A pill answers a press by shrinking (scale 0.96) and springing back; nothing moves on load.
- A tool list folds under its head row; the fold animates height, 200ms, standard ease.
- A running row shows its seconds counting and a Stop pill; a finished turn ends in a status line with a tone dot.
- Menus grow from the pressed pill, 160ms; the chosen row moves its plate rather than fading.
- Live updates replace text in place; a brand card arrives once, when the turn ends.

## Never

- a border on a plate, a square control, a container padded wider than 8px
- a cast shadow under anything but a menu
- the brand on two things in one view, white text on the plate or raise
- a gradient, a violet accent nobody chose
- a hardcoded colour instead of a token
- a grey card inside a grey card inside a grey card
