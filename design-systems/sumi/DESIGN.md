# Sumi

## Visual Theme & Atmosphere

Quiet UI: a work tool that stays out of the way. Hierarchy comes from text and spacing, controls are ghosts until the pointer reaches them, one thing per view is loud, and colour lives in the frame and in a few group tints, never in the controls. White plates float on a pale frame; everything else is type.

References, in `references/` and on the canvas (README there):

| Source                                | Read it for                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `references/quiet-ui-brief.md`        | the approved brief: principles, the token scales, every component, the Do/Don't list      |
| `Fx-inter-chat`, `Fx-inter`           | the whole window in the final fonts; the target screen                                    |
| `Lc-13`, `Lc-dark`, `Lc-hover`        | both sidebars as one system: 13px rows, 12px labels, section hover                        |
| `Tb6-sections`, `Tb6-icons`, `Tb4-*`  | the tabs list: 32px rows, tinted groups, the icon set, group and view menus               |
| `Ch-main`, `Ws-*`                     | the chats column and the workspace strip                                                  |
| `Set-main`, `Gt-narrow`, `Gt-changes` | the plate header: back and forward, a two-level crumb, an app's own controls on the right |
| `Ink-menus`                           | menus and tooltips                                                                        |

Where the brief and the boards disagree, the boards win: frame `#F7F7F7`, 32px rows in the tabs list, group corner 14px, a selected row on the plate fill with no shadow.

Settings a product picks once and a person may switch later:

| Setting   | Values                                                                     | Default | What changes                                  |
| --------- | -------------------------------------------------------------------------- | ------- | --------------------------------------------- |
| `hue`     | any; offered: 268 blue, 293 violet, 0 rose, 41 orange, 150 green, 186 teal | 268     | the workspace tint: washes, focus, frame tint |
| `theme`   | `light`, `dark`                                                            | host    | the two instances of the Colour algorithm     |
| `density` | `regular`, `compact`                                                       | regular | compact takes 4px off rows and uses 12px rows |

Everything else is fixed.

## Color Palette & Roles

| Role                                                    | Step                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `sidebar`                                               | frame: the window, both sidebars and the plate headers        |
| `background`                                            | plate: the chat, the app, a page                              |
| `group`, `card`, `muted`, `fill`, `field`               | soft: a card on a plate, a field                              |
| `raise`, `popover`                                      | raise: a menu or a popover (white in light, soft in dark)     |
| `group-inset`                                           | inset: a group inside a group (white in light, plate in dark) |
| `sidebar-accent`                                        | selected: the selected sidebar row, plate fill, no shadow     |
| `accent`, `secondary`, `fill-hover`                     | active: a pressed or chosen control                           |
| `foreground` and every `*-foreground` on a neutral      | ink                                                           |
| `muted-foreground`, `ink-muted`, `neutral`              | ink-2: labels, secondary text                                 |
| `faint`, `ring`, `sidebar-ring`                         | ink-3: placeholders, hints, the neutral focus ring            |
| `group-line`, `sidebar-border`                          | line: a hairline, only where spacing cannot separate          |
| `border`, `input`                                       | line-strong                                                   |
| `primary`, `brand`, `sidebar-primary`, `chart-1`        | contrast: the one solid control per view                      |
| `primary-foreground`, `brand-foreground`                | on-contrast                                                   |
| `tint`                                                  | the workspace hue at full chroma, never painted alone         |
| `accent-wash`, `accent-wash-hover`, `on-wash`           | tint washed into the plate, and text on it                    |
| `destructive`, `success`, `warning`                     | status: danger, success, warning                              |
| `red` … `pink`, `info`, `note`, `standout`, `highlight` | group colours                                                 |

Runtime names for chrome live in `sumi.css` as `--sumi-*` (frame, plate, soft, hover, active, line, the hue pairs, sizes, radii, motion); `tokens.css` carries the same colours under the contract's names.

**Group colour pairs.** A group in a sidebar takes one of nine hues, each a pair: a light-theme ink and a dark-theme ink (red `#DC2626`/`#F87171`, orange `#EA580C`/`#FB923C`, amber `#B45309`/`#FBBF24`, green `#15803D`/`#4ADE80`, teal `#0F766E`/`#2DD4BF`, blue `#2563EB`/`#60A5FA`, purple `#7C3AED`/`#A78BFA`, pink `#DB2777`/`#F472B6`, slate `#64748B`/`#94A3B8`). The ink colours the group's title and glyphs; the group's plate is the ink at 9% (13% dark) over the frame; an icon tile is the ink at 15% over the frame. A plain group is black at 4% (white at 5% dark).

## Typography Rules

Inter Variable with `cv11` (single-storey a) and `ss03` (round quotes) for all chrome; Spectral 500 only for document headings; JetBrains Mono for code. Chat uses bold for emphasis, never headings. All three ship with the studio as OFL files.

