import { writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check } from "./check-helpers.ts";
import { NATIVE_LEFT_SIDE, NATIVE_RIGHT_SIDE } from "./flows-frame-probe.ts";
import type { FrameLook, FrameWant, Rgb } from "./flows-frame-probe.ts";
import type { FrameSplit } from "./flows-frame-scenes.ts";

export type FrameTheme = "light" | "dark";

export interface FrameState {
	readonly theme: FrameTheme;
	readonly isDocked: boolean;
	readonly split: FrameSplit;
}

interface ThemeTarget extends FrameWant {
	readonly panel: string;
}

type Point = readonly [number, number];

const BOARD_TARGETS: Readonly<Record<FrameTheme, ThemeTarget>> = {
	light: { chrome: "#f7f7f7", panel: "#ffffff", shadow: "0 0 0 .5px rgba(0,0,0,.05), 0 1px 1.5px rgba(0,0,0,.1)" },
	dark: {
		chrome: "#111214",
		panel: "#000000",
		shadow: "0 0 0 .5px rgba(255,255,255,.08), 0 1px 1.5px rgba(0,0,0,.7)",
	},
};
const PANEL_INSET_PX = 8;
const PANEL_RADIUS = "10px";
const SQUARE = "0px";
const LOWER_ROW_PX = 32;
const TRANSPARENT = "rgba(0, 0, 0, 0)";
const NATIVE_FILL = "rgb(255, 0, 0)";
const COLOUR_TOLERANCE = 6;
const PROBE_INSET_PX = 20;
const FILL_EASING_MS = 400;
const BOTH_SIDES = NATIVE_LEFT_SIDE | NATIVE_RIGHT_SIDE;
const PLATE_RADII: Readonly<Record<FrameSplit, readonly string[]>> = {
	single: [PANEL_RADIUS],
	split: [`${PANEL_RADIUS} ${SQUARE} ${SQUARE} ${PANEL_RADIUS}`, `${SQUARE} ${PANEL_RADIUS} ${PANEL_RADIUS} ${SQUARE}`],
	stacked: [
		`${SQUARE} ${SQUARE} ${PANEL_RADIUS} ${PANEL_RADIUS}`,
		`${PANEL_RADIUS} ${PANEL_RADIUS} ${SQUARE} ${SQUARE}`,
	],
};
const NATIVE_SIDES: Readonly<Record<FrameSplit, readonly number[]>> = {
	single: [BOTH_SIDES],
	split: [NATIVE_LEFT_SIDE, NATIVE_RIGHT_SIDE],
	stacked: [0, BOTH_SIDES],
};

export function nameOf({ theme, isDocked, split }: FrameState): string {
	return `${theme}-${isDocked ? "docked" : "hidden"}-${split}`;
}

function lookAsked(target: FrameWant): string {
	return `window.__frame.measured(${JSON.stringify({ chrome: target.chrome, shadow: target.shadow })})`;
}

function rgbOf(colour: string): Rgb {
	const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
	const channels =
		hex === null ? (colour.match(/\d+(\.\d+)?/g) ?? []) : hex.slice(1).map((pair) => Number.parseInt(pair, 16));
	const [red = 0, green = 0, blue = 0] = channels.map(Number);
	return [red, green, blue];
}

function checkColour(what: string, got: Rgb | undefined, want: Rgb): void {
	const isNear =
		got !== undefined && got.every((channel, at) => Math.abs(channel - (want[at] ?? 0)) <= COLOUR_TOLERANCE);
	check(what, isNear ? want : got, want);
}

function outerCornerOf(panel: FrameLook["panel"]): Point {
	return [panel.right - 1, panel.bottom - 1];
}

async function pixelsAt(page: AskedPage, points: readonly Point[]): Promise<readonly Rgb[]> {
	await page.ask("window.__frame.quietOverlays()");
	const png = (await page.shoot()).toString("base64");
	await page.ask("window.__frame.restoreOverlays()");
	return (await page.ask(`window.__frame.pixelsOf(${JSON.stringify(png)}, ${JSON.stringify(points)})`)) as Rgb[];
}

function windowChecks(look: FrameLook, name: string): void {
	check(`${name}: the window is the board chrome`, look.chrome, look.wantChrome);
	check(`${name}: the title row has no fill of its own`, [TRANSPARENT, look.chrome].includes(look.titleFill), true);

	if (look.sidebarFill !== null) {
		check(`${name}: the sidebar has no fill of its own`, look.sidebarFill, TRANSPARENT);
	}
}

