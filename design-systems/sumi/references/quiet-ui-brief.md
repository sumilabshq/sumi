# Sumi Design System — "Quiet UI"

Hand this file to the agent as the single source of truth for Sumi's look.
Reference products for the feel: Dia, Zen, Arc, Linear, Notion. Take their ideas, not their assets.

---

## 0. Instructions for the agent

1. Create `src/styles/tokens.css` with every token from section 2 (light + dark + workspace accent).
2. Audit the UI: list every hardcoded color, radius, font size, height, shadow and spacing value.
3. Replace them with tokens. No raw hex / px values in components after this (except 1px hairlines).
4. Rebuild the components in section 4 to match the spec. Start with: button, icon button, list row,
   header/breadcrumb, chat list, tabs sidebar, workspace rail, composer.
5. Check both themes and three layout modes (chat + browser, chat only, browser only).
6. Report what changed and what still violates the "Don't" list (section 7).

---

## 1. Principles

1. **Hierarchy comes from text and spacing, not boxes.** No frame around something that spacing can separate.
2. **Controls are quiet until touched.** Default buttons have no background; fill appears on hover.
3. **One loud thing per screen.** Only the primary action (e.g. Send) gets solid color.
4. **Color lives in the frame, not in components.** The workspace accent tints the window and marks selection/focus.
5. **Desktop density.** 13px UI text, 28–32px controls. This is a work tool, not a phone app.
6. **Familiar defaults.** Address bar at the top, back/forward where people expect them, nothing disappears on its own.
7. **One signature:** the mascot (circle with eyes) + workspace color. Everything else stays neutral.

---

## 2. Tokens

### 2.1 Color — light

```css
:root {
	/* surfaces */
	--frame: #f4f3ef; /* window background, sidebars, headers (no own bg) */
	--plate: #ffffff; /* content plates: chat, browser page, apps */
	--sunken: #ecebe6; /* search fields, inputs on frame, code blocks */
	--overlay: rgba(255, 255, 255, 0.82); /* popovers/menus, with backdrop blur */

	/* text */
	--text: #1f1e1c;
	--text-2: rgba(31, 30, 28, 0.62); /* secondary, labels */
	--text-3: rgba(31, 30, 28, 0.42); /* placeholders, disabled, hints */

	/* interaction (neutral overlays, work on any surface) */
	--hover: rgba(31, 30, 28, 0.05);
	--active: rgba(31, 30, 28, 0.08); /* selected row, pressed */
	--line: rgba(31, 30, 28, 0.08); /* hairline separators, only when needed */
	--line-strong: rgba(31, 30, 28, 0.14); /* input borders on focus-less state if needed */

	/* status */
	--success: #2f8f5b;
	--warning: #c98a1a;
	--danger: #d93f2e;

	/* workspace accent (set per workspace at runtime) */
	--accent: #3b5bfd;
	--on-accent: #ffffff;
	--accent-soft: color-mix(in oklab, var(--accent) 12%, transparent);
	--focus-ring: color-mix(in oklab, var(--accent) 55%, transparent);

	/* frame tint from workspace */
	--frame-tinted: color-mix(in oklab, var(--frame) 94%, var(--accent));
}
```

### 2.2 Color — dark

```css
:root[data-theme="dark"] {
	--frame: #161615;
	--plate: #1f1f1e;
	--sunken: #2a2a28;
	--overlay: rgba(36, 36, 34, 0.82);

	--text: #edece8;
	--text-2: rgba(237, 236, 232, 0.62);
	--text-3: rgba(237, 236, 232, 0.4);

	--hover: rgba(237, 236, 232, 0.06);
	--active: rgba(237, 236, 232, 0.1);
	--line: rgba(237, 236, 232, 0.08);
	--line-strong: rgba(237, 236, 232, 0.16);

	--frame-tinted: color-mix(in oklab, var(--frame) 92%, var(--accent));
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		/* same values as above */
	}
}
```

Workspace accent palette (user picks one per workspace):
`#3B5BFD` blue · `#7A5AF8` violet · `#E0567A` rose · `#E5793A` orange · `#2F9E6E` green · `#1F9BB5` teal · `#6B6B66` graphite.

### 2.3 Typography

