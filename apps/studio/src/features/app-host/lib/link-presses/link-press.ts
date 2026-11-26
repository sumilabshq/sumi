import { SUMI_LINK_SCHEME } from "@widgetarium/core/engine/sumi-link.js";

export interface LinkPress {
	readonly href: string;
	readonly opensNew: boolean;
	readonly home: string | null;
}

export type PageWindow = Window & typeof globalThis;

export const PRESSED_EVENTS = ["click", "auxclick"] as const;

const SUMI_ANCHOR = `a[href^="${SUMI_LINK_SCHEME}"]`;
const HOMED_WEB_ANCHOR = '[data-link-home] a[href^="http"]';
const LINK_HOME = "[data-link-home]";
const NEW_TAB_TARGET = "_blank";
const MAIN_BUTTON = 0;
const MIDDLE_BUTTON = 1;

export function linkPressOf(event: MouseEvent, view: PageWindow): LinkPress | null {
	const anchor =
		event.target instanceof view.Element ? event.target.closest(`${SUMI_ANCHOR}, ${HOMED_WEB_ANCHOR}`) : null;

	if (anchor === null || !isOpeningButton(event)) {
		return null;
	}

	return {
		href: anchor.getAttribute("href") ?? "",
		opensNew:
			event.metaKey ||
			event.ctrlKey ||
			event.button === MIDDLE_BUTTON ||
			anchor.getAttribute("data-link-target") === NEW_TAB_TARGET,
		home: anchor.closest(LINK_HOME)?.getAttribute("data-link-home") || null,
	};
}

function isOpeningButton(event: MouseEvent): boolean {
	return event.type === "click" ? event.button === MAIN_BUTTON : event.button === MIDDLE_BUTTON;
}
