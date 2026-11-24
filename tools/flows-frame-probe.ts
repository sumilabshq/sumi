import { placementOf } from "../packages/domain/browser/gateways/browser-pages/tauri/page-placement.ts";

export interface FrameWant {
	readonly chrome: string;
	readonly shadow: string;
}

export interface PlateLook {
	readonly left: number;
	readonly right: number;
	readonly radius: string;
	readonly shadow: string;
	readonly nativeSides: number;
}

export interface FrameLook {
	readonly window: { readonly width: number; readonly height: number };
	readonly chrome: string;
	readonly wantChrome: string;
	readonly wantShadow: string;
	readonly divider: string;
	readonly titleFill: string;
	readonly titleBottom: number;
	readonly sidebarFill: string | null;
	readonly sidebarRight: number | null;
	readonly panel: {
		readonly left: number;
		readonly top: number;
		readonly right: number;
		readonly bottom: number;
		readonly radius: string;
		readonly fill: string;
		readonly shadow: string;
	};
	readonly tab: { readonly fill: string; readonly shadow: string } | null;
	readonly plates: readonly PlateLook[];
	readonly edges: readonly { readonly centre: number; readonly image: string }[];
	readonly rows: readonly {
		readonly left: number;
		readonly width: number;
		readonly height: number;
		readonly fill: string;
	}[];
}

export type Rgb = readonly [number, number, number];

export const NATIVE_LEFT_SIDE = 1;
export const NATIVE_RIGHT_SIDE = 2;

const SHELL = ".wg-shell";
const TITLE_ROW = ".sumi-title-bar";
const SIDEBAR = ".wg-root.sumi-flows-column";
const PANEL = ".wg-shell-app-zone";
const PLATES = ".sumi-flow-page[data-active] > .wg-shell-plate";
const ACTIVE_TAB = ".sumi-flow-strip .sumi-pane-tab[data-active]";
const NATIVE_PAGE_TOP_PX = 40;
const QUIET_OVERLAYS_ID = "frame-probe-quiet-overlays";
const QUIET_OVERLAYS = "body:has(.wg-studio)::before, body:has(.wg-studio)::after { display: none; }";

function lookOf(selector: string): CSSStyleDeclaration | null {
	const found = document.querySelector(selector);
	return found === null ? null : getComputedStyle(found);
}

function boxOf(selector: string): DOMRect | null {
	return document.querySelector(selector)?.getBoundingClientRect() ?? null;
}

function needed<T>(found: T | null, what: string): T {
	if (found === null) {
		throw new Error(`frame probe: no ${what}`);
	}

	return found;
}

function resolved(property: "backgroundColor" | "boxShadow", value: string): string {
	const probe = document.createElement("div");
	probe.style[property] = value;
	document.body.append(probe);
	const computed = getComputedStyle(probe)[property];
	probe.remove();
	return computed;
}

function plateLookOf(plate: HTMLElement): PlateLook {
	const box = plate.getBoundingClientRect();
	const look = getComputedStyle(plate);
	return {
		left: box.left,
		right: box.right,
		radius: look.borderRadius,
		shadow: look.boxShadow,
		nativeSides: placementOf(plate.querySelector<HTMLElement>(".wg-shell-plate-body") ?? plate).cornerSides,
	};
}

function panelOf(): FrameLook["panel"] {
	const box = needed(boxOf(PANEL), "page panel");
	const look = needed(lookOf(PANEL), "page panel");
	return {
		left: box.left,
		top: box.top,
		right: box.right,
		bottom: box.bottom,
		radius: look.borderRadius,
		fill: look.backgroundColor,
		shadow: look.boxShadow,
	};
}

function tabOf(): FrameLook["tab"] {
	const look = lookOf(ACTIVE_TAB);
	return look === null ? null : { fill: look.backgroundColor, shadow: look.boxShadow };
}

function edgesOf(): FrameLook["edges"] {
	return [...document.querySelectorAll<HTMLElement>(".sumi-flow-edge[data-dir='row']")].map((edge) => {
		const box = edge.getBoundingClientRect();
		return { centre: box.left + box.width / 2, image: getComputedStyle(edge).backgroundImage };
	});
}

