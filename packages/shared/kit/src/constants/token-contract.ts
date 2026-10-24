export const SHADCN_REQUIRED_TOKENS: readonly string[] = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"border",
	"input",
	"ring",
	"radius",
];

export const SHADCN_CHART_TOKENS: readonly string[] = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

export const SHADCN_SIDEBAR_TOKENS: readonly string[] = [
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
];

export const FONT_TOKENS: readonly string[] = ["font-sans", "font-serif", "font-mono"];

export const SHADCN_EXPECTED_TOKENS: readonly string[] = [
	...SHADCN_CHART_TOKENS,
	...SHADCN_SIDEBAR_TOKENS,
	...FONT_TOKENS,
];

const TYPE_TOKENS: readonly string[] = ["type-xs", "type-s", "type-m", "type-l"];

const GAP_TOKENS: readonly string[] = ["gap-section", "gap-plate"];

const SHAPE_TOKENS: readonly string[] = ["control-lg", "shape-wide", "shape-square", "shape-band", "shape-strip"];

export const CONTROL_TOKENS: readonly string[] = [
	"control-rest",
	"control-hover",
	"control-open",
	"control-ink",
	"control-ink-on",
	"control-radius",
];

export const KIT_ROLE_TOKENS: readonly string[] = [
	"group",
	"group-inset",
	"group-line",
	"raise",
	"fill",
	"fill-hover",
	"ink-muted",
	"accent-wash",
	"accent-wash-hover",
	...TYPE_TOKENS,
	...GAP_TOKENS,
];

const TONE_TOKENS: readonly string[] = [
	"success",
	"warning",
	"info",
	"note",
	"standout",
	"highlight",
	"red",
	"orange",
	"yellow",
	"green",
	"cyan",
	"blue",
	"purple",
	"pink",
];

export const BRAND_EXTENSION_TOKENS: readonly string[] = [
	"brand",
	"brand-foreground",
	"brand-hover",
	"tint",
	"on-wash",
	"faint",
	"field",
	"neutral",
	...TONE_TOKENS,
];

export const NON_COLOUR_TOKENS: ReadonlySet<string> = new Set([
	"radius",
	...FONT_TOKENS,
	...TYPE_TOKENS,
	...GAP_TOKENS,
	...SHAPE_TOKENS,
	"control-radius",
]);

export const CONTRACT_TOKENS: readonly string[] = [
	...SHADCN_REQUIRED_TOKENS,
	...SHADCN_EXPECTED_TOKENS,
	...KIT_ROLE_TOKENS,
	...BRAND_EXTENSION_TOKENS,
	...SHAPE_TOKENS,
	...CONTROL_TOKENS,
];

const FOREGROUND_SUFFIX = "-foreground";

export const FOREGROUND_PAIRS: readonly (readonly [string, string])[] = [
	["background", "foreground"],
	...CONTRACT_TOKENS.filter((name) => name.endsWith(FOREGROUND_SUFFIX)).map(
		(foreground) => [foreground.slice(0, -FOREGROUND_SUFFIX.length), foreground] as const,
	),
];
