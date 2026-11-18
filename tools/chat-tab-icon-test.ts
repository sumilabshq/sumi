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
	const cube = row.querySelector(".wg-chat-tab-icon .wg-kit-status-cube");
	return [row.dataset.row, cube.dataset.state];
}))`;
const PAINT = `(() => {
	const box = (at) => { const one = document.querySelector(at).getBoundingClientRect(); return [one.width, one.height]; };
	const body = (at) => getComputedStyle(document.querySelector(at + " .wg-kit-status-cube-body")).fill;
	return {
		icons: document.querySelectorAll("[data-icons=small] .wg-chat-tab-icon").length,
		cubes: document.querySelectorAll("[data-icons=small] .wg-kit-status-cube").length,
		icon: box("[data-icons=small] .wg-chat-tab-icon"),
		cube: box("[data-icons=small] .wg-kit-status-cube"),
		isDoneOtherOnDark: body(".dark-row") !== body("[data-row=done]"),
		isEachStateOwnColour: new Set(["idle", "done", "failed"].map((row) => body("[data-row=" + row + "]"))).size === 3,
		glow: getComputedStyle(document.querySelector("[data-row=working] .wg-kit-status-cube-eye")).animationName,
	};
})()`;
const SHAPES = `Object.fromEntries([...document.querySelectorAll("[data-icons=small] [data-row]")].map((row) =>
	[row.dataset.row, row.querySelector(".wg-kit-status-cube-body").getAttribute("points")]))`;
const HOP_OF_TWO_IDLE = `[...document.querySelectorAll("[data-host=idle]")].slice(0, 2).map((host) =>
	getComputedStyle(host.querySelector(".wg-chat-tab-icon")).animationName)`;
const FIRST_IDLE_CENTRE = `(() => { const box = document.querySelector("[data-host=idle]").getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`;

const FACES_DRAWN = {
	idle: "idle",
	working: "working",
	done: "done",
	failed: "blocked",
};
const PAINT_DRAWN = {
	icons: ICONS_EXPECTED,
	cubes: ICONS_EXPECTED,
	icon: [16, 16],
	cube: [14, 14],
	isDoneOtherOnDark: true,
	isEachStateOwnColour: true,
	glow: "none",
};
const FRAMES_OF_ONE_LOOP = Math.ceil((SETTLE_MS / 1000) * 120);

async function firstIdleCentre(page: AskedPage): Promise<readonly [number, number]> {
	const centre = await page.ask(FIRST_IDLE_CENTRE);

	if (!Array.isArray(centre) || typeof centre[0] !== "number" || typeof centre[1] !== "number") {
		throw new Error(`no idle host on the page: ${JSON.stringify(centre)}`);
	}

	return [centre[0], centre[1]];
}

async function shapesOf(page: AskedPage): Promise<Record<string, string>> {
	const shapes = await page.ask(SHAPES);

	if (typeof shapes !== "object" || shapes === null) {
		throw new Error(`no cube shapes on the page: ${JSON.stringify(shapes)}`);
	}

	return Object.fromEntries(Object.entries(shapes).map(([row, points]) => [row, String(points)]));
}

async function checkDrawn(page: AskedPage): Promise<void> {
	const frames = await page.ask("window.__FRAMES__");
	check("ten working cubes share one frame loop", typeof frames === "number" && frames > 0 && frames <= FRAMES_OF_ONE_LOOP, true);
	check("each chat state shows its cube state", await page.ask(FACES), FACES_DRAWN);
	check("a 14px cube in a 16px slot, own colour per state and theme, no glow", await page.ask(PAINT), PAINT_DRAWN);
	const before = await shapesOf(page);
	await waited(HOP_PEEK_MS);
	const after = await shapesOf(page);
	check("only the working cube moves", Object.keys(before).filter((row) => before[row] !== after[row]), ["working"]);
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
	const still = await shapesOf(page);
	await waited(HOP_PEEK_MS);
	check("reduced motion: the working cube stays still", (await shapesOf(page))["working"], still["working"]);
	check("the page drew without a failure", await page.ask(`document.getElementById("boom").textContent`), "");
} finally {
	page.close();
	server.close();
}

console.log(failed === 0 ? "chat-tab-icon: clean" : `chat-tab-icon: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
