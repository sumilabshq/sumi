import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { FILE_LOOK, createCodeBlock } from "@widgetarium/markdown";
import { CODE_PAGE_SHEET } from "./code-page-sheet.js";
import type { ShownCode } from "./shown-code.js";

const SHEET_ID = "sumi-code-page-sheet";

export function useRendersCodeFile(shown: ShownCode | null): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = holder.current;

		if (node === null || shown === null) {
			return undefined;
		}

		layPageSheet(node.ownerDocument);
		node.replaceChildren(
			createCodeBlock(node.ownerDocument, {
				info: shown.language,
				body: shown.body,
				look: FILE_LOOK,
			}),
		);
		return () => node.replaceChildren();
	}, [shown]);
	return holder;
}

function layPageSheet(page: Document): void {
	if (page.getElementById(SHEET_ID) !== null) {
		return;
	}

	const sheet = page.createElement("style");
	sheet.id = SHEET_ID;
	sheet.textContent = CODE_PAGE_SHEET;
	page.head.append(sheet);
}
