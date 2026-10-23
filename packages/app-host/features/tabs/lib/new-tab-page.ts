import type { AppKind } from "../../../shared/schema/app-tab.schema.js";

export function newTabPageOf(app: AppKind, isBrowserAvailable: boolean): string | null {
	if (app !== "browser" || !isBrowserAvailable) {
		return null;
	}

	return `page-${crypto.randomUUID()}`;
}
