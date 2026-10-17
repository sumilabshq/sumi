# Minimal — usage

## Read Order

1. `USAGE.md`
2. `DESIGN.md`
3. `tokens.css` — copy it as the project's `src/styles/tokens.css` with `widgetarium system use minimal`; change parameters, never formulas.
4. `settings.json` for the spec card, then the `patterns/` the product needs.
5. `references/`

## Design Highlights

- Decoration removed, never information: a 46px-row table of forty records is fine; a gradient is not.
- A card only where it groups; type does the hierarchy.
- One filled primary per region; everything beside it `outline` or `ghost`.
- A display serif used once or twice per page; the interface font for everything that works.
- The pen is spent a few times per screen; status is one ink scale with tones only for meaning.
- Five settings — `ground`, `edges`, `density`, `colour`, `fonts` — and everything else fixed.

## Do

- Design the product's structure from its own tasks, then apply the look.
- Pick the patterns the task needs and treat them as patterns, not orders.
- Build both themes and measure every text pair at ≥ 4.5:1.
- Give every list an empty and a filtered-empty state.

## Avoid

- A KPI card per number, a table inside a card, a second filled button.
- An unchosen indigo or violet accent; one colour per status.
- Text faded with opacity; the serif on body text, buttons or cells.
- 3D shapes, banners, drawn pictures.
