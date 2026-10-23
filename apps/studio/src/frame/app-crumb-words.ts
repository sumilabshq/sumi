import type { AppKind } from "@widgetarium/app-host";

export const APP_CRUMB_WORD: Readonly<Record<AppKind, string>> = {
	browser: "Browser",
	canvas: "Canvas",
};
