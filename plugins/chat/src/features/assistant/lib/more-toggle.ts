import { SCROLL_KEEP_ATTRIBUTE } from "@widgetarium/kit";
import { createGlyph } from "./glyph.js";

export interface MoreToggleAsk {
	readonly target: HTMLElement;
	readonly moreSaid: string;
}

export const OPENED_LIVE_ATTRIBUTE = "data-opened-live";

const CUT_CLASS = "is-cut";
const LESS_SAID = "Show less";
const SAID_CLASS = "wg-studio-ai-more-said";
const TOGGLE_CLASS = "wg-studio-ai-more";

export function createMoreToggle(page: Document, ask: MoreToggleAsk): HTMLButtonElement {
	ask.target.classList.add(CUT_CLASS);
	ask.target.setAttribute(SCROLL_KEEP_ATTRIBUTE, "");
	const button = page.createElement("button");
	button.type = "button";
	button.className = TOGGLE_CLASS;
	const said = button.appendChild(page.createElement("span"));
	said.className = SAID_CLASS;
	said.textContent = ask.moreSaid;
	button.append(createGlyph(page, "chevron-down"));
	button.addEventListener("click", () => toggleCut(ask, button));
	return button;
}

export function openCutsIn(root: Element): void {
	for (const target of root.querySelectorAll(`.${CUT_CLASS}`)) {
		target.classList.remove(CUT_CLASS);
		const toggle = target.querySelector(`:scope > .${TOGGLE_CLASS}`);

		if (toggle) {
			markCut(toggle, false, LESS_SAID);
		}
	}
}

function toggleCut({ target, moreSaid }: MoreToggleAsk, button: HTMLButtonElement): void {
	const isCut = target.classList.toggle(CUT_CLASS);
	markCut(button, isCut, isCut ? moreSaid : LESS_SAID);
}

function markCut(toggle: Element, isCut: boolean, said: string): void {
	const label = toggle.querySelector(`:scope > .${SAID_CLASS}`);

	if (label) {
		label.textContent = said;
	}

	toggle.toggleAttribute(SCROLL_KEEP_ATTRIBUTE, !isCut);
}
