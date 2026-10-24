import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Browser } from "../apps/studio/src/features/browser/ui/browser/browser.tsx";
import { Plate } from "../apps/studio/src/features/plate/ui/plate/plate.js";
import { BrowserPlateHeader } from "../apps/studio/src/browser/browser-plate-header.tsx";

export function inBrowserPlate(): ReactElement {
	return h(Plate, {
		side: "app",
		label: "Browser",
		edgeStart: null,
		lead: null,
		crumb: null,
		more: null,
		edgeEnd: null,
		children: [h(Browser, { key: "browser" }), h(BrowserPlateHeader, { key: "head" })],
	});
}
