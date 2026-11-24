import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check } from "./check-helpers.ts";

export interface TabLook {
	readonly width: number;
	readonly height: number;
	readonly left: number;
	readonly top: number;
	readonly padLeft: string;
	readonly padRight: string;
	readonly radius: string;
	readonly weight: string;
	readonly border: string;
	readonly mode: string;
	readonly isActive: boolean;
	readonly isFaceDrawn: boolean;
	readonly faceWidth: number;
	readonly isArtInsideFace: boolean;
}

interface HoverLook {
	readonly titleBefore: number;
	readonly titleAfter: number;
	readonly titleRight: number;
	readonly closeLeft: number;
	readonly closeRight: number;
	readonly isCloseShown: boolean;
	readonly tabRight: number;
	readonly padRight: number;
}

const TABS = ".sumi-flow-strip .sumi-pane-tab";
const TAB_PX = 176;
const TAB_MIN_PX = 120;
const TAB_HEIGHT_PX = 28;
const TAB_PAD = "9px";
const TAB_RADIUS = "7px";
const TAB_WEIGHT = "400";
const FACE_PX = 12;
const TOLERANCE_PX = 0.5;
const HOVER_MS = 250;
const SETTLE_MS = 900;

const tabsLooked = `[...document.querySelectorAll(${JSON.stringify(TABS)})].map((tab) => {
	const box = tab.getBoundingClientRect();
	const look = getComputedStyle(tab);
	const face = tab.querySelector(".sumi-pane-tab-face");
	const drawn = face !== null && [...face.querySelectorAll("*")].some((part) => {
		const at = part.getBoundingClientRect();
		return at.width > 0 && at.height > 0 && getComputedStyle(part).visibility === "visible";
	});
	const faceBox = face === null ? null : face.getBoundingClientRect();
	const isInside = faceBox !== null && [...face.querySelectorAll("*")].every((part) => {
		const at = part.getBoundingClientRect();
		return at.left >= faceBox.left - 0.5 && at.right <= faceBox.right + 0.5 && at.top >= faceBox.top - 0.5 && at.bottom <= faceBox.bottom + 0.5;
	});
	return {
		isArtInsideFace: isInside,
		width: box.width, height: box.height, left: box.left, top: box.top,
		padLeft: look.paddingLeft, padRight: look.paddingRight, radius: look.borderRadius,
		weight: look.fontWeight, border: look.borderTopWidth, mode: tab.dataset.mode,
		isActive: tab.hasAttribute("data-active"), isFaceDrawn: drawn,
		faceWidth: face === null ? 0 : face.getBoundingClientRect().width,
	};
})`;

const titleWidthOf = (at: number): string =>
	`document.querySelectorAll(${JSON.stringify(TABS)})[${at}].querySelector(".sumi-pane-tab-title").getBoundingClientRect().width`;

const hoveredLookOf = (at: number): string => `(() => {
	const tab = document.querySelectorAll(${JSON.stringify(TABS)})[${at}];
	const title = tab.querySelector(".sumi-pane-tab-title").getBoundingClientRect();
	const close = tab.querySelector(".sumi-pane-tab-close");
	const closeBox = close.getBoundingClientRect();
	return {
		titleAfter: title.width, titleRight: title.right, closeLeft: closeBox.left, closeRight: closeBox.right,
		isCloseShown: getComputedStyle(close).visibility === "visible",
		tabRight: tab.getBoundingClientRect().right, padRight: parseFloat(getComputedStyle(tab).paddingRight),
	};
})()`;

export async function tabsOf(page: AskedPage): Promise<readonly TabLook[]> {
	return (await page.ask(tabsLooked)) as TabLook[];
}

function isNear(got: number, want: number): boolean {
	return Math.abs(got - want) <= TOLERANCE_PX;
}

