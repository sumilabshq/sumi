# Minimal Landing

## Visual Theme & Atmosphere

Minimal's sibling for a page that sells instead of a product a person works in. The same ink, pen, type and refusal of decoration; what changes is the pace. A landing page is read top to bottom once, so it trades density for **white space**, gives every screen **one big action**, and lets a card appear only when it **proves one claim** — a working piece of the product, a person who vouches for it, a price.

What this system does not decide, and leaves to Minimal or to the product: the product screens behind the sign-up, navigation beyond a site header, dark-heavy brand pages, a store or a docs site.

### References

The pictures in `references/`. Take the feel, never the page.

| File                       | Read it for                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `1-page-white-space.webp`  | the whole page: a centred headline, two buttons with one filled, then sections separated by air and a small eyebrow over each title |
| `2-cards-with-purpose.png` | three cards under one claim, each showing the product working (a converter, a photo of users, a receipt), not an icon and a line    |
| `3-rows-as-cards.png`      | testimonials as stacked rows that are cards: a coloured portrait, the quote, a name and a company mark                              |
| `12-one-big-action.png`    | pricing: a serif display headline with the price in it, one control, and a dark estimate plate holding the only button              |

## Color Palette & Roles

Minimal's roles, unchanged: `background` and `sidebar` take page; `foreground` and every `*-foreground` take ink; `card`, `popover`, `group` and `raise` take plate; `group-inset` takes page; `muted`, `secondary` and `fill` take sunken; `accent`, `fill-hover` and `sidebar-accent` take hover; `border`, `group-line` and `sidebar-border` take line; `input` takes control; `muted-foreground` and `ink-muted` take ink-2; `neutral` takes ink-3; `primary`, `brand`, `ring`, `sidebar-primary` and `sidebar-ring` take pen; `accent-wash` is pen at 7%; `destructive`, `success`, `warning`, `info`, `note`, `standout`, `highlight` and `red`…`pink` take the tones; `chart-1` is ink, `chart-2` pen, `chart-3`…`chart-5` tones.

One role is the landing's own: the **inverse plate** (ref 12), a plate at ink with text at page, held for the one block that closes a decision. It reuses `foreground` as its fill and `background` as its text, so it repaints with the theme.

## Typography Rules

Minimal's three roles — display serif, heading in the text family semibold, text in the host's interface font — with the display allowed larger.

- **Display** carries the hero headline and each section title: 44 · 56 · 72, weight 400, tracking −0.02em. A headline may hold the number that sells (`499€/month`, ref 12).
- **Eyebrow:** a small uppercase label with a dot or glyph over each section title (`Why choose us`, ref 1), as `docs/ai/clean-ui.md` allows: short, ink-3, tracked.
- **Lead:** one or two lines of text at 17–20px in ink-2 under a headline, never more than 75 characters a line.
- Prices and figures are tabular; mono only for machine values, as in Minimal.
- Copy: plain, specific, sentence case; a button says the verb (`Get started`).

## Component Stylings

- **One filled button per screen**, the action the page exists for; beside it at most one outlined or ghost one (`Get started free` · `See how it works`, ref 1). Buttons are pill-round and `lg` in the hero and closing blocks, `default` elsewhere.
- **Cards with a purpose** (ref 2): a card holds a working fragment of the product — a form with real values, a receipt, a photo of the people it serves — under a short title and one line. A card with only an icon and a sentence is a row, not a card.
- **Rows as cards** (ref 3): testimonials, steps or plans stack as full-width rows, each a plate holding a picture, the text and its source. They are a list, so they share one width and one rhythm.
- **Logos** of customers stand in one row of equal quiet cells, monochrome.
- **Included / not included** is a check plus the word on a success wash (ref 12), one per row.
- **FAQ** is a numbered list of rows that open in place.

## Layout Principles

- **One screen, one claim:** each section is an eyebrow, a display title, at most one lead line, then its proof. The hero is centred; later sections may set the title left with the lead on the right (ref 1).
- **White space is the separator:** sections stand 96–160px apart; no line or band divides them.
- **A grid of cards is three across at most**, or rows; never a wall of small tiles.
- The page width follows Minimal's `../minimal/patterns/page-widths.md` reading and working widths; the hero text column is narrower than the proof under it.

