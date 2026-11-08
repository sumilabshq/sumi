export const GLYPH_ICONS = {
	branch: "git-branch",
	compare: "git-compare",
	folder: "folder",
	commit: "git-commit-horizontal",
	cloud: "cloud",
	stash: "archive",
	tick: "tick",
	chevronDown: "chevron-down",
	chevronRight: "chevron-right",
	search: "search",
	circle: "circle",
	unfold: "chevrons-up-down",
	plus: "plus",
} as const;

export type GlyphName = keyof typeof GLYPH_ICONS;
