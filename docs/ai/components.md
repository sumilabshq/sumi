# Components

You draw every element yourself. Behaviour comes from Radix (`import { Dialog } from "radix-ui"`),
the look from Tailwind on the theme's tokens and the app's design system, motion from CSS transitions
and, where CSS cannot, `motion/react`. Nothing drawn comes from `widgetarium/kit`; it only lends
`usePortalContainer` and the charts. Each design system says how these elements look; this page says
what they are, which part does the behaviour, and how they move.

## The elements

| Element                    | Radix part                                           | Variants a system may pick from                   | Motion                                                                          |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Button                     | none: a `<button>`                                   | primary, secondary, ghost, icon-only, destructive | fill on hover, scale 0.97 on press                                              |
| Toggle, toggle group       | `Toggle`, `ToggleGroup`                              | icon toggles, text toggles, single or multiple    | fill on hover and on                                                            |
| Toolbar                    | `Toolbar`                                            | grouped buttons, separators between groups        | as its buttons                                                                  |
| Text field, area           | none: `<input>`, `<textarea>` + `Label`              | filled, outlined, with leading icon, with suffix  | focus ring fades in                                                             |
| Select                     | `Select`                                             | inline in a toolbar, full width in a form         | popover fades and scales from the trigger                                       |
| Combobox, search in a list | `Popover` + an `<input>` + a list you key through    | with chips for multiple                           | as Popover                                                                      |
| Checkbox, radio            | `Checkbox`, `RadioGroup`                             | box, card-shaped choice                           | mark draws, small                                                               |
| Switch                     | `Switch`                                             | small in rows, large alone                        | thumb slides, in-out                                                            |
| Slider                     | `Slider`                                             | single, range                                     | thumb follows the pointer with no easing                                        |
| Form                       | `Form`                                               | —                                                 | error text fades in                                                             |
| Tabs                       | `Tabs`                                               | underline, segmented, pills, vertical             | indicator travels (`motion` `layoutId`)                                         |
| Menus                      | `DropdownMenu`, `ContextMenu`, `Menubar`             | with shortcuts, with checks, with sub-menus       | fades and scales from the trigger side                                          |
| Navigation                 | `NavigationMenu`                                     | top bar with panels                               | panel crossfades                                                                |
| Dialog                     | `Dialog`                                             | centred, full screen on a phone                   | scrim fades; panel fades and scales 0.98 → 1                                    |
| Confirm                    | `AlertDialog`                                        | destructive, neutral                              | as Dialog                                                                       |
| Sheet                      | `Dialog` docked to an edge                           | right, bottom on a phone                          | slides from its edge                                                            |
| Popover, hover card        | `Popover`, `HoverCard`                               | —                                                 | fades and rises 4px                                                             |
| Tooltip                    | `Tooltip`                                            | —                                                 | after 400ms; fades and rises 4px                                                |
| Toast                      | `Toast`                                              | info, success, error, with undo                   | slides in; others shift                                                         |
| Accordion, collapsible     | `Accordion`, `Collapsible`                           | single or multiple open                           | height through `grid-template-rows`, chevron turns                              |
| Avatar                     | `Avatar`                                             | image with initials behind it                     | none                                                                            |
| Progress                   | `Progress`                                           | bar, ring                                         | value eases, in-out                                                             |
| Separator                  | `Separator`                                          | horizontal, vertical                              | none                                                                            |
| Scroll area                | `ScrollArea`                                         | —                                                 | none                                                                            |
| Tag, badge                 | none: a `<span>`, a removable one holds a `<button>` | soft, outline, dot                                | a removed tag shrinks and the row closes the gap (`AnimatePresence` + `layout`) |
| Command menu               | `Dialog` + an `<input>` + a list you key through     | grouped results with kinds                        | as Dialog; the highlight travels                                                |
| Breadcrumbs, pagination    | none: `<nav>` + a list                               | —                                                 | fill on hover                                                                   |
| Table, list, card grid     | none: `collections.md` of the system picks the form  | —                                                 | rows fade in; view switch crossfades                                            |
| Empty state, skeleton      | none                                                 | —                                                 | skeleton crossfades to content                                                  |

