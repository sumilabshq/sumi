import type { Look } from "../../../shared/schema/look.schema.js";

type Tokens = Readonly<Record<string, string>>;

interface FontPair {
	readonly family: string;
	readonly weights: string;
}

const GREY_PAGE = "color-mix(in srgb, var(--text-normal) 4%, var(--background-primary))";
const TEXT_WEIGHTS = "400;500;600";
const FONTS_URL = "https://fonts.googleapis.com/css2?family={family}:wght@{weights}&display=swap";

const FONT_PAIRS: Readonly<Record<string, FontPair>> = {
	editorial: { family: "Geist", weights: TEXT_WEIGHTS },
	bookish: { family: "Source Sans 3", weights: TEXT_WEIGHTS },
	neutral: { family: "Geist", weights: TEXT_WEIGHTS },
	grotesk: { family: "Instrument Sans", weights: TEXT_WEIGHTS },
	contrast: { family: "Hanken Grotesk", weights: TEXT_WEIGHTS },
};

const LIVE_RULES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	edges: {
		outline:
			"[data-canvas-screen] :is(.wg-kit-field, .wg-kit-input-group) { box-shadow: inset 0 0 0 1px var(--wg-kit-group-line); }",
	},
};

export function liveRulesOf(look: Look): string {
	return look.settings.map((setting) => LIVE_RULES[setting.name]?.[setting.picked] ?? "").join(" ");
}

const LIVE_TOKENS: Readonly<Record<string, Readonly<Record<string, Tokens>>>> = {
	ground: {
		grey: { "--wg-kit-page": GREY_PAGE, "--wg-kit-group-fill": "var(--background-primary)" },
	},
	edges: {
		outline: {
			"--wg-kit-group-fill": "transparent",
			"--wg-kit-group-edge": "inset 0 0 0 1px var(--wg-kit-group-line)",
		},
	},
	density: {
		compact: { "--wg-gap-scale": "0.75" },
	},
	expression: {
		sharp: expressionOf({ plate: 8, pill: "8px", controls: [30, 34, 40], spring: "var(--wg-ease)" }),
		soft: expressionOf({
			plate: 12,
			pill: "12px",
			controls: [32, 38, 46],
			spring: "cubic-bezier(0.34, 1.15, 0.64, 1)",
		}),
		round: expressionOf({
			plate: 14,
			pill: "999px",
			controls: [34, 42, 52],
			spring: "cubic-bezier(0.34, 1.42, 0.64, 1)",
		}),
	},
	fonts: Object.fromEntries(Object.entries(FONT_PAIRS).map(([pair, font]) => [pair, fontTokensOf(font)])),
};

export function isSettingDrawnLive(settingName: string): boolean {
	return settingName in LIVE_TOKENS;
}

export function liveTokensOf(look: Look): Tokens {
	return Object.assign({}, ...look.settings.map((setting) => LIVE_TOKENS[setting.name]?.[setting.picked] ?? {}));
}

export function fontsUrlOf(look: Look): string | null {
	const picked = look.settings.find((setting) => setting.name === "fonts")?.picked;
	const pair = picked === undefined ? undefined : FONT_PAIRS[picked];
	if (!pair) return null;
	return FONTS_URL.replace("{family}", pair.family.replaceAll(" ", "+")).replace("{weights}", pair.weights);
}

function fontTokensOf({ family }: FontPair): Tokens {
	const stack = `"${family}", system-ui, sans-serif`;
	return { "--font-interface": stack, "--font-text": stack };
}

interface Expression {
	readonly plate: number;
	readonly pill: string;
	readonly controls: readonly [number, number, number];
	readonly spring: string;
}

function expressionOf({ plate, pill, controls: [small, medium, large], spring }: Expression): Tokens {
	return {
		"--wg-kit-plate": `${plate}px`,
		"--wg-kit-pill": pill,
		"--wg-kit-control-s": `${small}px`,
		"--wg-kit-control-m": `${medium}px`,
		"--wg-kit-control-l": `${large}px`,
		"--wg-spring": spring,
	};
}
