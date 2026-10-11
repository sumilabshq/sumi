# Motion

Everything that answers the person moves; nothing else does. Every interactive thing has at least a transition, and every one is smooth, short and non-linear. Quiet, never playful: no visible bounce.

## Two tools

| Tool               | Use it for                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSS transition** | the default, on every interactive element: hover, press, focus, selected, open and closed states                                                        |
| **Motion**         | only where CSS cannot: an element leaving the tree, siblings closing a gap, an indicator travelling between items, a drag, a spring interrupted mid-way |

With Radix, open and close are animated on `[data-state="open"]` and `[data-state="closed"]` in CSS; Radix keeps the content mounted until a closing keyframe animation ends. Motion is not needed for a popover, a dialog or an accordion.

## Timing

| Step  | Duration | For                                                    |
| ----- | -------- | ------------------------------------------------------ |
| quick | 120ms    | colour, fill and focus on hover and press              |
| small | 160ms    | tooltips, popovers, menus, a switch thumb, a crossfade |
| panel | 220ms    | accordions, dialogs, sheets                            |
| long  | 280ms    | the most anything takes                                |

- Closing takes about 70% of opening.
- **Easing is never linear** except for a spinner or a progress bar.
  - Entering: `cubic-bezier(0.16, 1, 0.3, 1)` (out, fast start, soft landing).
  - Leaving: `cubic-bezier(0.7, 0, 0.84, 0)` (in).
  - Moving within the page: `cubic-bezier(0.65, 0, 0.35, 1)` (in-out).
  - A spring in Motion is critically damped: it lands without overshoot.

## What moves, by interaction

| Interaction                     | Motion                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hover a row, button, chip, icon | the fill fades in, quick; nothing changes size or place                                               |
| Press                           | scales to 0.97, returns over small                                                                    |
| Focus                           | the ring fades in, quick                                                                              |
| Switch, checkbox, radio         | the thumb slides or the mark draws, small, in-out                                                     |
| Tabs, segmented control         | the indicator travels to the new item (Motion `layoutId`, or a CSS `transform`)                       |
| Accordion, collapsible          | height opens through `grid-template-rows: 0fr → 1fr`, the chevron turns with it, content fades, panel |
| Tooltip                         | appears after 400ms, closes at once; fades and rises 4px, small                                       |
| Popover, menu, select           | fades and scales from 0.98 at its anchor's side, small                                                |
| Dialog                          | the scrim fades, the panel fades and scales 0.98 → 1, panel                                           |
| Sheet                           | slides in from its edge, the scrim fades, panel; closes faster                                        |
| A tag, chip or row removed      | fades and shrinks, the neighbours close the gap (Motion `AnimatePresence` + `layout`)                 |
| A row or card added             | fades in and rises 4px, small                                                                         |
| Toast                           | slides in from its edge; the others shift to make room                                                |
| Table ⇄ grid, a filter applied  | the content crossfades, small; cards never fly                                                        |
| Content arriving after loading  | the skeleton crossfades to it, small                                                                  |
| A new page                      | only its content fades in, small; no page slides                                                      |

## Cost

- Animate only `transform`, `opacity` and colours. Never `width`, `height`, `top`, `left` or `margin`; height opens through grid rows.
- `will-change` only while something moves.
- `layout` animations only on lists short enough to see; a table of hundreds of rows does not animate its rows.
- `prefers-reduced-motion`: nothing travels or scales; fades stay, at quick or shorter.

## Never

- Linear easing on an interface move, or an overshoot you can see.
- Anything over 280ms, or anything moving on load except content arriving.
- Motion where a transition does it: a hover, a colour, a simple open and close.
- An interactive element with no transition at all.
