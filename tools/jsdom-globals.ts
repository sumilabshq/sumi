import { JSDOM } from "jsdom";

export function layJsdomGlobals(): JSDOM {
	const dom = new JSDOM("<!doctype html><body></body>");
	const { window } = dom;
	Object.assign(globalThis, {
		window,
		document: window.document,
		Node: window.Node,
		Element: window.Element,
		HTMLElement: window.HTMLElement,
		SVGElement: window.SVGElement,
		getComputedStyle: window.getComputedStyle,
		matchMedia: unmatchedMedia,
	});
	return dom;
}

function unmatchedMedia(
	media: string,
): Pick<MediaQueryList, "media" | "matches" | "addEventListener" | "removeEventListener"> {
	return {
		media,
		matches: false,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	};
}
