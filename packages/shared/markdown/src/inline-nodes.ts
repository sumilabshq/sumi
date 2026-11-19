import { isSumiLink, linkOf, linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";
import { DATA_MARK, dataMarkOf } from "./data-marks.js";

const OLD_TAB_LINK = /^tab:([\w-]+)$/;
const WEB_LINK = /^https?:\/\//;
const SHOWN_AS_IS = /^(?:https?:\/\/|data:image\/)/;
const FILE_LINK = /^(?:sumi:\/\/file\/|file:\/\/)(.*)$/;

export const IMAGE_CLASS = "wg-studio-ai-image";

export const IMAGE_PATH_ATTRIBUTE = "data-image-path";

export const TAB_ATTRIBUTE = "data-tab";

export const LINK_TARGET_ATTRIBUTE = "data-link-target";

export const LINK_ICON_CLASS = "wg-studio-ai-link-icon";

interface InlineRule {
	readonly pattern: RegExp;
	readonly tag: "code" | "strong" | "em" | "del" | "img" | "a" | "mark";
}

const INLINE_RULES: readonly InlineRule[] = [
	{
		pattern: /`([^`\n]+)`/,
		tag: "code",
	},
	{
		pattern: /!\[([^\]\n]*)\]\(([^)\s]+)\)/,
		tag: "img",
	},
	{
		pattern: /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"(_blank)")?\)/,
		tag: "a",
	},
	{
		pattern: DATA_MARK,
		tag: "mark",
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

	if (rule.tag === "img") {
		return imageNodeOf(page, inner, match[2] ?? "");
	}

	if (rule.tag === "a") {
		return linkNodeOf(page, inner, oldTabLinkRead(match[2] ?? ""), match[3] ?? null);
	}

	if (rule.tag === "mark") {
		return dataMarkOf(page, inner, match[2] ?? "") ?? page.createTextNode(match[0]);
	}

	const element = page.createElement(rule.tag);
	element.append(...inlineNodesOf(page, inner));
	return element;
}

function imageNodeOf(page: Document, alt: string, target: string): Node {
	if (SHOWN_AS_IS.test(target)) {
		const image = page.createElement("img");
		image.className = IMAGE_CLASS;
		image.alt = alt;
		image.src = target;
		return image;
	}

	const path = filePathOf(target);

	if (path === null) {
		return page.createTextNode(alt);
	}

	const spot = page.createElement("span");
	spot.className = IMAGE_CLASS;
	spot.setAttribute(IMAGE_PATH_ATTRIBUTE, path);
	spot.textContent = alt;
	return spot;
}

function filePathOf(target: string): string | null {
	const path = decodedOf(target.startsWith("/") ? target : (FILE_LINK.exec(target)?.[1] ?? ""));
	return path.startsWith("/") ? path : null;
}

function decodedOf(text: string): string {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
}

function oldTabLinkRead(target: string): string {
	const oldTab = OLD_TAB_LINK.exec(target);
	return oldTab === null ? target : linkOf({ kind: "tab", id: oldTab[1] ?? "" });
}

function linkNodeOf(page: Document, label: string, target: string, opensIn: string | null): Node {
	if (isSumiLink(target)) {
		return withOpensIn(sumiLinkNodeOf(page, label, target), opensIn);
	}

	if (!WEB_LINK.test(target)) {
		const text = page.createElement("span");
		text.append(...inlineNodesOf(page, label));
		return text;
	}

	const link = labelledLinkOf(page, label, target, siteFaviconOf(target));
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	return withOpensIn(link, opensIn);
}

function withOpensIn<T extends Node>(link: T, opensIn: string | null): T {
	if (opensIn !== null && link instanceof Element) {
		link.setAttribute(LINK_TARGET_ATTRIBUTE, opensIn);
	}

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
