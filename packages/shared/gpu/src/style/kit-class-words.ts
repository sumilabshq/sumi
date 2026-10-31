import type { ClassStyle } from "./class-style.js";

type WordApplier = (style: ClassStyle, word: string) => boolean;

const SEG_BUTTON =
	"flex-row items-center justify-center rounded-control px-4 h-[38px] text-base font-medium text-ink-muted";

// TRADE-OFF: control heights and insets written as the kit's current pixels; a theme that resizes them is not followed
const KIT_LOOKS: Readonly<Record<string, string>> = {
	"wg-kit-surface-group": "bg-group rounded-plate p-4",
	"wg-kit-surface-inset": "bg-group-inset",
	"wg-kit-btn":
		"inline-flex items-center justify-center gap-2 rounded-control font-semibold bg-fill hover:bg-fill-hover text-ink h-[42px] px-5 text-base shrink-0 transition",
	"wg-kit-btn-is-s": "h-[34px] px-4",
	"wg-kit-btn-is-m": "h-[42px] px-5",
	"wg-kit-btn-is-l": "h-[52px] px-6 text-lg",
	"wg-kit-btn-is-block": "w-full",
	"wg-kit-btn-is-primary": "bg-ink hover:bg-ink text-page",
	"wg-kit-btn-is-accent": "bg-interactive hover:bg-interactive text-on-interactive",
	"wg-kit-btn-is-danger": "bg-error-wash hover:bg-error-wash text-error",
	"wg-kit-btn-is-plain": "bg-transparent hover:bg-transparent text-interactive",
	"wg-kit-btn-is-ghost": "bg-transparent",
	"wg-kit-btn-label": "inline",
	"wg-kit-icon":
		"inline-flex items-center justify-center rounded-control bg-fill hover:bg-fill-hover text-ink shrink-0 transition",
	"wg-kit-icon-is-s": "size-[34px]",
	"wg-kit-icon-is-m": "size-[42px]",
	"wg-kit-icon-is-l": "size-[52px]",
	"wg-kit-icon-is-ghost": "bg-transparent",
	"wg-kit-icon-is-raised": "bg-raise",
	"wg-kit-icon-glyph": "shrink-0",
	"wg-kit-pill":
		"inline-flex items-center gap-1 rounded-control py-[3px] px-3 text-sm font-semibold bg-fill text-ink self-start",
	"wg-kit-pill-is-s": "py-px px-2 font-medium",
	"wg-kit-pill-is-primary": "bg-ink text-page",
	"wg-kit-pill-is-secondary": "bg-fill text-ink",
	"wg-kit-pill-is-destructive": "bg-error text-white",
	"wg-kit-pill-is-solid": "bg-ink text-page",
	"wg-kit-pill-is-outline": "bg-transparent border",
	"wg-kit-pill-is-text": "bg-transparent px-0",
	"wg-kit-inked": "",
	"wg-kit-field": "block flex-row items-center gap-2 h-[42px] px-4 rounded-control bg-fill text-ink-muted",
	"wg-kit-field-is-s": "h-[34px] px-3",
	"wg-kit-field-is-block": "w-full",
	"wg-kit-field-input": "flex-1 min-w-0 w-auto text-base text-ink",
	"wg-kit-seg": "inline-flex bg-fill rounded-control p-1 self-start",
	"wg-kit-seg-is-s": "p-[2px]",
	"wg-kit-seg-is-l": "",
	"wg-kit-seg-thumb": "hidden",
	"wg-kit-seg-button": SEG_BUTTON,
	"wg-kit-seg-button-s": "h-6 text-sm px-2 gap-1",
	"wg-kit-seg-button-selected": "bg-raise text-ink font-semibold",
	"wg-kit-row": "flex-row items-center gap-3 w-full py-3 px-4 text-base text-ink",
	"wg-kit-row-is-pressable": "hover:bg-hover transition",
	"wg-kit-row-label": "flex-1 min-w-0 truncate font-medium",
	"wg-kit-row-value": "flex-row items-center gap-2 shrink-0 text-ink-muted",
	"wg-kit-row-text": "flex-1 min-w-0",
	"wg-kit-row-supporting": "text-sm text-ink-muted",
	"wg-kit-item-group": "flex-col min-w-0",
	"wg-kit-group-item": "py-3 px-0 min-w-0",
	"wg-kit-group-item-next": "border-t border-line",
	"wg-kit-card-header": "gap-1",
	"wg-kit-card-title": "font-semibold",
	"wg-kit-card-description": "text-sm text-ink-muted",
	"wg-kit-card-content": "",
	"wg-kit-card-footer": "flex-row items-center gap-2",
	"wg-kit-anchor": "inline-flex min-w-0",
	"wg-kit-pop": "hidden",
	"wg-kit-pop-is-open": "flex flex-col bg-raise rounded-plate p-2",
	"wg-kit-pop-is-exiting": "hidden",
	"wg-kit-pop-inner": "",
	"is-arriving": "",
	"wg-kit-surface": "",
	"wg-kit-surface-none": "",
	"wg-kit-surface-apart": "",
	"wg-kit-tone": "",
	"wg-studio-drawn": "",
	"wg-studio-refused": "text-error",
	"wg-mounted": "",
	"wg-mounted-holder": "",
	"wg-slot": "",
};

export function readKitWord(style: ClassStyle, word: string, apply: WordApplier): boolean {
	const look = KIT_LOOKS[word];
	if (look === undefined) return false;
	for (const part of look.split(" ").filter(Boolean)) apply(style, part);
	return true;
}