## Depth & Elevation

Minimal's plates and `docs/ai/clean-ui.md` hold. A plate is a 3% step from the page with no border; a white card inside it is the one nesting (ref 12). The inverse plate is the only plate allowed a soft shadow, because it floats beside what it sums up.

## Do's and Don'ts

- Suits: a product's marketing page, a pricing page, a launch page, a waitlist.
- Weak for: the product itself (use Minimal), a catalogue of many items, a long article.
- Do show the product working inside a card; do keep one filled button per screen.
- Don't add a card that proves nothing, a second filled button, or a coloured band between sections.

## Responsive Behavior

On a phone every grid becomes one column in reading order; rows as cards keep their picture on top; the hero's two buttons stack, the filled one first; the inverse plate follows the control it sums up and stays in reach.

## Agent Prompt Guide

Read Minimal's `../minimal/DESIGN.md` for anything this file does not say: it is the parent system. Write the page as a sequence of claims first, one per screen, each with its proof; only then choose which proofs are cards and which are rows. Use the person's own product fragments and photos as the proof.

## Colour algorithm

Minimal's, unchanged. OKLCH, light first, dark beside it, each theme stepped against its own surfaces.

| Step                | Job                            | Light                                        | Dark                  |
| ------------------- | ------------------------------ | -------------------------------------------- | --------------------- |
| page                | the ground                     | `white` ground: L 1.00 · `grey`: L 0.96–0.97 | L 0.15–0.17           |
| plate               | cards, sheets, popovers        | `white`: L 0.97 · `grey`: L 1.00             | page + 0.03           |
| sunken              | wells, inactive segment        | page − 0.025                                 | page + 0.015          |
| hover / pressed     | row hover, pressed control     | page − 0.03 / − 0.06                         | page + 0.05 / + 0.08  |
| line                | lines between rows             | L 0.90–0.92                                  | L 0.26–0.28           |
| line-strong         | outlined buttons               | L 0.84–0.86                                  | L 0.32–0.34           |
| control             | an input's border              | ≥ 3:1 against its plate                      | ≥ 3:1                 |
| ink / ink-2 / ink-3 | text, secondary, tertiary      | L 0.18 / 0.42 / 0.50                         | L 0.93 / 0.76 / 0.68  |
| pen                 | the accent                     | any hue, L 0.40–0.48, C 0.08–0.14            | same hue, L 0.75–0.80 |
| tones               | success, warning, danger, info | text in the tone; wash = tone at 10%         | wash at 15%           |

- The tint is free at chroma ≤ 0.01; the pen is spent on a link, the focus ring and an eyebrow mark (ref 1 sets one eyebrow word in the pen); the filled button is ink, as in the references.
- Text is never faded with opacity; every text pair is ≥ 4.5:1 in both themes.

`tokens.css` declares the parameters (`--hue`, `--chroma`, lightness steps per theme, `--neutral-chroma` for the tint) and every colour as an `oklch()` formula of them in `:root` and in `.dark, .theme-dark`; changing `--hue` re-derives every colour in both themes. The shipped values are an example.

## Imagery

- **Role:** domain content that proves a claim — the people the product serves, the product's own screens. Never decoration.
- **Portraits** are real photos on a flat colour ground, one hue per portrait (ref 3); product fragments are real UI, not mockups drawn for the page.
- Sources: the product's own screens, the customers' own photos, or CC0 photos graded alike. Never drawn (`design-catalogue/README.md`).

## Behaviour

- A pricing control redraws the estimate in place as it moves (ref 12); nothing reloads.
- An FAQ row opens in place; one open at a time.
- Motion as Minimal: 120–280ms, non-linear, content fades in as it scrolls into view only once; nothing loops.

## Never

- a gradient hero, a glow, a 3D illustration
- a second filled button on one screen
- a card with only an icon and a sentence
- a coloured band or line between sections
- a stock illustration or a drawn picture
- an indigo or violet accent picked because nothing was chosen
- every mistake listed at the end of `docs/ai/clean-ui.md`
