import { SUMI_LINK_SCHEME } from "@widgetarium/core/engine/sumi-link.js";

export interface LinkPress {
	readonly href: string;
	readonly opensNew: boolean;
}

export type PageWindow = Window & typeof globalThis;

export const PRESSED_EVENTS = ["click", "auxclick"] as const;

const SUMI_ANCHOR = `a[href^="${SUMI_LINK_SCHEME}"]`;
const MAIN_BUTTON = 0;
const MIDDLE_BUTTON = 1;

export function linkPressOf(event: MouseEvent, view: PageWindow): LinkPress | null {
	const anchor = event.target instanceof view.Element ? event.target.closest(SUMI_ANCHOR) : null;

	if (anchor === null || !isOpeningButton(event)) {
		return null;
	}

	return {
		href: anchor.getAttribute("href") ?? "",
		opensNew: event.metaKey || event.ctrlKey || event.button === MIDDLE_BUTTON,
	};
}

function isOpeningButton(event: MouseEvent): boolean {
	return event.type === "click" ? event.button === MAIN_BUTTON : event.button === MIDDLE_BUTTON;
}
