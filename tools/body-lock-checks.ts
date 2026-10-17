import type { AskedPage } from "./chrome-ask.ts";

export interface BodyLockFindings {
	readonly scrollLocked: boolean;
	readonly focusGuards: number;
	readonly hiddenFromReaders: number;
	readonly pointerEvents: string;
	readonly wheelReachesOutside: boolean;
	readonly focusStaysOutside: boolean;
}

const FINDINGS = `(() => {
	let outside = document.getElementById("wg-outside-scroller");
	if (!outside) {
		outside = document.createElement("div");
		outside.id = "wg-outside-scroller";
		outside.style.cssText = "position:fixed;left:0;top:0;width:40px;height:40px;overflow:auto;opacity:0;pointer-events:none";
		const tall = document.createElement("div");
		tall.style.height = "1000px";
		outside.appendChild(tall);
		document.body.appendChild(outside);
	}
	let field = document.getElementById("wg-outside-field");
	if (!field) {
		field = document.createElement("input");
		field.id = "wg-outside-field";
		field.style.cssText = "position:fixed;left:0;top:0;opacity:0";
		document.body.appendChild(field);
	}
	field.focus();
	const wheel = new WheelEvent("wheel", { deltaY: 50, bubbles: true, cancelable: true });
	return {
		scrollLocked: document.body.hasAttribute("data-scroll-locked"),
		focusGuards: document.querySelectorAll("[data-radix-focus-guard]").length,
		hiddenFromReaders: document.querySelectorAll("[data-aria-hidden]").length,
		pointerEvents: document.body.style.pointerEvents,
		wheelReachesOutside: outside.dispatchEvent(wheel),
		focusStaysOutside: document.activeElement === field,
	};
})()`;

export async function bodyLockFindingsOf(page: AskedPage): Promise<BodyLockFindings> {
	const found = await page.ask(FINDINGS);
	return found as BodyLockFindings;
}

export function leavesWindowAlone(found: BodyLockFindings): boolean {
	return (
		!found.scrollLocked &&
		found.focusGuards === 0 &&
		found.hiddenFromReaders === 0 &&
		found.pointerEvents !== "none" &&
		found.wheelReachesOutside &&
		found.focusStaysOutside
	);
}