function rowsOf(): FrameLook["rows"] {
	return [...document.querySelectorAll<HTMLElement>(".sumi-flow-row")].map((row) => {
		const box = row.getBoundingClientRect();
		return { left: box.left, width: box.width, height: box.height, fill: getComputedStyle(row).backgroundColor };
	});
}

export function measured(want: FrameWant): FrameLook {
	return {
		window: { width: innerWidth, height: innerHeight },
		chrome: needed(lookOf(SHELL), "shell").backgroundColor,
		wantChrome: resolved("backgroundColor", want.chrome),
		wantShadow: resolved("boxShadow", want.shadow),
		divider: resolved("backgroundColor", "var(--divider)"),
		titleFill: needed(lookOf(TITLE_ROW), "title row").backgroundColor,
		titleBottom: needed(boxOf(TITLE_ROW), "title row").bottom,
		sidebarFill: lookOf(SIDEBAR)?.backgroundColor ?? null,
		sidebarRight: boxOf(SIDEBAR)?.right ?? null,
		panel: panelOf(),
		tab: tabOf(),
		plates: [...document.querySelectorAll<HTMLElement>(PLATES)].map(plateLookOf),
		edges: edgesOf(),
		rows: rowsOf(),
	};
}

function pageAreaIn(body: HTMLElement): HTMLElement {
	const area = document.createElement("div");
	area.setAttribute("data-browser-page-area", "");
	Object.assign(area.style, { position: "absolute", inset: `${NATIVE_PAGE_TOP_PX}px 0 0 0` });
	const pages = document.createElement("div");
	pages.setAttribute("data-browser-pages", "");
	pages.setAttribute("data-browser-pages-live", "");
	Object.assign(pages.style, { position: "absolute", inset: "0" });
	area.append(pages);
	body.append(area);
	return pages;
}

function windowFillLayer(): HTMLElement {
	const layer = document.createElement("div");
	Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "-2", background: "var(--frame)" });
	return layer;
}

function nativeLayerAt(placement: ReturnType<typeof placementOf>, fill: string): HTMLElement {
	const layer = document.createElement("div");
	const roundedOn = (side: number): string => ((placement.cornerSides & side) === 0 ? "0px" : `${placement.corner}px`);
	Object.assign(layer.style, {
		position: "fixed",
		left: `${placement.x}px`,
		top: `${placement.y}px`,
		width: `${placement.width}px`,
		height: `${placement.height}px`,
		zIndex: "-1",
		background: fill,
		borderBottomLeftRadius: roundedOn(NATIVE_LEFT_SIDE),
		borderBottomRightRadius: roundedOn(NATIVE_RIGHT_SIDE),
	});
	return layer;
}

export function underlaidNativePage(nativeFill: string): void {
	const pages = pageAreaIn(needed(document.querySelector<HTMLElement>(`${PLATES} .wg-shell-plate-body`), "plate body"));
	needed(document.querySelector(SHELL), "shell").append(windowFillLayer());
	document.body.append(nativeLayerAt(placementOf(pages), nativeFill));
}

export function quietOverlays(): void {
	const sheet = document.createElement("style");
	sheet.id = QUIET_OVERLAYS_ID;
	sheet.textContent = QUIET_OVERLAYS;
	document.head.append(sheet);
}

export function restoreOverlays(): void {
	document.getElementById(QUIET_OVERLAYS_ID)?.remove();
}

export async function pixelsOf(png: string, points: readonly (readonly [number, number])[]): Promise<readonly Rgb[]> {
	const image = new Image();
	image.src = `data:image/png;base64,${png}`;
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	const paint = needed(canvas.getContext("2d"), "2d canvas");
	paint.drawImage(image, 0, 0);
	const scale = image.width / innerWidth;
	return points.map(([x, y]) => {
		const [red = 0, green = 0, blue = 0] = paint.getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1).data;
		return [red, green, blue] as const;
	});
}
