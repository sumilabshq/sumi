# Sumi — usage

## Read Order

1. `USAGE.md`
2. `DESIGN.md`
3. `tokens.css` — copy it as the project's `src/styles/tokens.css` with `widgetarium system use sumi`; change parameters, never formulas.
4. `sumi.css` — the studio's runtime names (`--sumi-*`); studio chrome paints with these only.
5. `references/` — the approved brief and the canvas the system was written from.

## Design Highlights

- White plates on a pale frame; sidebars and headers are the frame.
- Ghost controls: no fill until hovered; one solid control per view.
- 13px Inter Variable (`cv11`, `ss03`) chrome, 28–32px controls, 12px labels, no uppercase.
- Sidebar groups tinted by one of nine colour pairs; a selected row is the plate fill with no shadow.
- Blue only as a translucent wash.
- Motion: an instant answer, then a 120–240ms fade with a short travel.

## Do

- Separate with spacing before a hairline, and a hairline before a surface.
- Keep a card in the chat on `--group`, never white on white.
- Take every chrome value from `sumi.css`; add a missing one there as `--sumi-*`.

## Avoid

- Borders on buttons, rows or sidebars; shadows on anything but plates and popovers.
- Solid or outlined blue; a black selected row; bold or uppercase chrome.
- The mascot in a header or a sidebar.
