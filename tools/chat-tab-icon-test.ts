import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { CHAT_TAB_LOOKS } from "../apps/studio/src/features/mascot/lib/chat-tab-looks.ts";
import { ChatTabStateSchema } from "../apps/studio/src/features/mascot/lib/chat-tab-state.schema.ts";
import { INK_BODY_PATH } from "../apps/studio/src/features/mascot/lib/wardrobe/outfits.ts";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const SHOT_AT = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-chat-tab-icon.png"));
const ICONS_EXPECTED = 40;
const SETTLE_MS = 1200;
const HOP_PEEK_MS = 120;
const GAZE_SETTLED_MS = 600;

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
.dark { background: black; }
.big .wg-chat-tab-icon { --wg-chat-tab-icon-size: 64px; }`;

const bundle = await bundleOf("tools/chat-tab-icon-page.tsx");
const sheet = readFileSync("apps/studio/src/features/mascot/mascot.css", "utf8");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheet}</style><style>${LAYOUT}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>${FRAME_COUNTER}</script><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const FACES = `Object.fromEntries([...document.querySelectorAll("#small [data-row]")].map((row) => {
	const icon = row.querySelector(".wg-chat-tab-icon");
	const strokes = [...icon.querySelectorAll(".wg-chat-tab-icon-stroke")].map((one) =>
		[one.getAttribute("d"), Number(one.getAttribute("stroke-width"))]);
	return [row.dataset.row, strokes];
}))`;
const MOTIONS = `Object.fromEntries([...document.querySelectorAll("#small [data-row]")].map((row) => {
	const icon = row.querySelector(".wg-chat-tab-icon");
	const ink = getComputedStyle(icon.querySelector(".wg-chat-tab-icon-ink"));
	const lid = getComputedStyle(icon.querySelector(".wg-chat-tab-icon-lid"));
	return [row.dataset.row, [ink.animationName, ink.animationDuration, lid.animationName, lid.animationDuration]];
}))`;
const PAINT = `(() => {
	const inks = [...document.querySelectorAll("#small .wg-chat-tab-icon-ink")].map((one) => getComputedStyle(one));
	const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules])
		.filter((rule) => (rule.style?.backgroundImage ?? "").startsWith("radial-gradient"));
	const mask = decodeURIComponent(inks[0].maskImage);
	const colours = (at) => getComputedStyle(document.querySelector(at + " .wg-chat-tab-icon-ink")).backgroundImage.match(/rgb\\([^)]+\\)/g);
	const stroke = (at) => getComputedStyle(document.querySelector(at + " .wg-chat-tab-icon-stroke")).stroke;
	const size = (at) => { const box = document.querySelector(at + " .wg-chat-tab-icon").getBoundingClientRect(); return [box.width, box.height]; };
	return {
		icons: inks.length,
		gradientElements: document.querySelectorAll("radialGradient, linearGradient").length,
		idsInIcons: document.querySelectorAll(".wg-chat-tab-icon [id]").length,
		gradientRules: rules.map((rule) => rule.selectorText),
		isOnePaint: new Set(inks.map((one) => one.backgroundImage)).size === 1,
		maskPath: /d='([^']+)'/.exec(mask)?.[1] ?? mask,
		light: [colours("#small"), stroke("#small")],
		dark: [colours("#dark"), stroke("#dark")],
		sizes: [size("#small"), size("#large")],
	};
})()`;
const HOP_OF_TWO_IDLE = `[...document.querySelectorAll("[data-host=idle]")].slice(0, 2).map((host) =>
	getComputedStyle(host.querySelector(".wg-chat-tab-icon")).animationName)`;
const GAZE_OF_TWO_IDLE = `[...document.querySelectorAll("[data-host=idle]")].slice(0, 2).map((host) =>
	getComputedStyle(host.querySelector(".wg-chat-tab-icon-gaze")).transform)`;
const FIRST_IDLE_CENTRE = `(() => { const box = document.querySelector("[data-host=idle]").getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`;

const MOTIONS_DRAWN = {
	idle: ["none", "0s", "wg-mascot-blink", "5s"],
	working: ["wg-mascot-bob", "1.2s", "none", "0s"],
	done: ["none", "0s", "none", "0s"],
	failed: ["none", "0s", "wg-mascot-blink", "5s"],
};
const PAINT_DRAWN = {
	icons: ICONS_EXPECTED,
	gradientElements: 0,
	idsInIcons: 0,
	gradientRules: [".wg-chat-tab-icon-ink"],
	isOnePaint: true,
	maskPath: INK_BODY_PATH,
	light: [["rgb(58, 59, 65)", "rgb(23, 24, 27)", "rgb(11, 11, 13)"], "rgb(255, 255, 255)"],
	dark: [["rgb(255, 255, 255)", "rgb(241, 241, 238)", "rgb(185, 186, 181)"], "rgb(23, 24, 27)"],
	sizes: [
		[16, 16],
		[64, 64],
	],
};

function expectedFaces(): Record<string, [string, number][]> {
	return Object.fromEntries(
		ChatTabStateSchema.options.map((state) => {
			const look = CHAT_TAB_LOOKS[state];
			const strokes = look.mouth ? [...look.eyes, look.mouth] : [...look.eyes];
			return [state, strokes.map((one): [string, number] => [one.d, one.width])];
		}),
	);
}

async function firstIdleCentre(page: AskedPage): Promise<readonly [number, number]> {
	const centre = await page.ask(FIRST_IDLE_CENTRE);
	if (!Array.isArray(centre) || typeof centre[0] !== "number" || typeof centre[1] !== "number") {
		throw new Error(`no idle host on the page: ${JSON.stringify(centre)}`);
	}

	return [centre[0], centre[1]];
}

async function checkDrawn(page: AskedPage): Promise<void> {
	check("forty icons and their mounts asked for no animation frame", await page.ask("window.__FRAMES__"), 0);
	check("every state draws the board's strokes, failed as idle", await page.ask(FACES), expectedFaces());
	check(
		"idle and failed blink, working bobs with still lids, done stands still",
		await page.ask(MOTIONS),
		MOTIONS_DRAWN,
	);
	check(
		"the ink is one stylesheet gradient over the body mask, no SVG defs or ids",
		await page.ask(PAINT),
		PAINT_DRAWN,
	);
}

async function checkHover(page: AskedPage): Promise<void> {
	const [x, y] = await firstIdleCentre(page);
	await page.hover(x, y);
	await waited(HOP_PEEK_MS);
	check("a hovered row hops; its neighbour does not", await page.ask(HOP_OF_TWO_IDLE), [
		"wg-chat-tab-icon-hop",
		"none",
	]);
	await waited(GAZE_SETTLED_MS);
	check("a hovered row's eyes glance up and right; its neighbour's stay", await page.ask(GAZE_OF_TWO_IDLE), [
		"matrix(1, 0, 0, 1, 4, -2)",
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
	check("reduced motion: nothing blinks or bobs", await page.ask(MOTIONS), {
		idle: ["none", "0s", "none", "0s"],
		working: ["none", "0s", "none", "0s"],
		done: ["none", "0s", "none", "0s"],
		failed: ["none", "0s", "none", "0s"],
	});
	check("the page drew without a failure", await page.ask(`document.getElementById("boom").textContent`), "");
} finally {
	page.close();
	server.close();
}

console.log(failed === 0 ? "chat-tab-icon: clean" : `chat-tab-icon: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