```css
:root {
	--font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif;
	--font-mono: "SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;

	--fs-11: 11px; /* badges, keyboard hints */
	--fs-12: 12px; /* section labels, meta, captions */
	--fs-13: 13px; /* DEFAULT UI text: rows, buttons, menus, headers */
	--fs-14: 14px; /* chat messages, inputs */
	--fs-16: 16px; /* panel titles */
	--fs-20: 20px; /* empty-state titles ("Where to?") */
	--fs-28: 28px; /* page titles inside apps (Pages, Catalogue) */

	--lh-tight: 1.25;
	--lh-ui: 1.4;
	--lh-text: 1.55; /* chat body */

	--fw-regular: 400;
	--fw-medium: 500; /* selected rows, button labels */
	--fw-semi: 600; /* titles only */
}
```

Rules: section labels ("Today", "Workspace", "This chat") = 12px, `--text-2`, regular, no uppercase.
Never use bold for emphasis in UI chrome; use `--text` vs `--text-2`.

### 2.4 Spacing (4px grid)

`--sp-1: 2px` · `--sp-2: 4px` · `--sp-3: 6px` · `--sp-4: 8px` · `--sp-5: 12px` · `--sp-6: 16px` · `--sp-7: 20px` · `--sp-8: 24px` · `--sp-9: 32px` · `--sp-10: 48px`

- Gap between frame edge and plates: 8px.
- Gap between plates: 8px.
- Plate inner padding: 16px (chat 20–24px horizontally).
- Sidebar inner padding: 8px; rows inside are full-width with 8px text inset.

### 2.5 Radius

```css
:root {
	--r-xs: 4px; /* badges, kbd hints, checkbox */
	--r-sm: 6px; /* list rows, tabs, menu items, icon buttons */
	--r-md: 8px; /* buttons, inputs, search field */
	--r-lg: 12px; /* popovers, menus, cards, composer */
	--r-xl: 14px; /* plates (chat, browser) */
	--r-full: 999px; /* ONLY: chips, segmented toggles, send button, avatars */
}
```

Nested rule: inner radius = outer radius − padding (never inner larger than outer).

### 2.6 Sizes

```css
:root {
	--h-xs: 24px; /* chips, small toggles */
	--h-sm: 28px; /* icon buttons, list rows, tabs, header controls */
	--h-md: 32px; /* buttons, inputs, search field */
	--h-lg: 36px; /* primary input on empty states */
	--icon: 16px; /* all UI icons, stroke 1.5 */
	--icon-sm: 14px;
	--rail-w: 52px; /* workspace rail */
	--sidebar-w: 248px; /* chats sidebar, tabs sidebar (resizable 200–360) */
	--header-h: 44px; /* plate header */
}
```

Density setting: `compact` subtracts 4px from `--h-sm/--h-md` and uses `--fs-12` for rows.
Hit area never below 24×24px (WCAG 2.2).

### 2.7 Elevation

```css
:root {
	--shadow-plate: 0 0 0 1px var(--line), 0 1px 2px rgba(0, 0, 0, 0.04);
	--shadow-popover: 0 0 0 1px var(--line), 0 8px 24px rgba(0, 0, 0, 0.12);
	--blur-popover: saturate(1.6) blur(20px);
}
```

Only plates and popovers have elevation. Buttons, rows, inputs: never a shadow.

### 2.8 Motion

```css
:root {
	--dur-fast: 120ms; /* hover, press */
	--dur-base: 180ms; /* panels, popovers */
	--dur-slow: 240ms; /* sidebar collapse, mode switch */
	--ease: cubic-bezier(0.2, 0, 0, 1);
}
@media (prefers-reduced-motion: reduce) {
	* {
		transition-duration: 0ms !important;
	}
}
```

No springs, no bounces, no scale > 1.02.

---

## 3. Layout

```
 frame (--frame-tinted, no borders)
 ┌────┬──────────┬────────────────────────┬──────────────────────────────┬──────────┐
 │rail│ chats    │ ◧ Default / Chat title ⋯│ ‹ › ⟳  site.com / Page title ⋯ ◧│ tabs     │ ← headers sit on frame
 │ ●  │ sidebar  │┌──────────────────────┐│┌────────────────────────────┐│ sidebar  │   (or take page color, see 4.6)
 │ ●  │          ││ chat plate           ││││ browser / app plate         ││          │
 │ +  │          │└──────────────────────┘│└────────────────────────────┘│          │
 └────┴──────────┴────────────────────────┴──────────────────────────────┴──────────┘
```

