import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";

const SHOT_AT = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-chat-tab-icon.png"));
const ICONS_EXPECTED = 40;
const SETTLE_MS = 1200;
const HOP_PEEK_MS = 120;

let failed = 0;
function check(what: string, got: unknown, want: unknown): void {
	const isOk = JSON.stringify(got) === JSON.stringify(want);

	if (!isOk) {
		failed += 1;
	}

	console.log(
		`${isOk ? "ok  " : "FAIL"} ${what} — got ${JSON.stringify(got)}${isOk ? "" : `, want ${JSON.stringify(want)}`}`,
	);
}

const FRAME_COUNTER = `window.__FRAMES__ = 0;
const realFrame = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (step) => { window.__FRAMES__ += 1; return realFrame(step); };`;
const LAYOUT = `body { margin: 0; padding: 16px; background: white; }
.row { display: flex; gap: 8px; padding: 6px; }
.dark-row { background: black; }`;

const bundle = await bundleOf("tools/chat-tab-icon-page.tsx");
const sheet = readFileSync(BOARD_SHEET, "utf8");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheet}</style><style>${LAYOUT}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>${FRAME_COUNTER}</script><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const FACES = `Object.fromEntries([...document.querySelectorAll("[data-icons=small] [data-row]")].map((row) => {
	const icon = row.querySelector(".wg-chat-tab-icon");
	const figure = icon.querySelector(".sumi-figure");
	return [row.dataset.row, [figure.dataset.state, icon.dataset.motion]];
}))`;
const PAINT = `(() => {
	const box = (at) => { const one = document.querySelector(at).getBoundingClientRect(); return [one.width, one.height]; };
	const body = (at) => getComputedStyle(document.querySelector(at + " .sumi-figure-body")).fill;
	return {
		icons: document.querySelectorAll("[data-icons=small] .wg-chat-tab-icon").length,
		figures: document.querySelectorAll("[data-icons=small] .sumi-figure").length,
		icon: box("[data-icons=small] .wg-chat-tab-icon"),
		figure: box("[data-icons=small] .sumi-figure"),
		isDarkOther: body(".dark-row") !== body("[data-row=idle]"),
		glow: getComputedStyle(document.querySelector("[data-row=working] .sumi-figure-eye")).animationName,
	};
})()`;
const HOP_OF_TWO_IDLE = `[...document.querySelectorAll("[data-host=idle]")].slice(0, 2).map((host) =>
	getComputedStyle(host.querySelector(".wg-chat-tab-icon")).animationName)`;
const FIRST_IDLE_CENTRE = `(() => { const box = document.querySelector("[data-host=idle]").getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`;
const WORKING_GLOW = `getComputedStyle(document.querySelector("[data-row=working] .sumi-figure-eye")).animationName`;

const FACES_DRAWN = {
	idle: ["rest", "blink"],
	working: ["working", "bob"],
	done: ["done", "still"],
	failed: ["error", "still"],
};
const PAINT_DRAWN = {
	icons: ICONS_EXPECTED,
	figures: ICONS_EXPECTED,
	icon: [16, 16],
	figure: [14, 14],
	isDarkOther: true,
	glow: "sumi-eye-glow",
};

async function firstIdleCentre(page: AskedPage): Promise<readonly [number, number]> {
	const centre = await page.ask(FIRST_IDLE_CENTRE);

	if (!Array.isArray(centre) || typeof centre[0] !== "number" || typeof centre[1] !== "number") {
		throw new Error(`no idle host on the page: ${JSON.stringify(centre)}`);
	}

	return [centre[0], centre[1]];
}

async function checkDrawn(page: AskedPage): Promise<void> {
	check("forty small Sumis asked for no animation frame", await page.ask("window.__FRAMES__"), 0);
	check("each chat state shows its Sumi state", await page.ask(FACES), FACES_DRAWN);
	check("a 14px square Sumi in a 16px slot, other on dark, glowing while working", await page.ask(PAINT), PAINT_DRAWN);
}

async function checkHover(page: AskedPage): Promise<void> {
	const [x, y] = await firstIdleCentre(page);
	await page.hover(x, y);
	await waited(HOP_PEEK_MS);
	check("a hovered row hops; its neighbour does not", await page.ask(HOP_OF_TWO_IDLE), [
		"wg-chat-tab-icon-hop",
		"none",
	]);
}

const page = await paged(origin, "chat-tab-icon", { size: [720, 420] });
try {
	await waited(SETTLE_MS);
	await checkDrawn(page);
	mkdirSync(path.dirname(SHOT_AT), { recursive: true });
	writeFileSync(SHOT_AT, await page.shoot());
	console.log(`     screenshot: ${SHOT_AT}`);
	await checkHover(page);
	await page.reduceMotion();
	await page.ask("location.reload(); true");
	await waited(SETTLE_MS);
	check("reduced motion: the working eye does not glow", await page.ask(WORKING_GLOW), "none");
	check("the page drew without a failure", await page.ask(`document.getElementById("boom").textContent`), "");
} finally {
	page.close();
	server.close();
}

console.log(failed === 0 ? "chat-tab-icon: clean" : `chat-tab-icon: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
