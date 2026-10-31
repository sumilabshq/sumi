import { isSumiLink, linkOf, linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s*>\s?/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const BLANK = /^\s*$/;
const ORDERED = /^\d/;
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

export function markdownNodesOf(page: Document, markdown: string): readonly Node[] {
	return blocksOf(page, markdown.replace(/\r\n?/g, "\n").split("\n"));
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

function blocksOf(page: Document, lines: readonly string[]): readonly Node[] {
	const nodes: Node[] = [];
	let at = 0;

	while (at < lines.length) {
		const line = lines[at] ?? "";

		if (BLANK.test(line)) {
			at += 1;
			continue;
		}

		const block = blockAt(page, lines, at);
		nodes.push(block.node);
		at = block.next;
	}

	return nodes;
}

interface Block {
	readonly node: Node;
	readonly next: number;
}

function blockAt(page: Document, lines: readonly string[], at: number): Block {
	const line = lines[at] ?? "";

	if (FENCE.test(line)) {
		return fencedAt(page, lines, at);
	}

	const heading = HEADING.exec(line);

	if (heading) {
		const element = page.createElement(`h${(heading[1] ?? "#").length}`);
		element.append(...inlineNodesOf(page, heading[2] ?? ""));
		return {
			node: element,
			next: at + 1,
		};
	}

	if (RULE.test(line)) {
		return {
			node: page.createElement("hr"),
			next: at + 1,
		};
	}

	if (QUOTE.test(line)) {
		return quoteAt(page, lines, at);
	}

	if (ITEM.test(line)) {
		return listAt(page, lines, at);
	}

	if (line.includes("|") && TABLE_DIVIDER.test(lines[at + 1] ?? "")) {
		return tableAt(page, lines, at);
	}

	return paragraphAt(page, lines, at);
}

function fencedAt(page: Document, lines: readonly string[], at: number): Block {
	const opener = (FENCE.exec(lines[at] ?? "") ?? [])[1] ?? "```";
	const body: string[] = [];
	let next = at + 1;

	while (next < lines.length && !(lines[next] ?? "").trim().startsWith(opener)) {
		body.push(lines[next] ?? "");
		next += 1;
	}

	const block = page.createElement("pre");
	const code = block.appendChild(page.createElement("code"));
	code.textContent = body.join("\n");
	return {
		node: block,
		next: next + 1,
	};
}

function quoteAt(page: Document, lines: readonly string[], at: number): Block {
	const inner: string[] = [];
	let next = at;

	while (next < lines.length && QUOTE.test(lines[next] ?? "")) {
		inner.push((lines[next] ?? "").replace(QUOTE, ""));
		next += 1;
	}

	const quote = page.createElement("blockquote");
	quote.append(...blocksOf(page, inner));
	return {
		node: quote,
		next,
	};
}

function listAt(page: Document, lines: readonly string[], at: number): Block {
	const first = ITEM.exec(lines[at] ?? "");
	const indent = (first?.[1] ?? "").length;
	const isOrdered = ORDERED.test(first?.[2] ?? "");
	const list = page.createElement(isOrdered ? "ol" : "ul");
	let next = at;

	while (next < lines.length) {
		const item = ITEM.exec(lines[next] ?? "");

		if (!item || (item[1] ?? "").length !== indent || ORDERED.test(item[2] ?? "") !== isOrdered) {
			break;
		}

		const entry = list.appendChild(page.createElement("li"));
		entry.append(...inlineNodesOf(page, item[3] ?? ""));
		next += 1;
		const nested: string[] = [];

		while (next < lines.length && isInsideItem(lines[next] ?? "", indent)) {
			nested.push(lines[next] ?? "");
			next += 1;
		}

		if (nested.length > 0) {
			entry.append(...blocksOf(page, nested));
		}
	}

	return {
		node: list,
		next,
	};
}

function isInsideItem(line: string, indent: number): boolean {
	if (BLANK.test(line)) {
		return false;
	}

	const leading = line.length - line.trimStart().length;
	return leading > indent;
}

function tableAt(page: Document, lines: readonly string[], at: number): Block {
	const table = page.createElement("table");
	const head = table.appendChild(page.createElement("thead")).appendChild(page.createElement("tr"));

	for (const cell of cellsOf(lines[at] ?? "")) {
		head.appendChild(page.createElement("th")).append(...inlineNodesOf(page, cell));
	}

	const body = table.appendChild(page.createElement("tbody"));
	let next = at + 2;

	while (next < lines.length && (lines[next] ?? "").includes("|") && !BLANK.test(lines[next] ?? "")) {
		const row = body.appendChild(page.createElement("tr"));

		for (const cell of cellsOf(lines[next] ?? "")) {
			row.appendChild(page.createElement("td")).append(...inlineNodesOf(page, cell));
		}

		next += 1;
	}

	return {
		node: table,
		next,
	};
}

function cellsOf(line: string): readonly string[] {
	return line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());
}

function paragraphAt(page: Document, lines: readonly string[], at: number): Block {
	const said: string[] = [];
	let next = at;

	while (next < lines.length && !BLANK.test(lines[next] ?? "") && (next === at || !startsBlock(lines, next))) {
		said.push(lines[next] ?? "");
		next += 1;
	}

	const paragraph = page.createElement("p");
	said.forEach((line, lineAt) => {
		if (lineAt > 0) {
			paragraph.append(page.createElement("br"));
		}

		paragraph.append(...inlineNodesOf(page, line));
	});
	return {
		node: paragraph,
		next,
	};
}

function startsBlock(lines: readonly string[], at: number): boolean {
	const line = lines[at] ?? "";
	return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || ITEM.test(line);
}

function inlineNodesOf(page: Document, text: string): readonly Node[] {
	const found = firstFound(text);

	if (!found) {
		return text === "" ? [] : [page.createTextNode(text)];
	}

	const { rule, match } = found;
	const before = text.slice(0, match.index);
	const after = text.slice(match.index + match[0].length);
	return [...inlineNodesOf(page, before), elementOf(page, rule, match), ...inlineNodesOf(page, after)];
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
