export type Rgba = readonly [number, number, number, number];

export interface GpuTokens {
	readonly colours: Readonly<Record<string, Rgba>>;
	readonly lengths: Readonly<Record<string, number>>;
}

export const COLOUR_WORDS: Readonly<Record<string, string>> = {
	page: "var(--page)",
	group: "var(--group-fill)",
	"group-inset": "var(--group-inset)",
	line: "var(--group-line)",
	fill: "var(--fill)",
	"fill-hover": "var(--fill-hover)",
	raise: "var(--raise)",
	edge: "var(--card-edge)",
	ink: "var(--foreground)",
	"ink-muted": "var(--muted-foreground)",
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
	success: "var(--success)",
	warning: "var(--warning)",
	error: "var(--error)",
	info: "var(--info)",
	note: "var(--note)",
	standout: "var(--standout)",
	highlight: "var(--highlight)",
	"brand-wash": "var(--accent-wash)",
	"accent-wash": "var(--accent-wash)",
	"success-wash": "var(--success-wash)",
	"warning-wash": "var(--warning-wash)",
	"error-wash": "var(--error-wash)",
	"info-wash": "var(--info-wash)",
	"note-wash": "var(--note-wash)",
	"standout-wash": "var(--standout-wash)",
	"highlight-wash": "var(--highlight-wash)",
	red: "var(--red)",
	orange: "var(--orange)",
	yellow: "var(--yellow)",
	green: "var(--green)",
	cyan: "var(--cyan)",
	blue: "var(--blue)",
	purple: "var(--purple)",
	pink: "var(--pink)",
};

export const LENGTH_WORDS: Readonly<Record<string, string>> = {
	"text-inherited": "1em",
	"text-xs": "var(--text-xs)",
	"text-sm": "var(--text-s)",
	"text-base": "var(--text-m)",
	"text-lg": "var(--text-l)",
	"text-h6": "var(--h6-size)",
	"text-h5": "var(--h5-size)",
	"text-h4": "var(--h4-size)",
	"text-h3": "var(--h3-size-fixed)",
	"text-h2": "var(--h2-size)",
	"text-h1": "var(--h1-size)",
	"radius-sm": "calc(var(--radius) - 4px)",
	"radius-md": "calc(var(--radius) - 2px)",
	"radius-lg": "var(--radius)",
	"radius-xl": "calc(var(--radius) + 4px)",
	"radius-plate": "var(--plate-radius)",
	"radius-item": "var(--item)",
	"radius-control": "var(--control-corner)",
	"radius-pill": "var(--control-corner)",
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
