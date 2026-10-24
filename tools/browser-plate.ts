import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Browser } from "../packages/domain/browser/generated/index.ts";
import { Plate } from "../packages/client/shell/index.ts";
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
