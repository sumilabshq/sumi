import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PageSize } from "./chrome-ask.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

const REPO = path.resolve(import.meta.dirname, "..");
const TauriConfigSchema = z.object({
	app: z.object({
		windows: z.array(z.object({ trafficLightPosition: z.object({ x: z.number(), y: z.number() }).optional() })),
	}),
});
const SIDEBAR_SHEET = "plugins/tabs/flows-sidebar/src/features/flows-column/ui/flows-sidebar/flows-sidebar.css";
const SHEETS = ["design-systems/sumi/sumi.css", ...BROWSER_SHEET_SOURCES, SIDEBAR_SHEET];
const TAURI_CONFIG = "apps/tauri/src-tauri/tauri.conf.json";
const TRAFFIC_LIGHTS_GROUP_PX = 60;
const TRAFFIC_LIGHTS_BUTTON_PX = 14;
const TRAFFIC_LIGHTS_TOP_OFFSET_PX = 9;

export interface TrafficLights {
	readonly rightEdgePx: number;
	readonly centreYPx: number;
}

export const TRAFFIC_LIGHTS: TrafficLights = trafficLightsOf();

const PAGE_CSS = `.flows-page-plate{flex:1;margin:0 8px 8px 0;border-radius:10px;background:var(--plate);box-shadow:var(--shadow-page)} .wg-shell{--shell-chrome-left:${TRAFFIC_LIGHTS.rightEdgePx}px}`;
const SETTLE_MS = 1500;
const HARNESS_SIZE: PageSize = [1000, 640];
const STUDIO_PORTAL_LAYER = "wg-root wg-portal wg-kit-portal-layer is-studio";

export interface OpenedSidebar {
	readonly page: AskedPage;
	readonly stop: () => void;
}

export const rowOf = (selector: string, name: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(selector)})].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(name)})`;

export const centreOf = (selector: string, name: string): string =>
	`(() => { const box = ${rowOf(selector, name)}.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`;

export async function pointOf(page: AskedPage, selector: string, name: string): Promise<[number, number]> {
	return (await page.ask(centreOf(selector, name))) as [number, number];
}

export async function hoverOn(page: AskedPage, selector: string, name: string, waitMs: number): Promise<void> {
	const [x, y] = await pointOf(page, selector, name);
	await page.hover(x, y);
	await waited(waitMs);
}

export async function pressOn(page: AskedPage, selector: string, name: string): Promise<void> {
	const [x, y] = await pointOf(page, selector, name);
	await page.press(x, y);
	await waited(400);
}

export async function doubleClickOn(page: AskedPage, selector: string, name: string): Promise<void> {
	await page.ask(`${rowOf(selector, name)}.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))`);
}

export async function openedSidebar(
	bundled: string,
	theme: string,
	scene: string,
	size: PageSize = HARNESS_SIZE,
): Promise<OpenedSidebar> {
	const html = htmlOf(bundled, theme, size);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await pagedWithRetry(`http://127.0.0.1:${port}/#${scene}`, size);
	await waited(SETTLE_MS);
	return {
		page,
		stop: () => {
			page.close();
			server.close();
		},
	};
}

async function pagedWithRetry(file: string, size: PageSize): Promise<AskedPage> {
	const asked = { size, hearsFailures: true };

	try {
		return await paged(file, "flows sidebar", asked);
	} catch {
		return paged(file, "flows sidebar", asked);
	}
}

function htmlOf(bundled: string, theme: string, [width, height]: PageSize): string {
	const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const dark = theme === "dark" ? " dark" : "";
	const script = bundled.replaceAll("</script", "<\\/script");
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}${PAGE_CSS}</style></head><body class="theme-${theme}${dark}" style="margin:0;background:var(--frame)"><div class="${STUDIO_PORTAL_LAYER}"></div><div id="frame" style="width:${width}px;height:${height}px"></div><script>${script}</script></body></html>`;
}

function trafficLightsOf(): TrafficLights {
	const config = TauriConfigSchema.parse(JSON.parse(readFileSync(path.join(REPO, TAURI_CONFIG), "utf8")));
	const { x, y } = config.app.windows[0]?.trafficLightPosition ?? { x: 0, y: 0 };
	return {
		rightEdgePx: x + TRAFFIC_LIGHTS_GROUP_PX,
		centreYPx: y - TRAFFIC_LIGHTS_TOP_OFFSET_PX + TRAFFIC_LIGHTS_BUTTON_PX / 2,
	};
}