A part Radix lacks — a combobox's list, a command menu's results — moves with the arrow keys, wraps
at the ends, and answers Enter and Escape; the focus stays in the input.

## How every element is written

- **A control is a real element**: `<button type="button">`, `<input>`, a Radix part. An icon-only
  button carries `aria-label`.
- **Every interactive element has a transition**: at least `transition-colors duration-150` on hover
  and focus. Open and close states are animated on `data-[state=open]` and `data-[state=closed]`;
  Radix keeps the content mounted until a closing animation ends.
- **Keyframes live in the widget's sheet**, `widget.css`, beside `@import "tailwindcss"`.
- **A Radix `Portal` takes `container`** from `usePortalContainer()`, and the widget places its
  `anchorRef` on a `<span>`. Without it the overlay leaves the canvas frame and loses the theme.
- **Colours, radii and spacing are the theme's**: `bg-primary`, `text-muted-foreground`,
  `rounded-item`, `rounded-plate`, `gap-cards`. A colour written by hand is refused by `check`.

## A dialog, whole

```tsx skip-check
import { useState } from "react";
import { Dialog } from "radix-ui";
import { usePortalContainer } from "widgetarium/kit";

export function RenameDialog({ name, rename }: { name: string; rename: (next: string) => void }) {
	const [draft, setDraft] = useState(name);
	const { anchorRef, container } = usePortalContainer();
	return (
		<Dialog.Root>
			<span ref={anchorRef} hidden />
			<Dialog.Trigger className="rounded-item px-3 py-1.5 transition-colors duration-150 hover:bg-fill">
				Rename
			</Dialog.Trigger>
			<Dialog.Portal container={container}>
				<Dialog.Overlay className="dialog-scrim fixed inset-0 bg-black/30" />
				<Dialog.Content className="dialog-panel fixed left-1/2 top-1/2 w-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-plate bg-raise p-6">
					<Dialog.Title className="text-lg">Rename</Dialog.Title>
					<input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						className="mt-4 w-full rounded-item bg-fill px-3 py-2 transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-ring"
					/>
					<div className="mt-6 flex justify-end gap-items">
						<Dialog.Close className="rounded-item px-4 py-2 transition-colors duration-150 hover:bg-fill">
							Cancel
						</Dialog.Close>
						<Dialog.Close
							onClick={() => rename(draft)}
							className="rounded-item bg-primary px-4 py-2 text-primary-foreground transition-transform duration-150 active:scale-[0.97]"
						>
							Save
						</Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
```

```css
.dialog-scrim[data-state="open"] {
	animation: fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dialog-scrim[data-state="closed"] {
	animation: fade-out 150ms cubic-bezier(0.7, 0, 0.84, 0);
}
.dialog-panel[data-state="open"] {
	animation: panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dialog-panel[data-state="closed"] {
	animation: panel-out 150ms cubic-bezier(0.7, 0, 0.84, 0);
}
@keyframes fade-in {
	from {
		opacity: 0;
	}
}
@keyframes fade-out {
	to {
		opacity: 0;
	}
}
@keyframes panel-in {
	from {
		opacity: 0;
		scale: 0.98;
	}
}
@keyframes panel-out {
	to {
		opacity: 0;
		scale: 0.98;
	}
}
```

## A tag that leaves

```tsx skip-check
import { AnimatePresence, motion } from "motion/react";

export function Tags({ tags, remove }: { tags: readonly string[]; remove: (tag: string) => void }) {
	return (
		<ul className="flex flex-wrap gap-items">
			<AnimatePresence initial={false}>
				{tags.map((tag) => (
					<motion.li
						key={tag}
						layout
						exit={{ opacity: 0, scale: 0.9 }}
						transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
						className="flex items-center gap-1 rounded-control bg-fill px-2 text-sm"
					>
						{tag}
						<button
							type="button"
							aria-label={`Remove ${tag}`}
							onClick={() => remove(tag)}
							className="transition-colors duration-150 hover:text-foreground"
						>
							×
						</button>
					</motion.li>
				))}
			</AnimatePresence>
		</ul>
	);
}
```
