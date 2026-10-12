import { useSyncExternalStore } from "react";

export type PageRenderer = "html" | "gpu";

const KEPT_UNDER = "widgetarium.design.page-renderer";
const listeners = new Set<() => void>();
const chosen: { renderer: PageRenderer } = { renderer: keptRenderer() };

export function usePageRenderer(): PageRenderer {
	return useSyncExternalStore(subscribe, () => chosen.renderer);
}

export function choosePageRenderer(renderer: PageRenderer): void {
	if (chosen.renderer === renderer) return;
	chosen.renderer = renderer;
	keepRenderer(renderer);
	for (const listener of listeners) listener();
}

export function isPageRenderer(held: unknown): held is PageRenderer {
	return held === "html" || held === "gpu";
}

function keptRenderer(): PageRenderer {
	try {
		const kept = globalThis.localStorage?.getItem(KEPT_UNDER);
		return isPageRenderer(kept) ? kept : "html";
	} catch {
		return "html";
	}
}

function keepRenderer(renderer: PageRenderer): void {
	try {
		globalThis.localStorage?.setItem(KEPT_UNDER, renderer);
	} catch (failure) {
		console.warn("[widgetarium] the page renderer was not remembered; it is chosen again next time", failure);
	}
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
