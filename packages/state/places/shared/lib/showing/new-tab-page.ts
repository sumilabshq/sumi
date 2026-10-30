import type { AppKind, PageApp } from "../../schema/tabs.schema.js";
import type { OpenedTab } from "../tabs/host-tabs.js";

export function newTabPageOf(app: AppKind, isBrowserAvailable: boolean): string | null {
	if (app !== "browser" || !isBrowserAvailable) {
		return null;
	}

	return `page-${crypto.randomUUID()}`;
}

export function freshTabOf(app: PageApp, isBrowserAvailable: boolean): OpenedTab {
	return {
		app,
		pageId: newTabPageOf(app, isBrowserAvailable),
	};
}
