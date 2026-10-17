# Quiet and strict — usage

## Read Order

1. `USAGE.md`
2. `DESIGN.md`
3. `tokens.css` — copy it as the project's `src/styles/tokens.css` with `widgetarium system use default`; change parameters, never formulas.
4. `docs/ai/surfaces.md`, `docs/ai/clean-ui.md` and `docs/ai/design-system.md`, which this look is checked by.
5. `references/` — none: the kit itself is the reference.

## Design Highlights

- The page is the theme's colour; a group is ink at 3% with no edge; a group on a group turns white.
- Only a repeat earns a plate; a single thing stands bare.
- Spacing and corners are computed from the tree, never written.
- Big controls (34/42/52px), pills, concentric 14px plates.
- The primary is ink; the brand is one hue, and text on it is ink.
- Motion answers a press with a spring; nothing moves on load.

## Do

- Write a surface on every node as it is placed.
- Pick a product's own `--hue` before it ships.
- Run `widgets.mjs lint` after every write.

## Avoid

- A hardcoded colour, gap or radius.
- A border or a cast shadow on a plate.
- White text on the brand fill; an unchosen violet as a product's accent.
- Drawn pictures; emoji as decoration.
