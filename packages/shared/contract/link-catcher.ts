import type { StartedApp } from "@widgetarium/data-framework";
import { OpenLinkCommand } from "./generated/places.js";

export interface LinkCatching {
	readonly sumi: StartedApp;
	readonly tabId: string;
}

export interface LinkPress {
	readonly href: string;
	readonly inNewTab: boolean;
}

const PRESSES = ["click", "auxclick"] as const;
const LINK = "a[href]";
const MAIN_BUTTON = 0;
const MIDDLE_BUTTON = 1;
const NEW_TAB_TARGET = "_blank";
const IN_PAGE = "#";
const CAPTURE = { capture: true } as const;

export function catchLinks({ sumi, tabId }: LinkCatching, view: Window = window): () => void {
	const pressed = (event: MouseEvent): void => {
		const press = linkPressOf(event);

		if (press === null) {
			return;
		}

		event.preventDefault();
		void sumi.send(OpenLinkCommand, { from: tabId, ...press }).then((followed) => {
			if (!followed.ok) {
				console.error(`[sumi] the link ${press.href} was refused: ${followed.reason}`);
			}
		});
	};
	PRESSES.forEach((type) => view.document.addEventListener(type, pressed, CAPTURE));
	return () => PRESSES.forEach((type) => view.document.removeEventListener(type, pressed, CAPTURE));
}

export function linkPressOf(event: MouseEvent): LinkPress | null {
	const anchor = anchorOf(event.target);
	const href = anchor?.getAttribute("href") ?? "";

	if (anchor === null || href === "" || href.startsWith(IN_PAGE) || anchor.hasAttribute("download")) {
		return null;
	}

	if (!isOpeningButton(event)) {
		return null;
	}

	return {
		href,
		inNewTab:
			anchor.getAttribute("target") === NEW_TAB_TARGET ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.button === MIDDLE_BUTTON,
	};
}

function anchorOf(target: EventTarget | null): Element | null {
	return target instanceof Element ? target.closest(LINK) : null;
}

function isOpeningButton(event: MouseEvent): boolean {
	return event.type === "click" ? event.button === MAIN_BUTTON : event.button === MIDDLE_BUTTON;
}