- **Workspace rail**: always visible in every mode. Workspaces are global.
- **Chats sidebar** belongs to the chat half (left edge). **Tabs sidebar** belongs to the browser half (right edge). Never move them.
- Sidebar toggles (◧) sit on the outer edge of their own header.
- Modes: both halves · chat only (browser toggle moves into chat header) · browser only (chat toggle moves into browser header).
- Sidebars have no background of their own: they are the frame.
- Only plates are surfaces. Max 2 surface levels visible: frame + plate.

---

## 4. Components

### 4.1 Buttons

| Variant             | Use                                         | Default                      | Hover                  | Pressed         |
| ------------------- | ------------------------------------------- | ---------------------------- | ---------------------- | --------------- |
| **Ghost** (default) | 90% of actions, all header/toolbar controls | no bg, `--text-2` icon/label | `--hover` bg, `--text` | `--active`      |
| **Secondary**       | "Cancel", "Open app", secondary in dialogs  | `--hover` bg                 | `--active`             | `--active` + 2% |
| **Primary**         | one per view: Send, Create, Save            | `--accent` bg, `--on-accent` | 8% darker              | 14% darker      |
| **Danger**          | destructive confirm only                    | `--danger` bg, white         | darker                 | darker          |

Height `--h-md` (32), padding 0 12px, radius `--r-md`, font 13/500. No borders, no shadows.

### 4.2 Icon button

28×28, radius `--r-sm`, icon 16px `--text-2`. Ghost behavior. Tooltip on hover after 500ms with shortcut.

### 4.3 List row (chats, tabs, menu items)

- Height 28–30px, radius `--r-sm`, padding 0 8px, icon 16 + gap 8, text 13px.
- Default: no bg, `--text`. Hover: `--hover`. Selected: `--active` + `--fw-medium`. NOT a white pill with shadow.
- Trailing controls (×, ⋯, unread dot) appear on hover only; unread dot always visible, 6px, `--accent`.
- Section label above groups: 12px `--text-2`, 16px top margin, 4px bottom.

### 4.4 Workspace rail

- Items: 28–32px circles, `--r-full`, filled with the workspace accent at 16% + initial or emoji/mascot in accent color.
- Active: solid accent bg + `--on-accent` text, or 2px ring `--focus-ring`.
- Gap 6px. "+" is a ghost icon button. Profile avatar at the bottom.
- Shortcuts ⌘1…⌘9 shown in tooltip.

### 4.5 Plate header + breadcrumb

- Height `--header-h` (44). Lives on frame color (or page color, 4.6). No bottom border.
- Order (browser): `◧? ‹ › ⟳  breadcrumb  …  share ⋯ ◧`. Order (chat): `◧  Workspace / Chat title  … ⋯`.
- Breadcrumb: max 2 levels: `site.com / Page title`, `Canvas / Design v2`. First level `--text-2`, last `--text` 500.
- Click or ⌘L → becomes the **universal bar** (4.8) in place, same width, `--sunken` bg, `--r-md`.

### 4.6 Page-colored header (Dia pattern)

Browser header samples the page's top color (`theme-color` meta or top pixel row) and uses it as background;
icon/text color switches to light/dark by contrast (≥ 4.5:1). Transition `--dur-base`.

### 4.7 Inputs & search

- Height 32, radius `--r-md`, bg `--sunken`, no border. Focus: 2px ring `--focus-ring`, bg `--plate`.
- Placeholder `--text-3`. Leading icon 16px `--text-3`.

### 4.8 Universal bar (address / search / ask / open app)

One input for everything:

- URL → open page. Text + Enter → web search. Text + ⌘Enter → ask agent. App name → open app.
- Results list in a popover under it: rows 32px, grouped (Apps · Tabs · History · Ask Sumi), keyboard-first.
- Same component on the New Tab page (centered, `--h-lg`, `--r-lg`, with mascot above + "Where to?" 20/600).

### 4.9 Chat

- Messages 14px / `--lh-text`, max width 680px, centered in plate.
- User message: `--sunken` bg, `--r-lg`, padding 8px 12px, right-aligned. Assistant: no bubble.
- Status line ("Done · 11s"): 12px `--text-2`, 6px status dot.
- Code blocks: `--sunken`, `--r-md`, mono 12.5px.

### 4.10 Composer

- `--plate` bg, 1px `--line`, radius `--r-lg`, min-height 88, padding 12.
- Bottom row: ghost "+" (attach), agent chip, model/effort as ghost text buttons 12px `--text-2`, Send on the right.
- Send: 32px circle `--accent` (allowed pill). Disabled = `--active` bg, `--text-3` icon.

