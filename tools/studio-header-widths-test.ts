import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { CHAT_LEAST_PX } from "../packages/core/src/engine/studio-state-port.ts";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import type { Theme } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import { HEADER_STEP_AT, checkAdaptiveHeader, checkChatHead } from "./studio-header-width-laws.ts";
import type { AdaptiveHeader } from "./studio-header-width-laws.ts";
import { ADAPTIVE_HEADER_OF } from "./studio-render-measure.ts";

const VIEW: readonly [number, number] = [1800, 700];
const THEMES: readonly Theme[] = ["light", "dark"];
const EDGE_AT = `(() => { const edge = document.querySelector(".wg-studio-chat-edge").getBoundingClientRect(); return [edge.left + edge.width / 2, edge.top + edge.height / 2]; })()`;
const CHAT_PX = `Math.round(document.querySelector(".wg-studio-chat").getBoundingClientRect().width)`;
const DRAWN = `document.querySelector("[data-app-host-bar] [data-canvas-zoom]") !== null`;
const THEMED = `((theme) => { document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme === "light"); return true; })`;

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-header-widths"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style></head>
<body class="theme-light"><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = "studio";</script>
<script>${bundle}</script></body></html>`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function isAdaptiveHeader(value: unknown): value is AdaptiveHeader {
	return isRecord(value) && isRecord(value["bar"]) && isRecord(value["sizes"]) && isRecord(value["step"]);
}

function isPoint(value: unknown): value is PagePoint {
	return Array.isArray(value) && value.length === 2 && value.every((held) => typeof held === "number");
}

async function headerOf(page: AskedPage): Promise<AdaptiveHeader> {
	const asked = await page.ask(ADAPTIVE_HEADER_OF);
	if (!isAdaptiveHeader(asked)) throw new Error(`the studio drew no header: ${JSON.stringify(asked)}`);
	return asked;
}

async function draggedEdge(page: AskedPage, byPx: number): Promise<void> {
	const from = await page.ask(EDGE_AT);
	if (!isPoint(from)) throw new Error(`the studio drew no chat edge: ${JSON.stringify(from)}`);
	const to: PagePoint = [from[0] + byPx, from[1]];
	await page.drag({ from, to, steps: 8, stepMs: 16 });
	await page.release(to);
	await waited(150);
}

async function barSizedTo(page: AskedPage, width: number): Promise<AdaptiveHeader> {
	const before = await headerOf(page);
	await draggedEdge(page, before.bar.w - width);
	return headerOf(page);
}

async function shotsAtWidth(page: AskedPage, name: string): Promise<void> {
	for (const theme of THEMES) {
		await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
		await waited(80);
		writeFileSync(path.join(shotsAt, `adaptive-${name}-${theme}.png`), await page.shoot());
	}
	await page.ask(`${THEMED}("light")`);
}

async function untilDrawn(page: AskedPage): Promise<boolean> {
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await page.ask(DRAWN)) === true) return true;
		await waited(50);
	}
	return false;
}

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "studio header widths", { size: VIEW });

try {
	const drawn = await untilDrawn(page);
	check("the studio drew the canvas header", drawn, drawn);
	await page.reduceMotion();
	await waited(300);
	for (const width of HEADER_STEP_AT.keys()) {
		const header = await barSizedTo(page, width);
		checkAdaptiveHeader(width, header, check);
		checkChatHead(Number(await page.ask(CHAT_PX)), header, check);
		await shotsAtWidth(page, String(width));
	}
	await draggedEdge(page, -VIEW[0]);
	const chatPx = Number(await page.ask(CHAT_PX));
	check("the chat narrows to its least width", chatPx === CHAT_LEAST_PX, chatPx);
	checkChatHead(chatPx, await headerOf(page), check);
	await shotsAtWidth(page, "chat-least");
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
} finally {
	page.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "studio header widths: clean" : `studio header widths: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
