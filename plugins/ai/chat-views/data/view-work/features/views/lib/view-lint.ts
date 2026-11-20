export interface ViewProblem {
	readonly where: string;
	readonly rule: string;
	readonly found: string;
}

interface Declaration {
	readonly property: string;
	readonly value: string;
}

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/i;
const COLOR_NAME =
	/\b(white|black|red|green|blue|yellow|orange|purple|pink|gr[ae]y|silver|navy|teal|maroon|olive|lime|aqua|fuchsia|gold|brown|beige|ivory|coral|salmon|tomato|crimson|indigo|violet|cyan|magenta)\b/i;
const TOKEN = /var\(--[a-z0-9-]+\)/gi;
const SPACING_PX: ReadonlySet<number> = new Set([0, 2, 4, 6, 8, 12, 16, 20, 24, 32]);
const COLOR_PROPERTY =
	/^(color|background|background-color|background-image|border|border-(top|right|bottom|left)|border(-(top|right|bottom|left))?-color|outline|outline-color|fill|stroke|accent-color|caret-color|stop-color|text-decoration|text-decoration-color|column-rule)$/;
const SPACING_PROPERTY = /^(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/;
const BANNED_PROPERTIES: ReadonlyMap<string, string> = new Map([
	["font-family", "the font comes from Sumi: delete it"],
	["font", "the font comes from Sumi: set font-weight alone"],
	["box-shadow", "Sumi draws no shadows: delete it"],
	["text-shadow", "Sumi draws no shadows: delete it"],
]);
const ROOT_SELECTOR = /(^|[\s,>+~(])(html|body|:root|\*)(?=$|[\s,.:#[>+~{)])/;
const FRAGMENT_ONLY = /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]|<link[\s>]|@import|@font-face/i;
const OUTER_LOOK = /(^|;)\s*(padding|margin|background|border)[a-z-]*\s*:/i;
const OUTER_BOXES: readonly string[] = ["card", "callout"];
const SAFE_LINK = /^(https?:|sumi:|mailto:|#)/i;
const CHART_KINDS: ReadonlySet<string> = new Set(["bar", "line"]);
const NUMBER_CELL = /^-?[\d\s.,]+%?$/;

export function lintedViewOf(html: string): readonly ViewProblem[] {
	const problems: ViewProblem[] = [];
	const found = (where: string, rule: string, text: string): void => {
		problems.push({
			where,
			rule,
			found: text.trim().slice(0, 120),
		});
	};
	const fragmentOnly = FRAGMENT_ONLY.exec(html);

	if (fragmentOnly !== null) {
		found("markup", "a fragment only: no doctype, html, head, body, link, @import or @font-face", fragmentOnly[0]);
	}

	const page = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
	lintStyles(page, found);
	lintScripts(page, found);
	lintOuterElement(page, found);
	lintText(page, found);
	lintAddresses(page, found);
	lintComponents(page, found);
	return problems;
}

export function refusalOf(problems: readonly ViewProblem[]): string {
	const lines = problems.map(({ where, rule, found }) => `- ${where}: ${rule} (found: ${found})`);
	return `Sumi refused the view, nothing was shown. Fix every problem and call it again:\n${lines.join("\n")}`;
}

type Found = (where: string, rule: string, text: string) => void;

function lintStyles(page: Document, found: Found): void {
	for (const sheet of page.querySelectorAll("style")) {
		for (const rule of rulesOf(sheet.textContent ?? "")) {
			if (ROOT_SELECTOR.test(rule.selector) && !rule.selector.startsWith("@")) {
				found(`<style> ${rule.selector}`, "never style html, body, :root or *", rule.selector);
			}

			for (const declaration of declarationsOf(rule.body)) {
				lintDeclaration(`<style> ${rule.selector}`, declaration, found);
			}
		}
	}

	for (const styled of page.body.querySelectorAll("[style]")) {
		for (const declaration of declarationsOf(styled.getAttribute("style") ?? "")) {
			lintDeclaration(`<${styled.localName} style>`, declaration, found);
		}
	}

	for (const painted of page.body.querySelectorAll("[fill], [stroke], [stop-color], [color]")) {
		for (const name of ["fill", "stroke", "stop-color", "color"]) {
			const value = painted.getAttribute(name);

			if (value !== null && hasColorLiteral(value)) {
				found(`<${painted.localName} ${name}>`, "colours only as currentColor or var(--sumi-…)", `${name}="${value}"`);
			}
		}
	}
}

function lintDeclaration(where: string, { property, value }: Declaration, found: Found): void {
	const problem = declarationProblemOf(property, value);

	if (problem !== null) {
		found(where, problem, `${property}: ${value}`);
	}
}

function declarationProblemOf(property: string, value: string): string | null {
	const banned = BANNED_PROPERTIES.get(property);

	if (banned !== undefined) {
		return banned;
	}

	if (COLOR_PROPERTY.test(property) && hasColorLiteral(value)) {
		return "colours only as var(--sumi-…), currentColor or transparent";
	}

	if (SPACING_PROPERTY.test(property) && !isSpacingScale(value)) {
		return "spacing only 0, 4, 8, 12, 16, 24 or 32px";
	}

	if (property === "font-size" && !/^(var\(--sumi-fs-\d+\)|inherit)$/.test(value)) {
		return "keep the chat's text size: no font-size, or var(--sumi-fs-12|13|16)";
	}

	if (property === "border-radius" && !/^((var\(--sumi-r-[a-z]+\)|0|50%)\s*)+$/.test(value)) {
		return "corners are square: no border-radius, or 50% for a dot";
	}

	if (property === "font-weight" && !/^(400|500|600|normal)$/.test(value)) {
		return "weights only 400, 500 or 600";
	}

	if (property === "text-transform" && /uppercase/.test(value)) {
		return "no uppercase in Sumi";
	}

	if (property === "position" && value === "fixed") {
		return "a view stays in the chat's flow: no position fixed";
	}

	return null;
}

function lintScripts(page: Document, found: Found): void {
	for (const script of page.querySelectorAll("script")) {
		if (script.hasAttribute("src")) {
			found("<script src>", "no libraries and no network: write plain JavaScript inline", script.getAttribute("src") ?? "");
		}

		const body = script.textContent ?? "";
		const literal = /["'`](#[0-9a-f]{3,8}|rgba?\([^"'`]*\)|hsla?\([^"'`]*\))["'`]/i.exec(body);

		if (literal !== null) {
			found("<script>", "no colours in scripts: toggle a class or use var(--sumi-…)", literal[0]);
		}

		if (/fontFamily|\.style\.font\s*=/.test(body)) {
			found("<script>", "never set a font from a script", "fontFamily");
		}

		if (/\bfetch\(|XMLHttpRequest|WebSocket|localStorage|document\.cookie/.test(body)) {
			found("<script>", "a view has no network and no storage", "fetch, XMLHttpRequest, WebSocket or storage");
		}
	}
}

function lintOuterElement(page: Document, found: Found): void {
	for (const outer of page.body.children) {
		if (outer.localName === "style" || outer.localName === "script" || outer.localName === "dialog") {
			continue;
		}

		const boxed = OUTER_BOXES.find((name) => outer.classList.contains(name));
		const style = outer.getAttribute("style") ?? "";

		if (boxed !== undefined || OUTER_LOOK.test(style)) {
			found(
				`outer <${outer.localName}>`,
				"an outer element has no padding, margin, background, border or card: the view starts on the chat's left edge",
				outer.outerHTML.slice(0, 80),
			);
		}
	}
}

function lintText(page: Document, found: Found): void {
	const read = page.createElement("div");
	read.innerHTML = page.body.innerHTML;
	read.querySelectorAll("script, style, pre, code").forEach((unread) => unread.remove());
	const text = read.textContent ?? "";
	const middleDot = /.{0,30}·.{0,30}/.exec(text);
	const ellipsis = /.{0,30}(…|\.\.\.).{0,10}/.exec(text);

	if (middleDot !== null) {
		found("text", "no · between items: use a list, a comma or spacing", middleDot[0]);
	}

	if (ellipsis !== null) {
		found("text", "no ellipsis written into text", ellipsis[0]);
	}
}

function lintAddresses(page: Document, found: Found): void {
	for (const link of page.querySelectorAll("a[href]")) {
		const href = link.getAttribute("href") ?? "";

		if (!SAFE_LINK.test(href)) {
			found("<a href>", "links are https, sumi:// or mailto addresses", href);
		}
	}

	for (const image of page.querySelectorAll("img")) {
		const source = image.getAttribute("src") ?? "";

		if (!source.startsWith("https://")) {
			found("<img src>", "images are https addresses you saw in a search or a page", source);
		}
	}
}

function lintComponents(page: Document, found: Found): void {
	for (const tabs of page.querySelectorAll(".tabs")) {
		const buttons = tabs.querySelectorAll(":scope > .tab-list > button").length;
		const panels = tabs.querySelectorAll(":scope > .tab-panel").length;

		if (buttons < 2 || buttons !== panels) {
			found(
				".tabs",
				"tabs hold a .tab-list of buttons and one .tab-panel per button, at least two",
				`${buttons} buttons, ${panels} panels`,
			);
		}
	}

	for (const deck of page.querySelectorAll(".slides")) {
		if (deck.querySelectorAll(":scope > .slide").length < 2) {
			found(".slides", "slides hold at least two .slide children", deck.outerHTML.slice(0, 60));
		}
	}

	for (const track of page.querySelectorAll(".carousel")) {
		if (track.children.length < 2) {
			found(".carousel", "a carousel holds at least two items", track.outerHTML.slice(0, 60));
		}
	}

	for (const opener of page.querySelectorAll("[data-opens]")) {
		const id = opener.getAttribute("data-opens") ?? "";

		if (![...page.querySelectorAll("dialog")].some((dialog) => dialog.id === id)) {
			found("[data-opens]", "a button with data-opens names the id of a <dialog> in the view", id);
		}
	}

	for (const dialog of page.querySelectorAll("dialog")) {
		const openers = [...page.querySelectorAll("[data-opens]")];

		if (dialog.id === "" || !openers.some((opener) => opener.getAttribute("data-opens") === dialog.id)) {
			found("<dialog>", "a dialog has an id and a button with data-opens naming it", dialog.outerHTML.slice(0, 60));
		}
	}

	for (const select of page.querySelectorAll("select")) {
		if (select.querySelectorAll("option").length === 0) {
			found("<select>", "a select holds at least one option", select.outerHTML.slice(0, 60));
		}
	}

	for (const chart of page.querySelectorAll("table.chart")) {
		lintChart(chart, found);
	}
}

function lintChart(chart: Element, found: Found): void {
	const kind = chart.getAttribute("data-kind") ?? "";

	if (!CHART_KINDS.has(kind)) {
		found("table.chart", 'a chart names its kind: data-kind="bar" or "line"', kind === "" ? "no data-kind" : kind);
	}

	const rows = [...chart.querySelectorAll("tbody tr")];

	if (rows.length === 0 || chart.querySelector("thead th") === null) {
		found("table.chart", "a chart table has a <thead> row of series names and <tbody> rows of numbers", chart.outerHTML.slice(0, 60));
		return;
	}

	for (const cell of rows.flatMap((row) => [...row.children].slice(1))) {
		const text = cell.textContent?.trim() ?? "";

		if (!NUMBER_CELL.test(text)) {
			found("table.chart", "every cell after a row's first is a plain number", text);
			return;
		}
	}
}

function hasColorLiteral(value: string): boolean {
	const bare = value.replace(TOKEN, "");
	return COLOR_LITERAL.test(bare) || COLOR_NAME.test(bare.replace(/url\([^)]*\)/gi, ""));
}

function isSpacingScale(value: string): boolean {
	return value
		.replace(TOKEN, "V")
		.replace(/calc\([^)]*\)/gi, "V")
		.trim()
		.split(/\s+/)
		.every((part) => {
			if (part === "V" || part === "0" || part === "auto") {
				return true;
			}

			const pixels = /^(\d+)px$/.exec(part);
			return pixels !== null && SPACING_PX.has(Number(pixels[1]));
		});
}

function declarationsOf(block: string): readonly Declaration[] {
	return block
		.split(";")
		.map((part) => part.trim())
		.filter((part) => part.includes(":"))
		.map((part) => {
			const cut = part.indexOf(":");
			return {
				property: part.slice(0, cut).trim().toLowerCase(),
				value: part
					.slice(cut + 1)
					.replace(/!important/i, "")
					.trim(),
			};
		});
}

function rulesOf(css: string): readonly { readonly selector: string; readonly body: string }[] {
	return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
		selector: (match[1] ?? "").trim(),
		body: match[2] ?? "",
	}));
}
