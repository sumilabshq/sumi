import { JSDOM } from "jsdom";
import { createElement as h } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

export const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });

export function layBehaviorGlobals(): void {
	const { window } = dom;
	Object.assign(globalThis, {
		window,
		document: window.document,
		Node: window.Node,
		Element: window.Element,
		HTMLElement: window.HTMLElement,
		HTMLImageElement: window.HTMLImageElement,
		SVGElement: window.SVGElement,
		Event: window.Event,
		KeyboardEvent: window.KeyboardEvent,
		MouseEvent: window.MouseEvent,
		WheelEvent: window.WheelEvent,
		File: window.File,
		MutationObserver: window.MutationObserver,
		getComputedStyle: window.getComputedStyle,
		requestAnimationFrame: window.requestAnimationFrame.bind(window),
		cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
		CSS: { escape: (text: string) => text },
		ResizeObserver: class {
			observe(): void {}
			disconnect(): void {}
		},
		IS_REACT_ACT_ENVIRONMENT: false,
	});
}

export function drawn(tree: ReactNode): HTMLElement {
	const host = document.createElement("div");
	document.body.append(host);
	createRoot(host).render(h("div", null, tree));
	return host;
}

export function boxed(element: Element, box: { x: number; y: number; width: number; height: number }): void {
	const rect = { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, ...box };
	Object.defineProperty(element, "getBoundingClientRect", {
		value: () => ({ ...rect, toJSON: () => rect }),
		configurable: true,
	});
	Object.defineProperty(element, "offsetWidth", { value: box.width, configurable: true });
	Object.defineProperty(element, "offsetHeight", { value: box.height, configurable: true });
}

export function pause(ms: number): Promise<void> {
	return new Promise((done) => setTimeout(done, ms));
}

export function redrawable(tree: ReactNode): (next: ReactNode) => void {
	const host = document.createElement("div");
	document.body.append(host);
	const root = createRoot(host);
	root.render(h("div", null, tree));
	return (next) => root.render(h("div", null, next));
}
