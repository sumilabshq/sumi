import { isSumiLink, linkOf, linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";

const OLD_TAB_LINK = /^tab:([\w-]+)$/;
const WEB_LINK = /^https?:\/\//;

export const TAB_ATTRIBUTE = "data-tab";

export const LINK_ICON_CLASS = "wg-studio-ai-link-icon";

interface InlineRule {
	readonly pattern: RegExp;
	readonly tag: "code" | "strong" | "em" | "del" | "a";
}

const INLINE_RULES: readonly InlineRule[] = [
	{
		pattern: /`([^`\n]+)`/,
		tag: "code",
	},
	{
		pattern: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
		tag: "a",
	},
	{
		pattern: /\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/,
		tag: "strong",
	},
	{
		pattern: /(?<!\w)__(?=\S)([\s\S]+?)(?<=\S)__(?!\w)/,
		tag: "strong",
	},
	{
		pattern: /~~(?=\S)([\s\S]+?)(?<=\S)~~/,
		tag: "del",
	},
	{
		pattern: /(?<![\w*])\*(?=[^\s*])([^*\n]+?)(?<=\S)\*(?![\w*])/,
		tag: "em",
	},
	{
		pattern: /(?<!\w)_(?=\S)([^_\n]+?)(?<=\S)_(?!\w)/,
		tag: "em",
	},
];

interface Found {
	readonly rule: InlineRule;
	readonly match: RegExpExecArray;
}

export function inlineNodesOf(page: Document, text: string): readonly Node[] {
	const found = firstFound(text);

	if (!found) {
		return text === "" ? [] : [page.createTextNode(text)];
	}

	const { rule, match } = found;
	const before = text.slice(0, match.index);
	const after = text.slice(match.index + match[0].length);
	return [...inlineNodesOf(page, before), elementOf(page, rule, match), ...inlineNodesOf(page, after)];
}

export function linkIconOf(page: Document, favicon: string | null): Element {
	if (favicon === null) {
		return linkGlyphOf(page);
	}

	const icon = page.createElement("img");
	icon.className = LINK_ICON_CLASS;
	icon.alt = "";
	icon.setAttribute("aria-hidden", "true");
	icon.addEventListener("error", () => icon.replaceWith(linkGlyphOf(page)), { once: true });
	icon.src = favicon;
	return icon;
}

function firstFound(text: string): Found | null {
	let best: Found | null = null;

	for (const rule of INLINE_RULES) {
		const match = rule.pattern.exec(text);

		if (match && (best === null || match.index < best.match.index)) {
			best = {
				rule,
				match,
			};
		}
	}

	return best;
}

function elementOf(page: Document, rule: InlineRule, match: RegExpExecArray): Node {
	const inner = match[1] ?? "";

	if (rule.tag === "code") {
		const code = page.createElement("code");
		code.textContent = inner;
		return code;
	}

	if (rule.tag === "a") {
		return linkNodeOf(page, inner, oldTabLinkRead(match[2] ?? ""));
	}

	const element = page.createElement(rule.tag);
	element.append(...inlineNodesOf(page, inner));
	return element;
}

function oldTabLinkRead(target: string): string {
	const oldTab = OLD_TAB_LINK.exec(target);
	return oldTab === null ? target : linkOf({ kind: "tab", id: oldTab[1] ?? "" });
}

function linkNodeOf(page: Document, label: string, target: string): Node {
	if (isSumiLink(target)) {
		return sumiLinkNodeOf(page, label, target);
	}

	if (!WEB_LINK.test(target)) {
		const text = page.createElement("span");
		text.append(...inlineNodesOf(page, label));
		return text;
	}

	const link = labelledLinkOf(page, label, target, siteFaviconOf(target));
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	return link;
}

function sumiLinkNodeOf(page: Document, label: string, target: string): Node {
	const link = labelledLinkOf(page, label, target, null);
	const read = linkTargetOf(target);

	if (read.ok && read.target.kind === "tab") {
		link.setAttribute(TAB_ATTRIBUTE, read.target.id);
	}

	return link;
}

function labelledLinkOf(page: Document, label: string, target: string, favicon: string | null): HTMLAnchorElement {
	const link = page.createElement("a");
	link.setAttribute("href", target);
	link.append(linkIconOf(page, favicon), ...inlineNodesOf(page, label));
	return link;
}

function linkGlyphOf(page: Document): Element {
	const glyph = page.createElement("span");
	glyph.className = `${LINK_ICON_CLASS} is-glyph`;
	glyph.setAttribute("aria-hidden", "true");
	return glyph;
}

function siteFaviconOf(target: string): string | null {
	if (!URL.canParse(target)) {
		return null;
	}

	return `${new URL(target).origin}/favicon.ico`;
}
