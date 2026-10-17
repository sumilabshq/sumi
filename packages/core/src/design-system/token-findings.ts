import {
	CONTRACT_TOKENS,
	FOREGROUND_PAIRS,
	KIT_ROLE_TOKENS,
	NON_COLOUR_TOKENS,
	SHADCN_EXPECTED_TOKENS,
	SHADCN_REQUIRED_TOKENS,
} from "@widgetarium/kit";
import { contrastOf, over, type Rgba } from "../color-math.js";
import { readToken, variablesIn } from "./token-expression.js";
import {
	DARK_SELECTOR,
	HOST_DARK_SELECTOR,
	LIGHT_SELECTOR,
	blockDeclarationsOf,
	nameOf,
	parseTokenSheet,
	themeDeclarationsOf,
	type ThemeName,
	type TokenSheet,
} from "./token-sheet.js";

const LEAST_TEXT_CONTRAST = 4.5;
const THEMES: readonly ThemeName[] = ["light", "dark"];
const CONTRACT: ReadonlySet<string> = new Set(CONTRACT_TOKENS);
const PARAMETER_VALUE = /^-?\d*\.?\d+(?:%|deg)?$/;
const LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|color)\(|\b(?:white|black)\b/i;
const HUE = "--hue";
const WHITE: Rgba = { r: 1, g: 1, b: 1, a: 1 };

export function tokenSheetFindings(text: string): string[] {
	const sheet = parseTokenSheet(text);
	return [
		...darkSelectorFindings(sheet),
		...requiredInBothBlocks(sheet),
		...unresolvedTokens(sheet),
		...unknownTokens(sheet),
		...literalColours(sheet),
		...colourWithoutParameter(sheet),
		...contrastFindings(sheet),
	];
}

export function contrastAt(
	sheet: TokenSheet,
	pair: readonly [string, string],
	{ theme, hue }: { readonly theme: ThemeName; readonly hue: number | undefined },
): number | null {
	const declarations = withHue(themeDeclarationsOf(sheet, theme), hue);
	const page = colourOf("background", declarations);
	const surface = colourOf(pair[0], declarations);
	const ink = colourOf(pair[1], declarations);
	if (page === null || surface === null || ink === null) {
		return null;
	}

	const ground = over(surface, over(page, WHITE));
	return contrastOf(over(ink, ground), ground);
}

const SWEPT_HUES: readonly number[] = Array.from({ length: 12 }, (_unused, step) => step * 30);

function parametersOf(declarations: ReadonlyMap<string, string>): string[] {
	return [...declarations]
		.filter(([property, value]) => !CONTRACT.has(nameOf(property)) && PARAMETER_VALUE.test(value))
		.map(([property]) => property);
}

function darkSelectorFindings(sheet: TokenSheet): string[] {
	const dark = sheet.rules.filter((rule) => rule.selectors.includes(DARK_SELECTOR));
	if (dark.length === 0) {
		return [`no ${DARK_SELECTOR} block: every system ships a dark theme`];
	}

	const hostless = dark.filter((rule) => !rule.selectors.includes(HOST_DARK_SELECTOR));
	return hostless.length === 0
		? []
		: [`a ${DARK_SELECTOR} block must also select ${HOST_DARK_SELECTOR}, Obsidian's dark theme`];
}

function requiredInBothBlocks(sheet: TokenSheet): string[] {
	return [LIGHT_SELECTOR, DARK_SELECTOR].flatMap((selector) => {
		const block = blockDeclarationsOf(sheet, selector);
		return SHADCN_REQUIRED_TOKENS.filter((name) => !block.has(`--${name}`)).map(
			(name) => `--${name} is required in ${selector} and is not declared there`,
		);
	});
}

function unresolvedTokens(sheet: TokenSheet): string[] {
	const expected = [...SHADCN_REQUIRED_TOKENS, ...SHADCN_EXPECTED_TOKENS, ...KIT_ROLE_TOKENS];
	return THEMES.flatMap((theme) => {
		const declarations = themeDeclarationsOf(sheet, theme);
		return expected.flatMap((name) => {
			const reading = readToken(name, declarations);
			return "refusal" in reading ? [`--${name} in the ${theme} theme: ${reading.refusal}`] : [];
		});
	});
}

function unknownTokens(sheet: TokenSheet): string[] {
	return sheet.rules.flatMap((rule) => {
		const parameters = new Set(parametersOf(rule.declarations));
		return [...rule.declarations.keys()]
			.filter((property) => !CONTRACT.has(nameOf(property)) && !parameters.has(property))
			.map((property) => `${property} is neither a contract token nor a numeric parameter`);
	});
}

function literalColours(sheet: TokenSheet): string[] {
	return sheet.rules.flatMap((rule) =>
		[...rule.declarations]
			.filter(([property, value]) => isColourToken(property) && LITERAL_COLOUR.test(value))
			.map(([property, value]) => `${property}: ${value} is a fixed colour; write it as oklch() of the parameters`),
	);
}

function colourWithoutParameter(sheet: TokenSheet): string[] {
	return THEMES.flatMap((theme) => {
		const declarations = themeDeclarationsOf(sheet, theme);
		const parameters = new Set(parametersOf(declarations));
		return [...declarations.keys()]
			.filter((property) => isColourToken(property) && CONTRACT.has(nameOf(property)))
			.filter((property) => !reachesParameter(property, declarations, parameters))
			.map((property) => `${property} in the ${theme} theme depends on no parameter`);
	});
}

interface ContrastProbe {
	readonly theme: ThemeName;
	readonly pair: readonly [string, string];
	readonly hue: number | undefined;
}

function contrastFindings(sheet: TokenSheet): string[] {
	const hues: readonly (number | undefined)[] = [undefined, ...SWEPT_HUES];
	const pairsInThemes = THEMES.flatMap((theme) => FOREGROUND_PAIRS.map((pair) => ({ theme, pair })));
	const probes = pairsInThemes.flatMap((probe) => hues.map((hue): ContrastProbe => ({ ...probe, hue })));
	return probes.flatMap((probe) => contrastFindingOf(sheet, probe));
}

function contrastFindingOf(sheet: TokenSheet, { theme, pair, hue }: ContrastProbe): string[] {
	const ratio = contrastAt(sheet, pair, { theme, hue });
	if (ratio === null || ratio >= LEAST_TEXT_CONTRAST) {
		return [];
	}

	const where = hue === undefined ? "at the shipped parameters" : `at --hue ${hue}`;
	return [`--${pair[1]} on --${pair[0]} is ${ratio.toFixed(2)}:1 in the ${theme} theme ${where}`];
}

function reachesParameter(
	property: string,
	declarations: ReadonlyMap<string, string>,
	parameters: ReadonlySet<string>,
): boolean {
	return [...propertiesReachedFrom(property, declarations)].some((reached) => parameters.has(reached));
}

function propertiesReachedFrom(property: string, declarations: ReadonlyMap<string, string>): Set<string> {
	const reached = new Set<string>();
	const pending = [property];
	for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
		if (!reached.has(current)) {
			reached.add(current);
			pending.push(...variablesIn(declarations.get(current) ?? ""));
		}
	}

	return reached;
}

function isColourToken(property: string): boolean {
	const name = nameOf(property);
	return CONTRACT.has(name) && !NON_COLOUR_TOKENS.has(name);
}

function withHue(declarations: ReadonlyMap<string, string>, hue: number | undefined): ReadonlyMap<string, string> {
	if (hue === undefined) {
		return declarations;
	}

	return new Map([...declarations, [HUE, String(hue)]]);
}

function colourOf(name: string, declarations: ReadonlyMap<string, string>): Rgba | null {
	const reading = readToken(name, declarations);
	if ("refusal" in reading || reading.value.kind !== "colour") {
		return null;
	}

	return reading.value.colour;
}
