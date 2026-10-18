import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { isRecord } from "./page-dom.ts";
import { check, pointOf, pressed } from "./studio-tabs-page.ts";

const HEADER_CLOSE_OF = `((id) => { const close = document.querySelector('[data-studio-kept=shown] [data-host-tab-close="' + id + '"], [data-host-tab-close="' + id + '"]'); return close === null ? null : Number(getComputedStyle(close).opacity); })`;
const HEADER_TABS = `[...document.querySelectorAll("[data-host-zone] [data-host-tab]")].filter((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible").map((one) => { const box = one.getBoundingClientRect(); return { id: one.dataset.hostTab, isShown: one.getAttribute("aria-selected") === "true", isInView: one.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)) }; })`;
const MIDDLE_CLICKED = `((id) => { const tab = document.querySelector('[data-host-zone] [data-host-tab="' + id + '"]'); tab.dispatchEvent(new MouseEvent("mousedown", { button: 1, bubbles: true, cancelable: true })); tab.dispatchEvent(new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true })); return true; })`;

export async function checksHeaderClose(page: AskedPage): Promise<void> {
	const tabs = await headerTabsOf(page);
	const shown = tabs.find((tab) => tab.isShown);
	if (!shown) throw new Error("the header shows no tab");
	await pressed(page, `[data-host-tab-close="${shown.id}"]`);
	const afterShown = await headerTabsOf(page);
	check(
		"the shown header tab's × closes it",
		afterShown.length === tabs.length - 1 && !afterShown.some((tab) => tab.id === shown.id),
		{ was: tabs.length, now: afterShown.length },
	);
	const resting = afterShown.find((tab) => !tab.isShown && tab.isInView);
	if (!resting) throw new Error("the header holds no resting tab");
	const restingClose = `[data-host-tab-close="${resting.id}"]`;
	const hiddenAt = await page.ask(`${HEADER_CLOSE_OF}(${JSON.stringify(resting.id)})`);
	const [x, y] = await pointOf(page, `[data-host-zone] [data-host-tab="${resting.id}"]`);
	await page.hover(x, y);
	await waited(250);
	const hoveredAt = await page.ask(`${HEADER_CLOSE_OF}(${JSON.stringify(resting.id)})`);
	await pressed(page, restingClose);
	const afterResting = await headerTabsOf(page);
	check(
		"a resting header tab hides its × until hovered, and that × closes that tab",
		hiddenAt === 0 && hoveredAt === 1 && !afterResting.some((tab) => tab.id === resting.id),
		{ hiddenAt, hoveredAt, now: afterResting.length },
	);
	const middle = afterResting.find((tab) => !tab.isShown);
	if (!middle) throw new Error("the header holds no tab to middle-click");
	await page.ask(`${MIDDLE_CLICKED}(${JSON.stringify(middle.id)})`);
	await waited(150);
	const afterMiddle = await headerTabsOf(page);
	check(
		"a middle-click closes a header tab",
		!afterMiddle.some((tab) => tab.id === middle.id) && afterMiddle.length === afterResting.length - 1,
		{ was: afterResting.length, now: afterMiddle.length },
	);
}

interface HeaderTab {
	readonly id: string;
	readonly isShown: boolean;
	readonly isInView: boolean;
}

async function headerTabsOf(page: AskedPage): Promise<readonly HeaderTab[]> {
	const asked = await page.ask(HEADER_TABS);
	return Array.isArray(asked)
		? asked.filter((one): one is HeaderTab => isRecord(one) && typeof one["id"] === "string")
		: [];
}
