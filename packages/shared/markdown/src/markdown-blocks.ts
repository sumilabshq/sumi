import { inlineNodesOf } from "./inline-nodes.js";
import { createCodeBlock } from "./code-block.js";
import { createTableFrame } from "./table-frame.js";
import type { MarkdownLook } from "./markdown-look.js";

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s*>\s?/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const BLANK = /^\s*$/;
const ORDERED = /^\d/;

interface MarkdownDrawing {
	readonly page: Document;
	readonly look: MarkdownLook;
}

export function markdownNodesOf(page: Document, markdown: string, look: MarkdownLook): readonly Node[] {
	return blocksOf(
		{
			page,
			look,
		},
		markdown.replace(/\r\n?/g, "\n").split("\n"),
	);
}

function blocksOf(drawing: MarkdownDrawing, lines: readonly string[]): readonly Node[] {
	const nodes: Node[] = [];
	let at = 0;

	while (at < lines.length) {
		const line = lines[at] ?? "";

		if (BLANK.test(line)) {
			at += 1;
			continue;
		}

		const block = blockAt(drawing, lines, at);
		nodes.push(block.node);
		at = block.next;
	}

	return nodes;
}

interface Block {
	readonly node: Node;
	readonly next: number;
}

function blockAt(drawing: MarkdownDrawing, lines: readonly string[], at: number): Block {
	const line = lines[at] ?? "";

	if (FENCE.test(line)) {
		return fencedAt(drawing, lines, at);
	}

	const heading = HEADING.exec(line);

	if (heading) {
		const element = drawing.page.createElement(`h${(heading[1] ?? "#").length}`);
		element.append(...inlineNodesOf(drawing.page, heading[2] ?? ""));
		return {
			node: element,
			next: at + 1,
		};
	}

	if (RULE.test(line)) {
		return {
			node: drawing.page.createElement("hr"),
			next: at + 1,
		};
	}

	if (QUOTE.test(line)) {
		return quoteAt(drawing, lines, at);
	}

	if (ITEM.test(line)) {
		return listAt(drawing, lines, at);
	}

	if (line.includes("|") && TABLE_DIVIDER.test(lines[at + 1] ?? "")) {
		return tableAt(drawing.page, lines, at);
	}

	return paragraphAt(drawing.page, lines, at);
}

function fencedAt(drawing: MarkdownDrawing, lines: readonly string[], at: number): Block {
	const openerLine = (lines[at] ?? "").trim();
	const opener = FENCE.exec(openerLine)?.[1] ?? "```";
	const body: string[] = [];
	let next = at + 1;

	while (next < lines.length && !(lines[next] ?? "").trim().startsWith(opener)) {
		body.push(lines[next] ?? "");
		next += 1;
	}

	return {
		node: createCodeBlock(drawing.page, {
			info: openerLine.slice(opener.length).trim(),
			body: body.join("\n"),
			look: drawing.look,
		}),
		next: next + 1,
	};
}

function quoteAt(drawing: MarkdownDrawing, lines: readonly string[], at: number): Block {
	const inner: string[] = [];
	let next = at;

	while (next < lines.length && QUOTE.test(lines[next] ?? "")) {
		inner.push((lines[next] ?? "").replace(QUOTE, ""));
		next += 1;
	}

	const quote = drawing.page.createElement("blockquote");
	quote.append(...blocksOf(drawing, inner));
	return {
		node: quote,
		next,
	};
}

function listAt(drawing: MarkdownDrawing, lines: readonly string[], at: number): Block {
	const first = ITEM.exec(lines[at] ?? "");
	const indent = (first?.[1] ?? "").length;
	const isOrdered = ORDERED.test(first?.[2] ?? "");
	const list = drawing.page.createElement(isOrdered ? "ol" : "ul");
	let next = at;

	while (next < lines.length) {
		const item = ITEM.exec(lines[next] ?? "");

		if (!item || (item[1] ?? "").length !== indent || ORDERED.test(item[2] ?? "") !== isOrdered) {
			break;
		}

		const entry = list.appendChild(drawing.page.createElement("li"));
		entry.append(...inlineNodesOf(drawing.page, item[3] ?? ""));
		next += 1;
		const nested: string[] = [];

		while (next < lines.length && isInsideItem(lines[next] ?? "", indent)) {
			nested.push(lines[next] ?? "");
			next += 1;
		}

		if (nested.length > 0) {
			entry.append(...blocksOf(drawing, nested));
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
		node: createTableFrame(page, table, lines.slice(at, next).join("\n")),
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
