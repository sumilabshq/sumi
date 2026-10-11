export type Rgba = readonly [number, number, number, number];

export interface GpuTokens {
	readonly colours: Readonly<Record<string, Rgba>>;
	readonly lengths: Readonly<Record<string, number>>;
}

export const COLOUR_WORDS: Readonly<Record<string, string>> = {
	page: "var(--wg-kit-page)",
	group: "var(--wg-kit-group-fill)",
	"group-inset": "var(--wg-kit-group-inset)",
	line: "var(--wg-kit-group-line)",
	fill: "var(--wg-kit-fill)",
	"fill-hover": "var(--wg-kit-fill-hover)",
	raise: "var(--wg-kit-raise)",
	edge: "var(--wg-kit-card-edge)",
	ink: "var(--wg-kit-text)",
	background: "var(--background)",
	foreground: "var(--foreground)",
	card: "var(--card)",
	"card-foreground": "var(--card-foreground)",
	popover: "var(--popover)",
	"popover-foreground": "var(--popover-foreground)",
	primary: "var(--primary)",
	"primary-foreground": "var(--primary-foreground)",
	secondary: "var(--secondary)",
	"secondary-foreground": "var(--secondary-foreground)",
	muted: "var(--muted)",
	"muted-foreground": "var(--muted-foreground)",
	accent: "var(--accent)",
	"accent-foreground": "var(--accent-foreground)",
	destructive: "var(--destructive)",
	border: "var(--border)",
	input: "var(--input)",
	ring: "var(--ring)",
	sidebar: "var(--sidebar)",
	"sidebar-foreground": "var(--sidebar-foreground)",
	"sidebar-primary": "var(--sidebar-primary)",
	"sidebar-primary-foreground": "var(--sidebar-primary-foreground)",
	"sidebar-accent": "var(--sidebar-accent)",
	"sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
	"sidebar-border": "var(--sidebar-border)",
	"sidebar-ring": "var(--sidebar-ring)",
	"chart-1": "var(--chart-1)",
	"chart-2": "var(--chart-2)",
	"chart-3": "var(--chart-3)",
	"chart-4": "var(--chart-4)",
	"chart-5": "var(--chart-5)",
	brand: "var(--brand)",
	"brand-foreground": "var(--brand-foreground)",
	success: "var(--wg-kit-success)",
	warning: "var(--wg-kit-warning)",
	error: "var(--wg-kit-error)",
	info: "var(--wg-kit-info)",
	note: "var(--wg-kit-note)",
	standout: "var(--wg-kit-standout)",
	highlight: "var(--wg-kit-highlight)",
	"brand-wash": "var(--wg-kit-accent-wash)",
	"accent-wash": "var(--wg-kit-accent-wash)",
	"success-wash": "var(--wg-kit-success-wash)",
	"warning-wash": "var(--wg-kit-warning-wash)",
	"error-wash": "var(--wg-kit-error-wash)",
	"info-wash": "var(--wg-kit-info-wash)",
	"note-wash": "var(--wg-kit-note-wash)",
	"standout-wash": "var(--wg-kit-standout-wash)",
	"highlight-wash": "var(--wg-kit-highlight-wash)",
	red: "var(--wg-kit-red)",
	orange: "var(--wg-kit-orange)",
	yellow: "var(--wg-kit-yellow)",
	green: "var(--wg-kit-green)",
	cyan: "var(--wg-kit-cyan)",
	blue: "var(--wg-kit-blue)",
	purple: "var(--wg-kit-purple)",
	pink: "var(--wg-kit-pink)",
};

export const LENGTH_WORDS: Readonly<Record<string, string>> = {
	"text-xs": "var(--wg-kit-text-xs)",
	"text-sm": "var(--wg-kit-text-s)",
	"text-base": "var(--wg-kit-text-m)",
	"text-lg": "var(--wg-kit-text-l)",
	"text-h6": "var(--wg-kit-h6-size)",
	"text-h5": "var(--wg-kit-h5-size)",
	"text-h4": "var(--wg-kit-h4-size)",
	"text-h3": "var(--wg-kit-h3-size)",
	"text-h2": "var(--wg-kit-h2-size)",
	"text-h1": "var(--wg-kit-h1-size)",
	"radius-sm": "calc(var(--radius) - 4px)",
	"radius-md": "calc(var(--radius) - 2px)",
	"radius-lg": "var(--radius)",
	"radius-xl": "calc(var(--radius) + 4px)",
	"radius-plate": "var(--wg-kit-plate)",
	"radius-item": "var(--wg-kit-item)",
	"radius-pill": "var(--wg-kit-pill)",
};

export const FIXED_COLOURS: Readonly<Record<string, Rgba>> = {
	transparent: [0, 0, 0, 0],
	white: [1, 1, 1, 1],
	black: [0, 0, 0, 1],
};

const INK: Rgba = [0.133, 0.133, 0.133, 1];
const PAGE: Rgba = [1, 1, 1, 1];
const MUTED_INK: Rgba = [0.473, 0.473, 0.473, 1];
const FILL: Rgba = [0.952, 0.952, 0.952, 1];
const FILL_HOVER: Rgba = [0.909, 0.909, 0.909, 1];

// TRADE-OFF: Obsidian's default light theme, written out; only a worker that was never handed the document's tokens draws with it
export const FALLBACK_TOKENS: GpuTokens = {
	colours: {
		page: PAGE,
		background: PAGE,
		raise: PAGE,
		"group-inset": PAGE,
		"primary-foreground": PAGE,
		group: [0.133, 0.133, 0.133, 0.03],
		line: [0.133, 0.133, 0.133, 0.07],
		edge: [0.133, 0.133, 0.133, 0.09],
		border: [0.133, 0.133, 0.133, 0.09],
		fill: FILL,
		muted: FILL,
		"fill-hover": FILL_HOVER,
		accent: FILL_HOVER,
		ink: INK,
		foreground: INK,
		primary: INK,
		"muted-foreground": MUTED_INK,
		brand: [0.427, 0.306, 0.878, 1],
	},
	lengths: {
		"text-xs": 11,
		"text-sm": 12,
		"text-base": 14,
		"text-lg": 16,
		"radius-sm": 10,
		"radius-md": 12,
		"radius-lg": 14,
		"radius-xl": 18,
		"radius-plate": 14,
		"radius-item": 6,
		"radius-pill": 999,
	},
};

export function colourOf(tokens: GpuTokens, word: string): Rgba | null {
	return FIXED_COLOURS[word] ?? tokens.colours[word] ?? null;
}

export function isColourWord(word: string): boolean {
	return word in COLOUR_WORDS || word in FIXED_COLOURS;
}