| Step        | Size / weight     | Use                                                               |
| ----------- | ----------------- | ----------------------------------------------------------------- |
| Page title  | 28 / 600          | a page inside an app (Pages, Catalogue)                           |
| Empty title | 20 / 600          | an empty state                                                    |
| Workspace   | 17 / 600, −0.01em | the workspace name over the chats column                          |
| Panel title | 16 / 600          | a panel or dialog title                                           |
| Document    | 15 / 1.65         | document body; headings in Spectral 500                           |
| Chat        | 14 / 1.55         | messages and the composer                                         |
| UI          | 13 / 1.4          | the default: sidebar rows, buttons, menus, headers                |
| Label       | 12 / 400          | section labels in both sidebars, meta, captions; group titles 600 |
| Hint        | 11                | keyboard hints, badges                                            |

Emphasis in chrome is `--text` against `--text-2`, or 500 on a selected row; never bold, never uppercase. A section label is 12px `--text-2` with its name in 600 `--text` only where it is a section header.

## Component Stylings

- **Ghost button** (default, all header and toolbar controls): no fill, `--text-2`; hover `--hover` and `--text`; pressed `--active`. 30px tall, 0 10px, corner 8, 13/500.
- **Icon button**: 28×28, corner 6, a 16px glyph at `--text-2`, stroke 1.6. In a section header 24–26px with a 13–14px glyph.
- **Primary**: the one solid control per view (Send, Create, Save), `--primary` on `--primary-foreground`. The send button is a 32px circle.
- **Row** (chats, tabs, menus): 13px text, corner 6–10, 0 8–10px, a 16px icon and 8–10px gap. 32px in the tabs list and in menus, 28px nested. Hover `--hover`; selected the plate fill with no shadow and 500. Trailing controls appear on hover; an unread dot is always shown, 8px.
- **Section header**: 32px, 12px `--text-2` with the name in 600 `--text`; on hover a 12px chevron slides in from the left and the row's buttons appear on the right.
- **Group**: corner 14, padding 2px 4px 4px, a 30px title row (12/600 in the group's ink, a count in `--text-3`), rows inside.
- **Essential tile**: 46px, corner 14, black at 4.5% (hover 7%, on 9%); white at 6% and 12% in dark.
- **Field**: 32px, corner 8, `--hover` fill, no border, a 16px leading glyph at `--text-3`. Focus: a 2px neutral ring.
- **Crumb**: 28px, 0 8px, corner 6; at most two levels, the first `--text-2`, the last `--text` 500.
- **Segmented**: a `--active` track, 26px segments, the chosen one on the plate with a 1px shadow.
- **Menu**: `--overlay` with `saturate(1.6) blur(20px)`, corner 12, padding 4, `--shadow-pop`; rows 32px, corner 8, a 15px glyph; a 12px `--text-3` label above a group; a hairline between groups.
- **Tooltip**: `--text` fill, `--plate` text, 12px, corner 6, 4px 8px, the shortcut at 11px and 60%.
- **Chat card**: never white on the white chat: `--group` with no edge; one turn is one card with rows split by hairlines; done cards fold to one quiet line.
- **Code**: JetBrains Mono 12–12.5px on `--sunken`, corner 8; syntax colours from the boards' `--sx-*`.
- **Numbers and tables**: tabular figures, right-aligned numbers, a hairline under the header row only.

## Layout Principles

- Separate with spacing first, a hairline second, a surface last.
- A hairline divider runs from edge to edge of its card, menu or list; it is never inset by the padding.
- Two surface levels at most on screen: the frame and the plates on it.
- 8px between the frame's edge and a plate and between plates; a plate pads 16px, a chat 20–24px across.
- Sidebars have no fill of their own: they are the frame. Each belongs to the half it stands beside and never moves.
- A plate's header is 44px and stands on the plate's colour; its controls sit at its outer edges; an app adds its own on the right.
- Concentric corners: an inner corner is the outer corner minus the padding between them.
- Desktop density: 13px text, 28–32px controls; no hit target under 24×24.
- Exactness: blocks align on shared guides across plates. The sidebars' top-row icons sit on the line of the plate headers' icons, list icons share one size and one left edge, row text starts on one axis, and a repeated relation always gets the same 4px-scale gap.

## Depth & Elevation

| Plate   | Groups                             | Anatomy                                               |
| ------- | ---------------------------------- | ----------------------------------------------------- |
| Frame   | the window, both sidebars, headers | `--sumi-frame`; no edge                               |
| Plate   | the chat, an app, a page           | `--sumi-plate`, corner 14, `--sumi-shadow-plate`      |
| Group   | a sidebar group                    | tint or 4% black over the frame, corner 14, no shadow |
| Card    | a card in the chat                 | `--group`, corner 12, no edge                         |
| Popover | menus, pickers, tooltips           | overlay + blur, corner 12, `--sumi-shadow-pop`        |

Only plates and popovers cast a shadow. Buttons, rows and fields never do. A line stands only between menu groups, between rows of one card and under a table header.

## Do's and Don'ts

Suits long work at a desk: an agent chat beside an app, a browser, an editor, a dashboard read many times a day. Does not suit a consumer product that must sell itself on first sight, a game, or a phone-first app.

- Do keep controls ghost and spend solid colour once per view.
- Do let the workspace hue wash the frame and mark a zone; nothing else.
- Do keep familiar placement: address at the top, back and forward left of it.
- Don't put white pills with a shadow on grey, borders on buttons, rows or sidebars, or a third surface level.
- Don't fill or outline anything in blue: blue is a translucent wash behind a zone, never solid.
- Don't paint a selected row black, a label in uppercase, or chrome in bold.
- Don't put the mascot in any header or sidebar.

## Responsive Behavior

The system is for a desktop window. In a narrow window a sidebar hides before a plate shrinks under its least width; a hidden sidebar slides out past its window edge while fading, and back in the reverse. Rows keep their height; labels truncate with an ellipsis; a header drops its secondary controls into its ⋯ menu before the crumb loses its last level.

## Agent Prompt Guide

| Task                                    | Read                                                   |
| --------------------------------------- | ------------------------------------------------------ |
| Paint studio chrome                     | `sumi.css`: every value as `--sumi-*`, never a raw hex |
| Build a widget or an app in this system | `tokens.css` names through the kit, then this file     |
| A component's exact sizes               | the boards named under Visual Theme                    |
| Motion                                  | Behaviour below                                        |
| Why a rule exists                       | `references/quiet-ui-brief.md`                         |

## Colour algorithm

Every neutral is one hue-less grey ladder; the workspace hue is the only free colour; status hues are fixed.

| Step     | Job                        | Light L       | Dark L        | Chroma                 |
| -------- | -------------------------- | ------------- | ------------- | ---------------------- |
| frame    | window and sidebars        | 0.976         | 0.191         | `--neutral-chroma`     |
| plate    | content plates             | 1             | 0.239         | `--neutral-chroma`     |
| soft     | a card on a plate, a field | 0.976         | 0.269         | `--neutral-chroma`     |
| selected | the selected sidebar row   | 1             | 0.285         | `--neutral-chroma`     |
| active   | pressed, chosen            | plate − 0.046 | plate + 0.082 | `--neutral-chroma`     |
| line     | hairline                   | 0.939         | 0.313         | `--neutral-chroma`     |
| edge     | strong line, input         | 0.916         | 0.365         | `--neutral-chroma`     |
| ink-3    | hints, ring                | 0.683         | 0.575         | `--neutral-chroma`     |
| ink-2    | labels                     | 0.510         | 0.738         | `--neutral-chroma`     |
| ink      | text, contrast             | 0.232         | 0.946         | `--neutral-chroma`     |
| tint     | the workspace hue          | 0.555         | 0.623         | `--chroma` 0.24 / 0.20 |

Light is a white plate on a frame 2.4% darker; dark is a plate one step lighter than its frame, with cards a step lighter still. The interaction overlays (`--sumi-hover` 3.5%, `--sumi-active` 6%, `--sumi-line` 8%) are translucent black in light and white in dark, so they work on any surface. The wash is the tint at 10% over the plate (18% dark).

Fixed meanings: danger hue 30, success 156, warning 76, each at its own lightness and chroma offset from `--l-tone`/`--c-tone`, identical in both themes. The group colours hold their hue per theme: a 600-level ink in light, a 400-level ink in dark. Every text pair holds 4.5:1 across the full hue sweep.

## Imagery

Imagery is domain content, never decoration: favicons, app icons and the user's own pictures. Sites show their favicon on a 22px tile; built apps and file types show a glyph from the icon set tinted with the group colour at 15%. Glyphs come from Lucide, outline, stroke 1.6 on a 16 grid. No illustrations, no hero art; empty states are a title and one line.

## Behaviour

Fast and never blocking; the standard move is a fade plus a short travel that says where a thing went.

- The first visible response to any press or key comes under 100ms, always; an animation may run 150–240ms after that, but it starts at once.
- Hover fills appear at once (0ms) and leave with a 60–120ms fade. No delay on hover.
- What appears on hover (a chevron, row buttons) fades 0→1 over `--sumi-dur-fast` with a 4px travel; a label making room slides with `--sumi-ease-out`.
- Menus and popovers fade and scale .98→1 from the trigger's side over `--sumi-dur-base`, out in about 100ms. Never from the screen's centre.
- A sidebar hides by sliding out past its window edge while fading, and opens in reverse, over `--sumi-dur-slow`.
- No springs, no bounce, no scale above 1.02. `prefers-reduced-motion` turns all of it off.
- Every action shows locally in the same frame and persists after: a rename shows everywhere at once.

## Never

- A white pill button with a shadow on a grey ground.
- A border on a button, a row or a sidebar; a border inside a border.
- A solid or outlined blue control, a blue focus outline, a violet accent nobody chose.
- A gradient card, a card per number, a coloured card background for a state.
- A black selected row, an uppercase label, bold chrome.
- A third surface level, a grey plate inside a card, a white card on the white chat.
- The mascot in a header or a sidebar.