### 4.11 Chips & segmented toggles

Height 24, `--r-full`, 12px text, bg `--hover`, selected `--active` + `--text`. Segmented: container `--sunken`, selected segment `--plate` + `--shadow-plate`.

### 4.12 Popovers, menus, tooltips

- Popover/menu: `--overlay` + `--blur-popover`, `--r-lg`, `--shadow-popover`, padding 4, rows per 4.3.
- Tooltip: `--text` bg, `--plate` text, 12px, `--r-sm`, padding 4px 8px, shortcut in `--fs-11` 60% opacity.

### 4.13 Cards (catalogue, featured apps)

- `--plate`, 1px `--line`, `--r-lg`, padding 20. Icon 20px, title 16/600, one-line benefit 13px `--text-2`, category 12px `--text-3` at bottom.
- Featured: 16:9 screenshot of the app in use on top, same text below. Hover: `--shadow-popover`.

### 4.14 Mascot & empty states

- Mascot circle 48–64px, `--text` fill, eyes in `--plate`. Per-workspace mascot takes accent color.
- Empty state: mascot, title 20/600, one line 13px `--text-2`, one primary action max.
- Agent status (thinking/working/done) is shown by the mascot's eyes, not spinners.

### 4.15 Agent work cards in chat (plan, spec, changes, commands, questions)

Goal: rich cards without the "boxes everywhere" look when many stack in one chat.

- **Weight follows state.** Live / needs-you / failed = full card. Done / answered / history = folds to a
  quiet one-line row (no border, no fill, actions appear on hover). At any moment max 1–2 full cards visible.
- **One turn = one container.** Several results of one turn (3 changed pages, README, etc.) are rows inside
  ONE card, separated by hairlines — never a stack of separate bordered cards.
- **Max depth 2:** card → inner sunken area (`--sunken`, no border). Never a border inside a border.
- **Card edge:** `--shadow-plate` (1px ring at ~6–8% + soft 1px shadow) instead of a solid gray border.
  Never border + strong shadow + fill together.
- **Buttons:** only the newest actionable card has a solid primary (Answer / Fix it / Try again).
  Everything else is ghost or text ("Open ↗", "Review", "Undo").
- **Status lives in the mascot face** (thinking / question / done / error eyes) + one short colored line
  of text for errors. No red borders, no colored card backgrounds.
- **Progress:** thin segmented bar under the title (as in Plan), 2px, not a box.
- **Code / logs:** inside the sunken area, mono 12–12.5px, diff rows tinted (success/danger at ~10%).
- **Labels above groups** ("Live", "Waiting", "Done") 12px `--text-2`, no container.

"Cheap look" checklist (run on a screenshot of a long chat):

1. Squint / blur test: if lines dominate over content, remove borders.
2. Container depth ≤ 2 everywhere.
3. Solid buttons visible on screen ≤ 1–2.
4. Distinct font sizes on screen ≤ 4.
5. Left edges of titles, text and icons line up on one axis.
6. Same radius family (concentric) and same spacing steps everywhere.

---

## 5. Iconography

- One set, outline, 1.5px stroke, 16px grid (Lucide or equivalent).
- Color `--text-2`; `--text` on hover/active; accent only for selected-state glyphs.
- No filled circular backgrounds behind icons (except mascot/workspace avatars).

---

## 6. Accessibility

- Text contrast ≥ 4.5:1 (`--text-2` on `--frame` must pass; check per accent tint).
- Visible focus ring on every interactive element: 2px `--focus-ring`, offset 1px.
- Hit targets ≥ 24×24px.
- Every icon-only button has `aria-label` + tooltip.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

---

## 7. Do / Don't

**Do**

- Separate with spacing first, hairline second, surface last.
- Keep controls ghost; one primary per view.
- Let the workspace accent tint the frame and mark selection.
- Keep familiar browser placement (address at top, nav buttons left of it).

**Don't**

- White pill buttons with shadow on gray background.
- Borders on buttons, rows or sidebars.
- More than 2 surface levels (frame + plate).
- Full-radius pills outside: chips, toggles, send, avatars.
- Black filled selected states (use `--active`).
- Bold text for emphasis in chrome; uppercase labels.
- Hardcoded colors/sizes in components.
- Copying Dia/Zen/Arc assets, fonts, illustrations or names.
