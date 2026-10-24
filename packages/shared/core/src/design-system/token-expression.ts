import type { Rgba } from "../color-math.js";
import { rgbaOfOklch } from "./oklch.js";
import { splitOutsideParentheses } from "./token-sheet.js";

export type TokenValue =
	| { readonly kind: "number"; readonly value: number; readonly unit: string }
	| { readonly kind: "colour"; readonly colour: Rgba }
	| { readonly kind: "text"; readonly text: string };

export type TokenReading = { readonly value: TokenValue } | { readonly refusal: string };

const MOST_SUBSTITUTIONS = 64;
const OKLCH_PARTS = 4;
const HALF = 0.5;
const VARIABLE = /var\(\s*(--[a-z0-9-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/;
const NUMBER = /^(-?\d*\.?\d+(?:e-?\d+)?)(%|[a-z]*)$/;
const FUNCTION = /^([a-z-]+)\(([\s\S]*)\)$/;
const PERCENT = 100;
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const ADDITIVE = /\s([+-])\s/;
const MULTIPLICATIVE = /\s*([*/])\s*/;

export function readToken(name: string, declarations: ReadonlyMap<string, string>): TokenReading {
	const declared = declarations.get(`--${name}`);
	if (declared === undefined) {
		return { refusal: `--${name} is not declared` };
	}

	const substituted = substituteVariables(declared, declarations);
	if ("refusal" in substituted) {
		return substituted;
	}

	return valueOf(substituted.text);
}

export function variablesIn(text: string): string[] {
	return [...text.matchAll(new RegExp(VARIABLE, "g"))].map(([, property = ""]) => property);
}

type Substituted = { readonly text: string } | { readonly refusal: string };

function substituteVariables(text: string, declarations: ReadonlyMap<string, string>): Substituted {
	let substituted: Substituted = { text };
	for (let step = 0; step < MOST_SUBSTITUTIONS; step += 1) {
		if ("refusal" in substituted) {
			return substituted;
		}

		const next = substitutedOnce(substituted.text, declarations);
		if (next === null) {
			return substituted;
		}

		substituted = next;
	}

	return { refusal: `${text} refers to itself` };
}

function substitutedOnce(text: string, declarations: ReadonlyMap<string, string>): Substituted | null {
	const found = VARIABLE.exec(text);
	if (found === null) {
		return null;
	}

	const [whole, property = "", fallback] = found;
	const replacement = declarations.get(property) ?? fallback?.trim();
	if (replacement === undefined) {
		return { refusal: `${property} is not declared and has no fallback` };
	}

	return { text: text.replace(whole, replacement) };
}

function valueOf(text: string): TokenReading {
	const trimmed = text.trim();
	if (trimmed === "transparent") {
		return { value: { kind: "colour", colour: TRANSPARENT } };
	}

	const number = NUMBER.exec(trimmed);
	if (number !== null) {
		return { value: { kind: "number", value: Number(number[1]), unit: number[2] ?? "" } };
	}

	const call = FUNCTION.exec(trimmed);
	if (call === null) {
		return { value: { kind: "text", text: trimmed } };
	}

	return functionValueOf(call[1] ?? "", call[2] ?? "");
}

function functionValueOf(name: string, inside: string): TokenReading {
	if (name === "calc") {
		return numberReading(calculated(inside));
	}

	if (name === "oklch") {
		return oklchOf(inside);
	}

	if (name === "color-mix") {
		return colourMixOf(inside);
	}

	return { value: { kind: "text", text: `${name}(${inside})` } };
}

function numberReading(value: number | null): TokenReading {
	if (value === null) {
		return { refusal: "a calc() reads something that is not a number" };
	}

	return { value: { kind: "number", value, unit: "" } };
}

function calculated(expression: string): number | null {
	const sum = ADDITIVE.exec(expression);
	if (sum !== null) {
		const left = calculated(expression.slice(0, sum.index));
		const right = calculated(expression.slice(sum.index + sum[0].length));
		if (left === null || right === null) {
			return null;
		}

		return sum[1] === "+" ? left + right : left - right;
	}

	return product(expression);
}

function product(expression: string): number | null {
	const [first = "", ...rest] = expression.split(MULTIPLICATIVE);
	let total = plainNumberOf(first);
	for (let at = 0; at < rest.length; at += 2) {
		const operand = plainNumberOf(rest[at + 1] ?? "");
		if (total === null || operand === null) {
			return null;
		}

		total = rest[at] === "*" ? total * operand : total / operand;
	}

	return total;
}

function plainNumberOf(text: string): number | null {
	const trimmed = text.trim();
	const reading =
		trimmed.startsWith("(") && trimmed.endsWith(")")
			? numberReading(calculated(trimmed.slice(1, -1)))
			: valueOf(trimmed);
	if (!("value" in reading) || reading.value.kind !== "number") {
		return null;
	}

	return reading.value.unit === "%" ? reading.value.value / PERCENT : reading.value.value;
}

function oklchOf(inside: string): TokenReading {
	const numbers = oklchNumbersOf(inside);
	if (numbers === null) {
		return { refusal: `oklch(${inside}) does not resolve to numbers` };
	}

	const [l = 0, c = 0, h = 0, alpha = 1] = numbers;
	return { value: { kind: "colour", colour: rgbaOfOklch({ l, c, h, alpha }) } };
}

function oklchNumbersOf(inside: string): number[] | null {
	const [channels = "", alphaText = "1"] = splitOutsideParentheses(inside, "/");
	const numbers = allNumbers([...splitOutsideParentheses(channels.trim().replace(/\s+/g, " "), " "), alphaText]);
	return numbers?.length === OKLCH_PARTS ? numbers : null;
}

function allNumbers(texts: readonly string[]): number[] | null {
	const numbers = texts.map(plainNumberOf);
	return numbers.every((number) => number !== null) ? numbers : null;
}

function colourMixOf(inside: string): TokenReading {
	const [space = "", first = "", second = ""] = splitOutsideParentheses(inside, ",").map((part) => part.trim());
	if (space !== "in srgb") {
		return { refusal: `color-mix(${space}) is read only in srgb` };
	}

	const [one, other] = [mixPartOf(first), mixPartOf(second)];
	if (one === null || other === null) {
		return { refusal: `color-mix(${inside}) mixes something that is not a colour` };
	}

	return { value: { kind: "colour", colour: mixed(one.colour, other.colour, firstShareOf(one, other)) } };
}

function firstShareOf(one: MixPart, other: MixPart): number {
	if (one.share !== undefined) {
		return one.share;
	}

	return other.share === undefined ? HALF : 1 - other.share;
}

interface MixPart {
	readonly colour: Rgba;
	readonly share?: number;
}

function mixPartOf(text: string): MixPart | null {
	const share = /\s(-?\d*\.?\d+)%$/.exec(text);
	const colourText = share === null ? text : text.slice(0, share.index);
	const reading = valueOf(colourText);
	if (!("value" in reading) || reading.value.kind !== "colour") {
		return null;
	}

	return share === null
		? { colour: reading.value.colour }
		: { colour: reading.value.colour, share: Number(share[1]) / PERCENT };
}

function mixed(one: Rgba, other: Rgba, oneShare: number): Rgba {
	const otherShare = 1 - oneShare;
	const a = one.a * oneShare + other.a * otherShare;
	if (a === 0) {
		return TRANSPARENT;
	}

	const channel = (left: number, right: number): number => (left * one.a * oneShare + right * other.a * otherShare) / a;
	return {
		r: channel(one.r, other.r),
		g: channel(one.g, other.g),
		b: channel(one.b, other.b),
		a,
	};
}
