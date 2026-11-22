# Sumi — usage

## Read Order

1. `USAGE.md`
2. `DESIGN.md`, whole.
3. The canvas "Sumi — paper directions": https://claude.ai/artifact/H8ZPbB1u4ALCSWcqciU268. Every rule here is drawn there; `references/README.md` says which board shows what.
4. `tokens.css` — copy it with `data-framework system use sumi`; change parameters, never formulas.
5. `sumi.css` — the studio's runtime names, the theme's tokens; studio chrome paints with these only.

## Design Highlights

- One surface: the window is one sheet, near-black in dark, plain white in light. No plates, no cards, no shadows except a popup.
- Hairline dividers run edge to edge of their pane. A chat pane has two at most: above the questions block and above the input.
- One left line: every row, paragraph, table and question in a pane starts at the same x; nesting is shown by a drawn tree line, not by indents of their own.
- One size of text per region: 13px interface, 14px chat, bold only for headings, two inks (text and grey).
- Sumi yellow marks only the caret where you type and links.
- Square corners everywhere.

## Do

- Separate with spacing first, a hairline second; never a box around a whole pane's content.
- Keep the chat text in a 768px column centred in its pane; let dividers still run across the whole pane.
- Show the same fill for hover and keyboard focus.

## Avoid

- An ellipsis written into text ("Add a provider…") and a middle dot as a separator ("· 3s").
- A line under a pane header (the Git app with its own side panel is the one exception).
- Status in boxes or badges: statuses are words ("new", "waits", "working") or the five data-mark squares.
