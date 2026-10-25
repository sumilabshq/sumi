import type { AppKind } from "../schema/app-tab.schema.js";

export const APP_LABELS: Readonly<Record<AppKind, string>> = {
	canvas: "Canvas",
	browser: "Browser",
	terminal: "Terminal",
};
