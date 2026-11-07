import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { BROWSER_PAGE_SHEET } from "./browser-page-sheet.js";

const SHEET_ID = "wg-browser-page-sheet";

export function useLaysBrowserSheet(root: RefObject<HTMLElement | null>): void {
	useLayoutEffect(() => {
		const ownerDocument = root.current?.ownerDocument;

		if (ownerDocument === undefined || ownerDocument.getElementById(SHEET_ID) !== null) {
			return;
		}

		const sheet = ownerDocument.createElement("style");
		sheet.id = SHEET_ID;
		sheet.textContent = BROWSER_PAGE_SHEET;
		ownerDocument.head.append(sheet);
	}, [root]);
}
