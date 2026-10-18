import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import { UNJUDGED, differences, withoutUnjudged } from "./studio-tabs-diff.ts";
import type { Difference } from "./studio-tabs-diff.ts";
import {
	BOARD_PARTS,
	BUILT_PARTS,
	DRAGGED,
	GEIST_LOADED,
	HOVERED,
	SHOWN,
	TABS_PROBE,
} from "./studio-tabs-exact-probe.ts";
import type { TabsParts } from "./studio-tabs-exact-probe.ts";

export interface ExactTabsReport {
	readonly differences: number;
	readonly unjudged: readonly string[];
	readonly light: readonly Difference[];
	readonly dark: readonly Difference[];
	readonly measured: Readonly<Record<string, unknown>>;
}

const REPO = path.resolve(import.meta.dirname, "..");
const BOARDS = path.join(REPO, "docs/reference/tabs-column");
const THEMES = [
	["light", "TabsSidebar.dc.html"],
	["dark", "TabsSidebarDark.dc.html"],
] as const;
const SHEETS = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"];
const GEIST_FACES = (
	readFileSync(path.join(REPO, "packages/host-obsidian/styles.css"), "utf8").match(
		/@font-face\s*\{[^}]*font-family:\s*"Geist"[^}]*\}/g,
	) ?? []
).join("\n");
const THEMED = `((theme) => { document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme === "light"); return true; })`;
const POINTER_INSIDE_ROW_PX = 60;
const DRAG_UP_PX = 14;

export async function exactTabsReport(): Promise<ExactTabsReport> {
	const measured: Record<string, unknown> = {};
	const found: Record<string, readonly Difference[]> = {};

	for (const [theme, file] of THEMES) {
		const board = await boardOf(file);
		const built = await builtOf(theme, board["brand"]);
		found[theme] = differences(withoutUnjudged(board), withoutUnjudged(built), theme);
		measured[theme] = {
			board,
			built,
		};
	}

	const light = found["light"] ?? [];
	const dark = found["dark"] ?? [];
	return {
		differences: light.length + dark.length,
		unjudged: UNJUDGED,
		light,
		dark,
		measured,
	};
}

async function measuredIn(page: AskedPage, parts: TabsParts, phase: string): Promise<Record<string, unknown>> {
	const at = {
		hovered: HOVERED,
		shown: SHOWN,
	};
	const asked = await page.ask(
		`${TABS_PROBE}(${JSON.stringify(parts)}, ${JSON.stringify(phase)}, ${JSON.stringify(at)})`,
	);
	return isRecord(asked) ? asked : {};
}

async function boardOf(file: string): Promise<Record<string, unknown>> {
	const page = await paged(path.join(BOARDS, file), "exact tabs board", { size: [1700, 1200] });

	try {
		await waited(2500);
		await page.ask(`${GEIST_LOADED}(${JSON.stringify(GEIST_FACES)})`);
		const brand = await page.ask(`${TABS_PROBE}(${JSON.stringify(BOARD_PARTS)}, "brand", {})`);
		return {
			...(await measuredIn(page, BOARD_PARTS, "rest")),
			...(await measuredIn(page, BOARD_PARTS, "hover")),
			...(await measuredIn(page, BOARD_PARTS, "drag")),
			brand,
		};
	} finally {
		page.close();
	}
}

async function rowPointOf(page: AskedPage, at: number): Promise<PagePoint> {
	const point = await page.ask(
		`(() => { const row = [...document.querySelectorAll(${JSON.stringify(BUILT_PARTS["row"])})][${at}]; const box = row.getBoundingClientRect(); return [box.left + ${POINTER_INSIDE_ROW_PX}, box.top + box.height / 2]; })()`,
	);

	if (!Array.isArray(point)) {
		throw new Error(`the built column holds no row ${at}`);
	}

	return [Number(point[0]), Number(point[1])];
}

function builtPageOf(theme: string, brand: unknown): string {
	const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const pinnedBrand = `[data-host-column] { --brand: ${String(brand)} !important; }`;
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style><style>${pinnedBrand}</style></head><body class="theme-${theme}"><div id="root"></div><pre id="boom"></pre><script>localStorage.clear(); window.__MODE__ = "studio-exact";</script><script>__BUNDLE__</script></body></html>`;
}

async function builtOf(theme: string, brand: unknown): Promise<Record<string, unknown>> {
	const html = builtPageOf(theme, brand).replace("__BUNDLE__", () => bundled);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/`, "exact tabs build", { size: [1800, 1000] });

	try {
		return await builtPhasesOf(page, theme);
	} finally {
		page.close();
		server.close();
	}
}

async function builtPhasesOf(page: AskedPage, theme: string): Promise<Record<string, unknown>> {
	await waited(2000);
	await page.ask(`${GEIST_LOADED}("")`);
	await page.reduceMotion();
	await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
	await waited(300);
	const rest = await measuredIn(page, BUILT_PARTS, "rest");
	const [x, y] = await rowPointOf(page, HOVERED);
	await page.hover(x, y);
	await waited(300);
	const hover = await measuredIn(page, BUILT_PARTS, "hover");
	const from = await rowPointOf(page, DRAGGED);
	const to: PagePoint = [from[0], from[1] - DRAG_UP_PX];
	await page.drag({ from, to, steps: 8, stepMs: 16 });
	await waited(300);
	const drag = await measuredIn(page, BUILT_PARTS, "drag");
	await page.release(to);
	return { ...rest, ...hover, ...drag };
}

const bundled = await bundleOf("tools/studio-render-page.tsx");
