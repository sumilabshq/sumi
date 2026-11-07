import type { AppKind, PageApp } from "../../schema/tabs.schema.js";
import { navigates } from "../tabs/app-abilities.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import type { OpenedTab } from "../tabs/host-tabs.js";

export function newTabPageOf(apps: PlacedApps, app: AppKind, isBrowserAvailable: boolean): string | null {
	if (!navigates(apps, app) || !isBrowserAvailable) {
		return null;
	}

	return `page-${crypto.randomUUID()}`;
}

export function freshTabOf(apps: PlacedApps, app: PageApp, isBrowserAvailable: boolean): OpenedTab {
	return {
		app,
		pageId: newTabPageOf(apps, app, isBrowserAvailable),
	};
}
