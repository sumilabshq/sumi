import { PAGE_RENDERERS } from "../../schema/canvas-view.schema.js";
import type { PageRenderer } from "../../schema/canvas-view.schema.js";

const KEPT_UNDER = "widgetarium.design.page-renderer";

export function keptRenderer(): PageRenderer {
	try {
		const kept = globalThis.localStorage?.getItem(KEPT_UNDER);
		return PAGE_RENDERERS.find((renderer) => renderer === kept) ?? "html";
	} catch {
		return "html";
	}
}

export function keepRenderer(renderer: PageRenderer): void {
	try {
		globalThis.localStorage?.setItem(KEPT_UNDER, renderer);
	} catch (failure) {
		console.warn("[widgetarium] the page renderer was not remembered; it is chosen again next time", failure);
	}
}
