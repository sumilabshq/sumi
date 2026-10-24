import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-canvas-tabs"));
mkdirSync(shotsAt, { recursive: true });
const bundle = await bundleOf("tools/studio-render-page.tsx");
const sumi = readFileSync("design-systems/sumi/sumi.css", "utf8");
const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sumi}\n${sheets}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = "studio-exact";</script>
<script>${bundle}</script></body></html>`;

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "canvas tabs probe", { size: [1800, 1000] });
let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

async function until(expression: string): Promise<boolean> {
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await page.ask(expression)) === true) return true;
		await waited(100);
	}
	return false;
}

async function pressed(selector: string): Promise<void> {
	const at = await page.ask(
		`(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
	);
	if (!Array.isArray(at)) throw new Error(`nothing answers ${selector}`);
	await page.press(Number(at[0]), Number(at[1]));
	await waited(500);
}

const KEPT = `[...document.querySelectorAll("[data-studio-kept-app=canvas]")].map((kept) => kept.dataset.studioKeptKey + ":" + kept.dataset.studioKept)`;
const ZOOM = `document.querySelector("[data-canvas-zoom]")?.textContent ?? null`;
const ZOOMED_IN = `(() => { const board = document.querySelector("[data-studio-kept=shown] [data-canvas-board]"); const box = board.getBoundingClientRect(); const x = box.left + box.width / 2; const y = box.top + box.height / 2; const target = document.elementFromPoint(x, y); for (let step = 0; step < 6; step += 1) target.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, ctrlKey: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); return true; })()`;

async function zoomOf(page: AskedPage): Promise<unknown> {
	await waited(300);
	return page.ask(ZOOM);
}

try {
	check(
		"the studio drew the tabs sidebar",
		await until(`document.querySelector("[data-tabs-sidebar]") !== null`),
		null,
	);
	await pressed('[data-tabs-item=essential][data-tabs-id="essential-1"]');
	check(
		"the Canvas essential shows a canvas",
		await until(`document.querySelector("[data-studio-kept=shown] [data-canvas-board]") !== null`),
		await page.ask(KEPT),
	);
	const firstZoom = await zoomOf(page);
	await page.ask(ZOOMED_IN);
	const zoomedFirst = await zoomOf(page);
	check("zooming the first canvas changes its zoom", zoomedFirst !== firstZoom, [firstZoom, zoomedFirst]);
	await pressed('[data-tabs-list] [data-tabs-id="tab-6"]');
	const secondKept = await page.ask(KEPT);
	const secondZoom = await zoomOf(page);
	writeFileSync(path.join(shotsAt, "second-canvas.png"), await page.shoot());
	check(
		"a second canvas tab is its own canvas, with the first kept hidden beside it",
		Array.isArray(secondKept) &&
			secondKept.length === 2 &&
			secondKept.filter((one) => String(one).endsWith(":shown")).length === 1,
		secondKept,
	);
	check("the second canvas does not wear the first one's zoom", secondZoom !== zoomedFirst, [zoomedFirst, secondZoom]);
	await pressed('[data-tabs-item=essential][data-tabs-id="essential-1"]');
	const backZoom = await zoomOf(page);
	writeFileSync(path.join(shotsAt, "first-canvas-again.png"), await page.shoot());
	check("switching back finds the first canvas where it was left", backZoom === zoomedFirst, [zoomedFirst, backZoom]);
} finally {
	page.close();
	server.close();
}
console.log(failed === 0 ? "canvas tabs: all checks pass" : `canvas tabs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
