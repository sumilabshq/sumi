import { tooltipMarks } from "@widgetarium/kit";
import { createGlyph } from "./glyph.js";

export const CODE_WRAP_TOGGLE_ATTRIBUTE = "data-code-wrap-toggle";

type CodeWrap = "on" | "off";

const WRAP_KEY = "sumi.chat.code-wrap";
const WRAP_ATTRIBUTE = "data-code-wrap";
const WRAPPED: CodeWrap = "on";
const UNWRAPPED: CodeWrap = "off";
const WRAP_SAID = "Wrap lines";
const UNWRAP_SAID = "Stop wrapping lines";

export function applySavedCodeWrap(page: Document): void {
	if (page.documentElement.hasAttribute(WRAP_ATTRIBUTE)) {
		return;
	}

	page.documentElement.setAttribute(WRAP_ATTRIBUTE, readSavedWrap(page));
}

export function toggleCodeWrap(page: Document): void {
	const next = isCodeWrapped(page) ? UNWRAPPED : WRAPPED;
	page.documentElement.setAttribute(WRAP_ATTRIBUTE, next);
	saveWrap(page, next);

	for (const toggle of page.querySelectorAll(`[${CODE_WRAP_TOGGLE_ATTRIBUTE}]`)) {
		syncCodeWrapToggle(page, toggle);
	}
}

export function syncCodeWrapToggle(page: Document, toggle: Element): void {
	const isWrapped = isCodeWrapped(page);
	const said = isWrapped ? UNWRAP_SAID : WRAP_SAID;
	toggle.setAttribute("aria-pressed", String(isWrapped));
	toggle.setAttribute("aria-label", said);
	toggle.setAttribute("data-tip-said", tooltipMarks({ said })["data-tip-said"]);
	toggle.replaceChildren(createGlyph(page, isWrapped ? "text-wrap" : "move-horizontal"));
}

function isCodeWrapped(page: Document): boolean {
	return page.documentElement.getAttribute(WRAP_ATTRIBUTE) !== UNWRAPPED;
}

// TRADE-OFF: browser storage, not a settings module: a view-only choice kept per device
function readSavedWrap(page: Document): CodeWrap {
	try {
		return page.defaultView?.localStorage.getItem(WRAP_KEY) === UNWRAPPED ? UNWRAPPED : WRAPPED;
	} catch (error) {
		console.warn("[sumi-chat] the code wrap choice was not read, lines wrap", error);
		return WRAPPED;
	}
}

function saveWrap(page: Document, wrap: CodeWrap): void {
	try {
		page.defaultView?.localStorage.setItem(WRAP_KEY, wrap);
	} catch (error) {
		console.warn(`[sumi-chat] the code wrap choice ${wrap} was not saved`, error);
	}
}