function shapeChecks(tabs: readonly TabLook[], name: string): void {
	const labelled = tabs.filter(({ mode }) => mode === "label");
	check(
		`${name}: every labelled tab pads ${TAB_PAD} on both sides`,
		labelled.map(({ padLeft, padRight }) => [padLeft, padRight]),
		labelled.map(() => [TAB_PAD, TAB_PAD]),
	);
	check(
		`${name}: every tab is ${TAB_HEIGHT_PX}px tall`,
		tabs.every(({ height }) => isNear(height, TAB_HEIGHT_PX)),
		true,
	);
	check(
		`${name}: every labelled tab rounds ${TAB_RADIUS}`,
		labelled.every(({ radius }) => radius === TAB_RADIUS),
		true,
	);
	check(
		`${name}: every tab label is ${TAB_WEIGHT}`,
		tabs.every(({ weight }) => weight === TAB_WEIGHT),
		true,
	);
	check(
		`${name}: every tab draws its app icon`,
		tabs.map(({ isFaceDrawn }) => isFaceDrawn),
		tabs.map(() => true),
	);
	check(
		`${name}: every tab icon is ${FACE_PX}px`,
		tabs.every(({ faceWidth }) => isNear(faceWidth, FACE_PX)),
		true,
	);
	check(
		`${name}: every tab icon's art sits inside its box`,
		tabs.every(({ isArtInsideFace }) => isArtInsideFace),
		true,
	);
	check(
		`${name}: the active tab has no border`,
		tabs.filter(({ isActive }) => isActive).map(({ border }) => border),
		["0px"],
	);
}

export function roomyTabChecks(tabs: readonly TabLook[], name: string, count: number): void {
	check(`${name}: the row holds ${count} tab(s)`, tabs.length, count);
	check(
		`${name}: tabs are ${TAB_PX}px wide by default`,
		tabs.map(({ width }) => Math.round(width)),
		tabs.map(() => TAB_PX),
	);
	shapeChecks(tabs, name);
}

export type Crowding = "shrunk" | "narrow";

export function crowdedTabChecks(tabs: readonly TabLook[], name: string, crowding: Crowding): void {
	const widths = tabs.filter(({ mode }) => mode === "label").map(({ width }) => width);
	const isNarrow = tabs.some(({ mode }) => mode === "icon");
	const least = Math.min(...widths);
	check(`${name}: at least one tab keeps its label`, widths.length > 0, true);
	check(
		`${name}: the row is ${crowding}`,
		isNarrow ? "narrow" : widths.every((width) => width < TAB_PX - TOLERANCE_PX) && "shrunk",
		crowding,
	);
	check(
		`${name}: labelled tabs share the room evenly`,
		isNarrow || widths.every((width) => isNear(width, least)),
		true,
	);
	check(
		`${name}: labelled tabs stay ${TAB_MIN_PX}–${TAB_PX}px`,
		widths.every((width) => width >= TAB_MIN_PX - TOLERANCE_PX && width <= TAB_PX + TOLERANCE_PX),
		true,
	);
	shapeChecks(tabs, name);
}

export async function hoverChecks(page: AskedPage, name: string): Promise<void> {
	const tabs = await tabsOf(page);
	const at = tabs.findIndex(({ mode }) => mode === "label");
	const tab = tabs[at];

	if (tab === undefined) {
		check(`${name}: a labelled tab to hover`, false, true);
		return;
	}

	const titleBefore = (await page.ask(titleWidthOf(at))) as number;
	await page.hover(tab.left + tab.width / 2, tab.top + tab.height / 2);
	await waited(HOVER_MS);
	const hovered = { ...((await page.ask(hoveredLookOf(at))) as Omit<HoverLook, "titleBefore">), titleBefore };
	check(`${name}: hover shows the close button`, hovered.isCloseShown, true);
	check(
		`${name}: hover keeps the label width (${hovered.titleBefore} → ${hovered.titleAfter})`,
		isNear(hovered.titleAfter, hovered.titleBefore),
		true,
	);
	check(`${name}: the close button sits after the label`, hovered.closeLeft >= hovered.titleRight - TOLERANCE_PX, true);
	check(
		`${name}: the close button sits inside the right padding line`,
		hovered.closeRight <= hovered.tabRight - hovered.padRight + TOLERANCE_PX,
		true,
	);
	await page.hover(1, 600);
	await waited(HOVER_MS);
}

export async function openedFlowRow(page: AskedPage, name: string): Promise<void> {
	await page.ask(
		`[...document.querySelectorAll(".sumi-flows-row-main")].find((row) => row.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(name)}).click()`,
	);
	await waited(SETTLE_MS);
}

export async function framedAt(page: AskedPage, widthPx: number): Promise<void> {
	await page.ask(`document.getElementById("frame").style.width = "${widthPx}px"`);
	await waited(SETTLE_MS);
}
