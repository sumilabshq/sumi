import type { ClassStyle } from "./class-style.js";

const TRANSITION_MS = 160;

export const FLAG_WORDS: Readonly<Record<string, (style: ClassStyle) => void>> = {
	flex: (style) => Object.assign(style, { display: "row", displaySet: true, inline: false }),
	"inline-flex": (style) => Object.assign(style, { display: "row", displaySet: true, inline: true }),
	"flex-row": (style) => Object.assign(style, { display: "row", displaySet: true }),
	"flex-col": (style) => Object.assign(style, { display: "column", displaySet: true }),
	"flex-row-reverse": (style) => Object.assign(style, { display: "row", displaySet: true, reverse: true }),
	"flex-col-reverse": (style) => Object.assign(style, { display: "column", displaySet: true, reverse: true }),
	block: (style) => (style.inline = false),
	inline: (style) => (style.inline = true),
	"inline-block": (style) => (style.inline = true),
	hidden: (style) => (style.display = "none"),
	"flex-wrap": (style) => (style.wrap = true),
	"flex-1": (style) => Object.assign(style, { grow: 1, shrink: 1, basis: 0 }),
	grow: (style) => (style.grow = 1),
	"shrink-0": (style) => (style.shrink = 0),
	"overflow-hidden": (style) => (style.clip = true),
	truncate: (style) => Object.assign(style, { truncate: true, clip: true }),
	"tabular-nums": (style) => (style.tabular = true),
	uppercase: (style) => (style.textTransform = "uppercase"),
	lowercase: (style) => (style.textTransform = "lowercase"),
	capitalize: (style) => (style.textTransform = "capitalize"),
	"normal-case": (style) => (style.textTransform = "none"),
	"font-sans": (style) => (style.family = "sans"),
	"font-serif": (style) => (style.family = "serif"),
	"font-mono": (style) => (style.family = "mono"),
	transition: (style) => (style.transitionMs ||= TRANSITION_MS),
	"transition-colors": (style) => (style.transitionMs ||= TRANSITION_MS),
};
