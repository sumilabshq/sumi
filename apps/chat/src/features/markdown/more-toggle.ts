import { createGlyph } from "./glyph.js";

export interface MoreToggleAsk {
	readonly target: HTMLElement;
	readonly moreSaid: string;
}

export const OPENED_LIVE_ATTRIBUTE = "data-opened-live";

const CUT_CLASS = "is-cut";
const LESS_SAID = "Show less";
const SAID_CLASS = "wg-studio-ai-more-said";

export function createMoreToggle(page: Document, ask: MoreToggleAsk): HTMLButtonElement {
	ask.target.classList.add(CUT_CLASS);
	const button = page.createElement("button");
	button.type = "button";
	button.className = "wg-studio-ai-more";
	const said = button.appendChild(page.createElement("span"));
	said.className = SAID_CLASS;
	said.textContent = ask.moreSaid;
	button.append(createGlyph(page, "chevron-down"));
	button.addEventListener("click", () => toggleCut(ask, said));
	return button;
}

export function openCutsIn(root: Element): void {
	for (const target of root.querySelectorAll(`.${CUT_CLASS}`)) {
		target.classList.remove(CUT_CLASS);
		const said = target.querySelector(`:scope > .wg-studio-ai-more > .${SAID_CLASS}`);

		if (said) {
			said.textContent = LESS_SAID;
		}
	}
}

function toggleCut({ target, moreSaid }: MoreToggleAsk, said: HTMLElement): void {
	const isCut = target.classList.toggle(CUT_CLASS);
	said.textContent = isCut ? moreSaid : LESS_SAID;

	if (isCut) {
		target.scrollIntoView({ block: "nearest" });
	}
}