function panelChecks(look: FrameLook, state: FrameState, name: string): void {
	const { panel } = look;
	const leftInset = state.isDocked ? panel.left - (look.sidebarRight ?? 0) : panel.left;
	check(`${name}: the panel radius`, panel.radius, PANEL_RADIUS);
	check(`${name}: the panel fill`, rgbOf(panel.fill), rgbOf(BOARD_TARGETS[state.theme].panel));
	check(`${name}: the panel shadow is the locked page shadow`, panel.shadow, look.wantShadow);
	check(`${name}: the panel right inset`, look.window.width - panel.right, PANEL_INSET_PX);
	check(`${name}: the panel bottom inset`, look.window.height - panel.bottom, PANEL_INSET_PX);
	check(`${name}: the panel left inset`, leftInset, state.isDocked ? 0 : PANEL_INSET_PX);
	check(`${name}: the panel starts under the title row`, panel.top, look.titleBottom);
	check(`${name}: the active tab wears the page shadow`, look.tab?.shadow, look.wantShadow);
	check(`${name}: the active tab is the panel fill`, look.tab?.fill, panel.fill);
}

function plateChecks(look: FrameLook, split: FrameSplit, name: string): void {
	const shadowed = look.plates.map(({ shadow }) => shadow).filter((shadow) => shadow !== "none");
	check(`${name}: plates draw no shadow of their own`, shadowed, []);
	check(
		`${name}: plates round only the panel corners`,
		look.plates.map(({ radius }) => radius).sort(),
		[...PLATE_RADII[split]].sort(),
	);
	check(
		`${name}: a native page rounds only the panel corners`,
		look.plates.map(({ nativeSides }) => nativeSides).sort(),
		[...NATIVE_SIDES[split]].sort(),
	);
}

function sideBySideChecks(look: FrameLook, name: string): void {
	const [first, second] = look.plates;
	check(`${name}: side by side panes share the panel with no gap`, first?.right, second?.left);
	check(
		`${name}: one divider sits on the pane boundary`,
		look.edges.map(({ centre }) => centre),
		[first?.right],
	);
	check(
		`${name}: the divider is the divider line`,
		look.edges.map(({ image }) => image),
		[`linear-gradient(${look.divider}, ${look.divider})`],
	);
}

function stackedChecks(look: FrameLook, name: string): void {
	const { panel } = look;
	check(`${name}: the lower tab row spans the panel on the chrome`, look.rows, [
		{ left: panel.left, width: panel.right - panel.left, height: LOWER_ROW_PX, fill: look.chrome },
	]);
}

async function pixelChecks(page: AskedPage, look: FrameLook, name: string): Promise<void> {
	const { panel } = look;
	const chrome = rgbOf(look.chrome);
	const [beside, corner, inside] = await pixelsAt(page, [
		[panel.right + PANEL_INSET_PX / 2, panel.top + PROBE_INSET_PX],
		outerCornerOf(panel),
		[panel.right - PROBE_INSET_PX, panel.top + 2],
	]);
	checkColour(`${name}: pixels right of the panel are the chrome`, beside, chrome);
	checkColour(`${name}: the panel's outer corner shows the chrome`, corner, chrome);
	checkColour(`${name}: pixels inside the panel are the panel`, inside, rgbOf(panel.fill));
}

async function nativePageChecks(page: AskedPage, look: FrameLook, name: string): Promise<void> {
	const { panel } = look;
	const chrome = rgbOf(look.chrome);
	await page.ask(`window.__frame.underlaidNativePage(${JSON.stringify(NATIVE_FILL)})`);
	await waited(FILL_EASING_MS);
	const [corner, hole, ring, topCorner] = await pixelsAt(page, [
		outerCornerOf(panel),
		[(panel.left + panel.right) / 2, panel.bottom - PROBE_INSET_PX],
		[panel.left + PROBE_INSET_PX, panel.top + PROBE_INSET_PX],
		[panel.left + 1, panel.top + 1],
	]);
	checkColour(`${name}: a native page shows through its hole`, hole, rgbOf(NATIVE_FILL));
	checkColour(`${name}: a native page keeps off the panel's bottom corner`, corner, chrome);
	checkColour(`${name}: the studio paints the panel around a native page`, ring, rgbOf(panel.fill));
	checkColour(`${name}: the panel's top corner stays the chrome over a native page`, topCorner, chrome);
}

async function shotInto(page: AskedPage, shotsDir: string | null, name: string): Promise<void> {
	if (shotsDir !== null) {
		writeFileSync(path.join(shotsDir, `${name}.png`), await page.shoot());
	}
}

async function layoutChecks(page: AskedPage, look: FrameLook, split: FrameSplit, name: string): Promise<void> {
	if (split === "split") {
		sideBySideChecks(look, name);
		return;
	}

	if (split === "stacked") {
		stackedChecks(look, name);
		return;
	}

	await nativePageChecks(page, look, name);
}

export async function frameLookChecks(page: AskedPage, state: FrameState, shotsDir: string | null): Promise<FrameLook> {
	const name = nameOf(state);
	const look = (await page.ask(lookAsked(BOARD_TARGETS[state.theme]))) as FrameLook;
	windowChecks(look, name);
	panelChecks(look, state, name);
	plateChecks(look, state.split, name);
	await pixelChecks(page, look, name);
	await shotInto(page, shotsDir, name);
	await layoutChecks(page, look, state.split, name);

	if (state.split === "single") {
		await shotInto(page, shotsDir, `${name}-native-page`);
	}

	return look;
}
