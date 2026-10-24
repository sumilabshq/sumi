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
	"ink-muted": "var(--wg-kit-text-muted)",
	"ink-faint": "var(--text-faint)",
	interactive: "var(--interactive-accent)",
	"on-interactive": "var(--text-on-accent)",
	hover: "var(--background-modifier-hover)",
	link: "var(--link-color)",
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
	"text-inherited": "1em",
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

const FIXED_COLOURS: Readonly<Record<string, Rgba>> = {
	transparent: [0, 0, 0, 0],
	white: [1, 1, 1, 1],
	black: [0, 0, 0, 1],
};

const CHANNEL = "(-?[\\d.]+(?:e-?\\d+)?)";
const RGB_FUNCTION = new RegExp(`^rgba?\\(${CHANNEL},?\\s*${CHANNEL},?\\s*${CHANNEL}(?:\\s*[,/]\\s*${CHANNEL})?\\)$`);
const SRGB_FUNCTION = new RegExp(`^color\\(srgb\\s+${CHANNEL}\\s+${CHANNEL}\\s+${CHANNEL}(?:\\s*/\\s*${CHANNEL})?\\)$`);

export function colourOf(tokens: GpuTokens, paint: string): Rgba | null {
	return FIXED_COLOURS[paint] ?? tokens.colours[paint] ?? rgbaOfCss(paint);
}

export function rgbaOfCss(css: string): Rgba | null {
	const srgb = SRGB_FUNCTION.exec(css);
	if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), srgb[4] === undefined ? 1 : Number(srgb[4])];
	const rgb = RGB_FUNCTION.exec(css);
	if (!rgb) return null;
	return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, rgb[4] === undefined ? 1 : Number(rgb[4])];
}

export function isColourWord(word: string): boolean {
	return word in COLOUR_WORDS || word in FIXED_COLOURS;
}
