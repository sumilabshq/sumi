import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import postcss from "postcss";
import type { Rule } from "postcss";
import { KIT_TOKENS } from "../packages/shared/kit/src/constants/kit-tokens.ts";

export const KIT_STYLE_ROOTS: readonly string[] = ["plugins", "apps/studio/src", "apps/tasks/src"];

const KIT_PACKAGE = "@widgetarium/kit";
const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "generated", "target"]);
const RAW_ELEMENT = /<(button|input|textarea|select)[\s>/]/g;
const UTILITY = /(?<![\w:-])cv:([^\s"'`]+)/g;
const STATE_VARIANT =
	/hover|focus|active|disabled|checked|aria-|data-\[?(?:state|active|selected|current|open|closed|disabled|pressed|picked|lifted|highlighted|dragging)|group-hover|group-focus|peer-(?:hover|focus|checked)/;
const UTILITY_RADIUS = /^rounded(?:-[a-z]+)*(?:-\[[^\]]*\])?$/;
const EXPLICIT_NONE_RADIUS = /^rounded(?:-[a-z]{1,2})?-none$/;
const KIT_UTILITY_RADIUS = /^rounded(?:-[a-z]{1,2})?-(?:control|item|plate|pill)$/;
const UTILITY_COLOR = /\[#[0-9a-fA-F]{3,8}\]/;
const PAINT_BASE =
	/^-?(?:bg-|border|shadow|ring|outline|fill-|stroke-|decoration-|caret-|accent-|text-(?!(?:xs|sm|base|lg|xl|\d?xl|left|right|center|start|end|justify|wrap|nowrap|balance|pretty|ellipsis|clip)$|\[\d|\[length:))/;
const RADIUS_PROPERTY = /^border-(?:[a-z]+-)*radius$/;
const SPACING_PROPERTY = /^(?:padding|margin)(?:-[a-z-]+)?$|^(?:row-|column-)?gap$/;
const BARE_VAR = /var\(--[\w-]+\)/g;
const MATH = /^(?:calc|min|max|clamp)\(/;
const LENGTH = /(?<![\w-])-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|lh|cqi|cqw|cqh|dvh|svh)(?![\w-])/;
const BARE_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;
const SPACING_KEYWORD = /^(?:auto|inherit|initial|unset|revert)$/;
const NAMED_COLOR =
	/(?<![\w-])(?:white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|silver|gold|navy|teal|cyan|magenta|lime|maroon|olive|aqua|fuchsia)(?![\w-])/;
const ROOT_SELECTOR = /^:root(?:\.[\w-]+|\[[^\]]+\])*$/;
const UTILITY_SPACING = /^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-\[(.*)\]$/;
const UTILITY_ARBITRARY_PAINT = /^(?:bg|text|border|fill|stroke|outline|ring|decoration|caret)-\[(.*)\]$/;
const KIT_TOKEN = new RegExp(`var\\(--(?:${KIT_TOKENS.join("|")})\\)`, "g");
const SUMI_RADIUS = /var\(--r-[a-z0-9-]+\)/;
const SUMI_STATE = /var\(--(?:hover|active|selected|glyph-[a-z0-9-]+)\)/;
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\((?!\s*from\s)/;
const MASK_PROPERTY = /^(?:-webkit-)?mask(?:-image)?$/;
const SKIN_PROPERTY =
	/^(?:background(?:-[a-z-]+)?|color|border(?:-[a-z-]+)?|box-shadow|outline(?:-[a-z-]+)?|fill|stroke|text-decoration(?:-[a-z-]+)?)$/;
const PAINT_TOKEN =
	/var\(--[\w-]*(?:color|colour|fill|hover|active|selected|text|ink|line|edge|plate|soft|sunken|overlay|wash|background|shadow|glyph|accent|brand|border|ring|foreground|muted|group|focus|open)[\w-]*/;
const INK_ONLY_COMPONENTS = new Set(["Icon"]);
const STATE_SELECTOR =
	/:(?:hover|active|focus|focus-visible|focus-within|checked|disabled)\b|\[(?:aria-(?:current|selected|pressed|expanded|checked|disabled)|data-(?:state|active|selected|current|open|disabled|pressed))\b|\.is-(?:active|selected|current|open|on|pressed|disabled)\b/;
const DRAWN_PART = /::?(?:before|after)\b/;
const CLASS_IN_SELECTOR = /\.([a-zA-Z_][\w-]*)/g;
const MODIFIER_CLASS = /^(?:is-|wg-kit-)/;

export function kitStyleFilesUnder(roots: readonly string[]): readonly string[] {
	return roots
		.flatMap((root) => filesUnder(root))
		.filter((file) => /\.(css|tsx?)$/.test(file) && !file.endsWith(".d.ts"));
}

function filesUnder(folder: string): readonly string[] {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) {
			return SKIPPED_FOLDERS.has(entry.name) ? [] : filesUnder(path.join(folder, entry.name));
		}

		return [path.join(folder, entry.name)];
	});
}

export function kitStyleRefusalsUnder(roots: readonly string[]): readonly string[] {
	const files = kitStyleFilesUnder(roots).map((file) => ({
		file,
		text: readFileSync(file, "utf8"),
	}));
	const kitClasses = new Set(
		files.filter(({ file }) => file.endsWith(".tsx")).flatMap(({ text }) => kitClassesOf(text)),
	);
	return files.flatMap(({ file, text }) => kitStyleRefusalsOf(file, text, kitClasses));
}

export function kitStyleRefusalsOf(
	file: string,
	text: string,
	kitClasses: ReadonlySet<string> = new Set(),
): readonly string[] {
	if (file.endsWith(".ts")) {
		return utilityRefusalsOf(file, text);
	}

	if (file.endsWith(".tsx")) {
		return [...rawElementRefusalsOf(file, text), ...utilityRefusalsOf(file, text), ...kitUtilityRefusalsOf(file, text)];
	}

	return sheetRefusalsOf(file, text, kitClasses);
}

function rawElementRefusalsOf(file: string, text: string): readonly string[] {
	return [...text.matchAll(RAW_ELEMENT)].map((found) => {
		const line = text.slice(0, found.index).split("\n").length;
		return `${file}:${line} raw-element: <${found[1] ?? ""}> outside the kit; use the kit component`;
	});
}

function utilityPartsOf(utility: string): { readonly variants: readonly string[]; readonly base: string } {
	const parts: string[] = [];
	let depth = 0;
	let part = "";

	for (const character of utility) {
		depth += character === "[" || character === "(" ? 1 : character === "]" || character === ")" ? -1 : 0;

		if (character === ":" && depth === 0) {
			parts.push(part);
			part = "";
			continue;
		}

		part += character;
	}

	return {
		variants: parts,
		base: part,
	};
}

function utilityRefusalsOf(file: string, text: string): readonly string[] {
	return [...text.matchAll(UTILITY)].flatMap((found) => {
		const utility = found[1] ?? "";
		const { variants, base } = utilityPartsOf(utility);
		const at = `${file}:${text.slice(0, found.index).split("\n").length}`;

		if (variants.some((variant) => variant.includes("wg-kit-"))) {
			return [
				`${at} kit-selector: cv:${utility} restyles a kit component from outside the kit; give the kit the state or variant`,
			];
		}

		if (PAINT_BASE.test(base) && variants.some((variant) => STATE_VARIANT.test(variant))) {
			return [`${at} utility-state: cv:${utility} paints a state; states are drawn by kit components`];
		}

		if (UTILITY_RADIUS.test(base) && !KIT_UTILITY_RADIUS.test(base) && !EXPLICIT_NONE_RADIUS.test(base)) {
			return [`${at} utility-radius: cv:${utility}; only rounded-control, rounded-item, rounded-plate or rounded-pill`];
		}

		const spacing = UTILITY_SPACING.exec(base)?.[1];

		if (spacing !== undefined && !isTokenSpacing(spacing.replaceAll("_", " "))) {
			return [`${at} spacing-literal: cv:${utility}; spacing comes from a :root variable`];
		}

		const paint = UTILITY_ARBITRARY_PAINT.exec(base)?.[1];

		if (
			paint !== undefined &&
			!/^(?:length:)?var\(--[\w-]+\)$/.test(paint) &&
			!/^length:/.test(paint) &&
			(COLOR_LITERAL.test(paint) || NAMED_COLOR.test(paint) || /^color-mix/.test(paint))
		) {
			return [`${at} color-literal: cv:${utility}; read a colour token`];
		}

		if (UTILITY_COLOR.test(base)) {
			return [`${at} color-literal: cv:${utility}; read a colour token`];
		}

		return [];
	});
}

function sheetRefusalsOf(file: string, text: string, kitClasses: ReadonlySet<string>): readonly string[] {
	const refusals: string[] = [];
	const sheet = postcss.parse(text, { from: file });

	sheet.walkRules((rule) => {
		refusals.push(...ruleRefusalsOf(`${file}:${rule.source?.start?.line ?? 0}`, rule, kitClasses));
	});
	sheet.walkDecls((declaration) => {
		const at = `${file}:${declaration.source?.start?.line ?? 0}`;
		const owner = declaration.parent;

		if (
			declaration.prop.startsWith("--") &&
			owner?.type === "rule" &&
			"selectors" in owner &&
			!owner.selectors.every((selector) => ROOT_SELECTOR.test(selector.trim()))
		) {
			refusals.push(
				`${at} local-variable: ${declaration.prop} is declared off :root; custom properties are global, declared on :root`,
			);
		}

		refusals.push(...declarationRefusalsOf(at, declaration.prop, declaration.value));
	});
	return refusals;
}

function ruleRefusalsOf(at: string, rule: Rule, kitClasses: ReadonlySet<string>): readonly string[] {
	const refusals: string[] = [];
	const skin = rule.nodes.flatMap((node) => (node.type === "decl" && paints(node.prop, node.value) ? [node.prop] : []));

	if (rule.selector.replace(/\.wg-kit-portal-layer(?![\w-])/g, "").includes(".wg-kit-")) {
		return [`${at} kit-selector: restyles a kit component from outside the kit; give the kit the state or variant`];
	}

	const restyled = rule.selectors.flatMap((selector) => restyledKitClassesOf(selector, skin.length > 0, kitClasses));

	if (restyled.length > 0) {
		refusals.push(
			`${at} kit-restyle: .${restyled[0] ?? ""} is a class on a kit component and this rule paints it; give the kit the state or variant`,
		);
	}

	if (skin.length > 0 && rule.selectors.some((selector) => STATE_SELECTOR.test(selector))) {
		refusals.push(
			`${at} custom-state: ${rule.selector.replace(/\s+/g, " ")} paints a state (${skin.join(", ")}); states are drawn by kit components`,
		);
	}

	return refusals;
}

function paints(property: string, value: string): boolean {
	if (property.startsWith("--")) {
		return COLOR_LITERAL.test(value) || PAINT_TOKEN.test(value);
	}

	return SKIN_PROPERTY.test(property);
}

function restyledKitClassesOf(selector: string, paints: boolean, kitClasses: ReadonlySet<string>): readonly string[] {
	const subject =
		selector
			.trim()
			.split(/\s*[\s>+~]\s*/)
			.at(-1) ?? "";

	if (!paints && !DRAWN_PART.test(subject)) {
		return [];
	}

	return [...subject.matchAll(CLASS_IN_SELECTOR)].map((found) => found[1] ?? "").filter((name) => kitClasses.has(name));
}

function declarationRefusalsOf(at: string, property: string, value: string): readonly string[] {
	const refusals: string[] = [];

	if (RADIUS_PROPERTY.test(property) && !isKitRadius(value)) {
		refusals.push(`${at} radius-literal: ${property}: ${value}; only kit radius tokens`);
	}

	if (!RADIUS_PROPERTY.test(property) && SUMI_RADIUS.test(value)) {
		refusals.push(`${at} sumi-radius: ${property}: ${value}; --r-* is a theme primitive, read a kit radius token`);
	}

	if (SUMI_STATE.test(value)) {
		refusals.push(
			`${at} state-token: ${property}: ${value}; hover, active, selected and glyph colours are the kit's states`,
		);
	}

	if (SPACING_PROPERTY.test(property) && !isTokenSpacing(value)) {
		refusals.push(
			`${at} spacing-literal: ${property}: ${value}; spacing comes from a :root variable, var(--space-none) for none`,
		);
	}

	if (
		!MASK_PROPERTY.test(property) &&
		(COLOR_LITERAL.test(value) || (!property.startsWith("--") && NAMED_COLOR.test(value)))
	) {
		refusals.push(`${at} color-literal: ${property}: ${value}; read a colour token`);
	}

	return refusals;
}

function isKitRadius(value: string): boolean {
	const rest = value.replace(KIT_TOKEN, "").replace(/[\s/]/g, "");
	return rest === "" || value.trim() === "inherit";
}

function topLevelPartsOf(value: string): readonly string[] {
	const parts: string[] = [];
	let depth = 0;
	let part = "";

	for (const character of value) {
		depth += character === "(" ? 1 : character === ")" ? -1 : 0;

		if (/\s/.test(character) && depth === 0) {
			parts.push(part);
			part = "";
			continue;
		}

		part += character;
	}

	return [...parts, part].filter((one) => one !== "");
}

export function isTokenSpacing(value: string): boolean {
	return topLevelPartsOf(value.trim()).every((part) => {
		const bare = part.replace(BARE_VAR, "");

		if (part.startsWith("var(")) {
			return bare.trim() === "";
		}

		if (MATH.test(part)) {
			return !LENGTH.test(bare) && !bare.includes("var(");
		}

		return SPACING_KEYWORD.test(part) || (!BARE_NUMBER.test(part) && !LENGTH.test(part) && bare.trim() === "");
	});
}

type Node = { readonly type: string } & Readonly<Record<string, unknown>>;

function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function fieldOf(value: unknown, key: string): unknown {
	return typeof value === "object" && value !== null && key in value ? Reflect.get(value, key) : undefined;
}

function childrenOf(node: Node): readonly Node[] {
	return Object.entries(node)
		.filter(([key]) => key !== "loc" && key !== "start" && key !== "end")
		.flatMap(([, value]) => (Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []));
}

function nodesOf(root: Node): readonly Node[] {
	return [root, ...childrenOf(root).flatMap(nodesOf)];
}

function kitUtilityRefusalsOf(file: string, text: string): readonly string[] {
	return kitClassNamesOf(text).flatMap(({ line, words }) =>
		words
			.filter((word) => word.startsWith("cv:") && PAINT_BASE.test(utilityPartsOf(word.slice(3)).base))
			.map((word) => `${file}:${line} kit-restyle: ${word} paints a kit component; give the kit the state or variant`),
	);
}

export function kitClassesOf(text: string): readonly string[] {
	return kitClassNamesOf(text)
		.flatMap(({ words }) => words)
		.filter((word) => /^[a-zA-Z_](?:[\w-]*\w)?$/.test(word) && !MODIFIER_CLASS.test(word));
}

function kitClassNamesOf(text: string): readonly { readonly line: number; readonly words: readonly string[] }[] {
	const program: unknown = parse(text, {
		sourceType: "module",
		allowReturnOutsideFunction: true,
		plugins: ["jsx", "typescript"],
	}).program;

	if (!isNode(program)) {
		return [];
	}

	const nodes = nodesOf(program);
	const kitNames = new Set(nodes.flatMap(kitImportNamesOf).filter((name) => !INK_ONLY_COMPONENTS.has(name)));
	const constants = new Map(nodes.flatMap(constantOf));
	const kitElements = nodes.filter((node) => node.type === "JSXOpeningElement" && kitNames.has(elementNameOf(node)));
	return kitElements.flatMap((element) =>
		(Array.isArray(element["attributes"]) ? element["attributes"].filter(isNode) : [])
			.filter(
				(attribute) =>
					attribute.type === "JSXAttribute" && isNode(attribute["name"]) && attribute["name"]["name"] === "className",
			)
			.map((attribute) => ({
				line: Number(fieldOf(fieldOf(element["loc"], "start"), "line") ?? 0),
				words: wordsOf(attribute["value"], constants),
			})),
	);
}

function kitImportNamesOf(node: Node): readonly string[] {
	if (node.type !== "ImportDeclaration" || !isNode(node["source"]) || node["source"]["value"] !== KIT_PACKAGE) {
		return [];
	}

	const specifiers = Array.isArray(node["specifiers"]) ? node["specifiers"].filter(isNode) : [];
	return specifiers.flatMap((specifier) => (isNode(specifier["local"]) ? [String(specifier["local"]["name"])] : []));
}

function constantOf(node: Node): readonly (readonly [string, unknown])[] {
	if (node.type !== "VariableDeclarator" || !isNode(node["id"]) || node["id"].type !== "Identifier") {
		return [];
	}

	return [[String(node["id"]["name"]), node["init"]]];
}

function elementNameOf(node: Node): string {
	const name = node["name"];
	return isNode(name) && name.type === "JSXIdentifier" ? String(name["name"]) : "";
}

function wordsOf(value: unknown, constants: ReadonlyMap<string, unknown>, depth = 0): readonly string[] {
	if (!isNode(value) || depth > 8) {
		return [];
	}

	const next = (inner: unknown): readonly string[] => wordsOf(inner, constants, depth + 1);

	switch (value.type) {
		case "StringLiteral":
			return String(value["value"]).split(/\s+/);
		case "TemplateLiteral":
			return [
				...(Array.isArray(value["quasis"]) ? value["quasis"].filter(isNode) : []).flatMap((quasi) =>
					String(fieldOf(quasi["value"], "cooked") ?? "").split(/\s+/),
				),
				...(Array.isArray(value["expressions"]) ? value["expressions"] : []).flatMap(next),
			];
		case "JSXExpressionContainer":
			return next(value["expression"]);
		case "Identifier":
			return next(constants.get(String(value["name"])));
		case "ConditionalExpression":
			return [...next(value["consequent"]), ...next(value["alternate"])];
		case "LogicalExpression":
			return next(value["right"]);
		case "CallExpression":
			return (Array.isArray(value["arguments"]) ? value["arguments"] : []).flatMap(next);
		case "ArrayExpression":
			return (Array.isArray(value["elements"]) ? value["elements"] : []).flatMap(next);
		default:
			return [];
	}
}
