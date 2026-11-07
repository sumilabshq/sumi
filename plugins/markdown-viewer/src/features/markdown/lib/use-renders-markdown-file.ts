import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { FILE_LOOK, markdownNodesOf } from "@widgetarium/markdown";
import { MARKDOWN_PAGE_SHEET } from "./markdown-page-sheet.js";

const SHEET_ID = "sumi-markdown-page-sheet";

export function useRendersMarkdownFile(markdown: string | null): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = holder.current;

		if (node === null || markdown === null) {
			return undefined;
		}

		layPageSheet(node.ownerDocument);
		node.replaceChildren(...markdownNodesOf(node.ownerDocument, markdown, FILE_LOOK));
		return () => node.replaceChildren();
	}, [markdown]);
	return holder;
}

function layPageSheet(page: Document): void {
	const sheet = page.getElementById(SHEET_ID) ?? page.head.appendChild(page.createElement("style"));
	sheet.id = SHEET_ID;

	if (sheet.textContent !== MARKDOWN_PAGE_SHEET) {
		sheet.textContent = MARKDOWN_PAGE_SHEET;
	}
}
