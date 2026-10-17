# Pill — usage

## Read Order

1. `USAGE.md`
2. `DESIGN.md`
3. `tokens.css` — copy it as the project's `src/styles/tokens.css` with `widgetarium system use pill`; change parameters, never formulas.
4. `references/` 1–5, the screens the system was written from.

## Design Highlights

- Every control is a pill; containers are tight (6px), controls are big (36–52px).
- Three fills: the page, the grey plate container, the white plate inside it.
- One loud result per turn: a full-bleed brand card beside a contrast card.
- White pill buttons on the brand and contrast cards; a round brand send button.
- Geist 400/500/600, big type tracked tight.
- Dark: near-black shell, the same blue, contrast flips to white.

## Do

- Keep a container's padding smaller than the controls it holds.
- Spend the brand once per view.
- Use tone chips (wash and ink) for state, never a coloured row.

## Avoid

- Borders on plates, square controls, shadows except under a menu.
- White text on anything but the brand or contrast.
- A third level of plates.
