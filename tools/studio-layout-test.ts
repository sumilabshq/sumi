import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { PLATE_LEAST_PX } from "../packages/shell/shared/lib/frame-bounds.ts";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";

interface Layout {
	readonly chat: { readonly left: number; readonly right: number; readonly width: number };
	readonly app: { readonly left: number; readonly width: number };
	readonly panel: number;
	readonly stage: number | null;
	readonly appInner: number;
	readonly kept: string | null;
	readonly handle: PagePoint;
}

const VIEW: readonly [number, number] = [2600, 900];
const WIDE_CHAT_PX = 1400;
const REMEMBERED_PX = 1000;
const CONTENT_PX = 800;
const CANVAS_DRAG_PX = 100;
const SLACK_PX = 1;
const KEPT_KEY = "widgetarium-studio-chat-px";
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-layout"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const OBSIDIAN_MAC_CORNERS = "button { corner-shape: superellipse(1.33); }";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${OBSIDIAN_MAC_CORNERS}</style><style>${sheets}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>if (location.hash !== "#kept") localStorage.clear(); window.__MODE__ = "studio";</script>
<script>${bundle}</script></body></html>`;

const SQUIRCLED_BUTTONS = `(() => ({
	isSupported: CSS.supports("corner-shape", "round"),
	buttons: document.querySelectorAll(".wg-studio button").length,
	squircled: [...document.querySelectorAll(".wg-studio button")]
		.map((button) => getComputedStyle(button).getPropertyValue("corner-shape"))
		.filter((shape) => shape !== "round" && shape !== "superellipse(1)"),
}))()`;

const LAYOUT_OF = `(() => {
	const chat = document.querySelector('[data-shell-plate="chat"]').getBoundingClientRect();
	const app = document.querySelector('[data-shell-plate="app"]');
	const appBox = app.getBoundingClientRect();
	const body = app.querySelector(".wg-shell-plate-body");
	const handle = document.querySelector('[data-shell-edge="chat"]').getBoundingClientRect();
	const stage = document.querySelector("[data-canvas-stage]");
	return {
		chat: { left: chat.left, right: chat.right, width: chat.width },
		app: { left: appBox.left, width: appBox.width },
		panel: document.querySelector(".wg-shell-panel")?.getBoundingClientRect().width ?? 0,
		stage: stage ? stage.getBoundingClientRect().width : null,
		appInner: body.clientWidth,
		kept: localStorage.getItem(${JSON.stringify(KEPT_KEY)}),
		handle: [handle.left + handle.width / 2, handle.top + handle.height / 2],
	};
})()`;

const ASK_CATALOGUE = `void window.__CATALOGUE__.requests.ask({ mode: "place" }); true`;

const CLOSE_CATALOGUE = `document.querySelector('.wg-studio-sidebar button[aria-label="Close the catalogue"]').click()`;

const SEND_MINE = `(() => {
	const box = document.querySelector(".wg-studio-chat .wg-studio-ai-box");
	Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(box, "Plant the beans");
	box.dispatchEvent(new Event("input", { bubbles: true }));
	setTimeout(() => document.querySelector('.wg-studio-chat button[aria-label="Send"]').click(), 100);
	return true;
})()`;

const PAINT_OF = `(parent, token, property) => {
	const probe = parent.appendChild(document.createElement("i"));
	probe.style[property] = "var(" + token + ")";
	const painted = getComputedStyle(probe)[property];
	probe.remove();
	return painted;
}`;

const HOST_ACCENT = "rgb(255, 0, 128)";
const HOST_ON_ACCENT = "rgb(0, 0, 0)";

const ACCENT_PAINT_OF = `((isInObsidian) => {
	const studio = document.querySelector(".wg-studio");
	document.body.style.setProperty("--interactive-accent", ${JSON.stringify(HOST_ACCENT)});
	document.body.style.setProperty("--interactive-accent-hover", ${JSON.stringify(HOST_ACCENT)});
	document.body.style.setProperty("--text-on-accent", ${JSON.stringify(HOST_ON_ACCENT)});
	studio.parentElement.classList.toggle("wg-studio-view", isInObsidian);
	const chat = document.querySelector(".wg-studio-chat .wg-root");
	const paintOf = (token, property) => (${PAINT_OF})(chat, token, property);
	const painted = {
		accent: paintOf("--wg-kit-accent", "backgroundColor"),
		onAccent: paintOf("--brand-foreground", "color"),
		ring: paintOf("--ring", "backgroundColor"),
	};
	studio.parentElement.classList.remove("wg-studio-view");
	return painted;
})`;

const CONTENT_COLUMN = `(() => {
	const chat = document.querySelector(".wg-studio-chat .wg-studio-ai").getBoundingClientRect();
	const plate = document.querySelector('[data-shell-plate="chat"]').getBoundingClientRect();
	const composer = document.querySelector(".wg-studio-chat .wg-studio-ai-composer").getBoundingClientRect();
	const turn = document.querySelector(".wg-studio-chat .wg-studio-ai-turn").getBoundingClientRect();
	const scroll = document.querySelector(".wg-studio-chat .wg-studio-ai-scroll").getBoundingClientRect();
	const gutters = (box) => [Math.round(box.left - chat.left), Math.round(chat.right - box.right)];
	return {
		scroll: Math.round(scroll.width),
		scrollRightPastCentre: Math.round(scroll.right - (chat.left + chat.width / 2)),
		chat: Math.round(chat.width),
		plate: Math.round(plate.width),
		composer: Math.round(composer.width),
		composerGutters: gutters(composer),
		turn: Math.round(turn.width),
		turnGutters: gutters(turn),
	};
})()`;

const REMEMBER_WIDE = `localStorage.setItem(${JSON.stringify(KEPT_KEY)}, ${JSON.stringify(String(REMEMBERED_PX))}); location.hash = "kept"; location.reload(); true`;

const DOUBLE_PRESS_EDGE = `document.querySelector('[data-shell-edge="chat"]').dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function isLayout(value: unknown): value is Layout {
	return typeof value === "object" && value !== null && "chat" in value && "app" in value;
}

async function layoutOf(page: AskedPage): Promise<Layout> {
	const asked = await page.ask(LAYOUT_OF);
	if (!isLayout(asked)) throw new Error(`the studio drew no chat and app plate: ${JSON.stringify(asked)}`);
	return asked;
}

async function untilAnswered(page: AskedPage, expression: string): Promise<boolean> {
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await page.ask(expression)) === true) return true;
		await waited(50);
	}
	return false;
}

async function draggedEdge(page: AskedPage, byPx: number): Promise<Layout> {
	const [x, y] = (await layoutOf(page)).handle;
	const to: PagePoint = [x + byPx, y];
	await page.drag({ from: [x, y], to, steps: 8, stepMs: 16 });
	await page.release(to);
	await waited(120);
	return layoutOf(page);
}

function isPaintedAs(painted: unknown, wanted: Readonly<Record<string, string>>): boolean {
	if (typeof painted !== "object" || painted === null) {
		return false;
	}

	const held = Object.fromEntries(Object.entries(painted));
	return Object.entries(wanted).every(([name, colour]) => held[name] === colour);
}

function isCentredColumn(column: unknown): boolean {
	if (typeof column !== "object" || column === null) {
		return false;
	}

	const { chat, plate, composer, composerGutters, turn, turnGutters, scroll, scrollRightPastCentre } =
		Object.fromEntries(Object.entries(column));
	return (
		typeof scroll === "number" &&
		scroll <= CONTENT_PX &&
		isNear(Number(scrollRightPastCentre), CONTENT_PX / 2) &&
		plate === WIDE_CHAT_PX &&
		chat === WIDE_CHAT_PX &&
		composer === CONTENT_PX &&
		typeof turn === "number" &&
		turn <= CONTENT_PX &&
		isEvenPair(composerGutters) &&
		isEvenPair(turnGutters)
	);
}

function isEvenPair(pair: unknown): boolean {
	return Array.isArray(pair) && pair.length === 2 && Math.abs(Number(pair[0]) - Number(pair[1])) <= SLACK_PX;
}

function isNear(got: number, wanted: number): boolean {
	return Math.abs(got - wanted) <= SLACK_PX;
}

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "studio layout", { size: VIEW });

try {
	const drawn = await untilAnswered(
		page,
		`document.querySelector('[data-plate-head="chat"] [aria-label$=" menu"]') !== null`,
	);
	check("the studio drew its chat plate with the menu", drawn, drawn);
	await waited(300);
	writeFileSync(path.join(shotsAt, "studio-layout.png"), await page.shoot());

	await page.ask(ASK_CATALOGUE);
	await untilAnswered(page, `document.querySelector(".wg-studio-sidebar") !== null`);
	await waited(120);
	const besideCatalogue = await draggedEdge(page, VIEW[0]);
	check(
		"with the catalogue open a drag still leaves the app plate its least width",
		besideCatalogue.panel > 0 &&
			isNear(besideCatalogue.app.width, PLATE_LEAST_PX) &&
			besideCatalogue.kept === String(Math.round(besideCatalogue.chat.width)),
		{ chat: besideCatalogue.chat.width, app: besideCatalogue.app.width, kept: besideCatalogue.kept },
	);
	await page.ask(CLOSE_CATALOGUE);
	await untilAnswered(page, `document.querySelector(".wg-studio-sidebar") === null`);
	await page.ask(DOUBLE_PRESS_EDGE);
	await waited(120);

	await page.ask(SEND_MINE);
	await untilAnswered(page, `document.querySelector(".wg-studio-ai-turn.is-mine .wg-studio-ai-said") !== null`);
	const hosted = await page.ask(`${ACCENT_PAINT_OF}(true)`);
	check(
		"inside Obsidian the studio's accent and text on the accent are the host's",
		isPaintedAs(hosted, { accent: HOST_ACCENT, onAccent: HOST_ON_ACCENT }),
		hosted,
	);
	check("and the focus ring stays the system's neutral grey", !isPaintedAs(hosted, { ring: HOST_ACCENT }), hosted);
	const hostless = await page.ask(`${ACCENT_PAINT_OF}(false)`);
	check(
		"and outside Obsidian the system's own accent stays",
		!isPaintedAs(hostless, { accent: HOST_ACCENT }),
		hostless,
	);
	await draggedEdge(page, WIDE_CHAT_PX - (await layoutOf(page)).chat.width);
	const column = await page.ask(CONTENT_COLUMN);
	check(
		"a 1400px chat keeps its list, its scrollbar and its composer in one centred 800px column",
		isCentredColumn(column),
		column,
	);
	await page.ask(DOUBLE_PRESS_EDGE);
	await waited(120);

	const staged = await untilAnswered(page, `document.querySelector("[data-canvas-stage]") !== null`);
	await waited(300);
	writeFileSync(path.join(shotsAt, "studio-layout-canvas.png"), await page.shoot());
	const canvasBefore = await layoutOf(page);
	const canvasAfter = await draggedEdge(page, CANVAS_DRAG_PX);
	check(
		"in the canvas a drag re-fits the canvas stage to the app plate",
		staged &&
			canvasBefore.stage !== null &&
			canvasAfter.stage !== null &&
			isNear(canvasAfter.stage, canvasBefore.stage - CANVAS_DRAG_PX) &&
			isNear(canvasAfter.stage, canvasAfter.appInner),
		{ staged, before: canvasBefore.stage, after: canvasAfter.stage, plate: canvasAfter.appInner },
	);
	const corners = await page.ask(SQUIRCLED_BUTTONS);
	check(
		"Obsidian's macOS superellipse leaves every studio button round",
		isRecord(corners) &&
			corners["isSupported"] === true &&
			typeof corners["buttons"] === "number" &&
			corners["buttons"] > 0 &&
			Array.isArray(corners["squircled"]) &&
			corners["squircled"].length === 0,
		corners,
	);
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
	await page.ask(REMEMBER_WIDE);
	await waited(300);
	await untilAnswered(page, `document.querySelector('[data-shell-plate="chat"]') !== null`);
	await waited(200);
	const remembered = await layoutOf(page);
	check(
		"a remembered 1000px opens the chat at 1000px",
		isNear(remembered.chat.width, REMEMBERED_PX),
		remembered.chat.width,
	);
} finally {
	page.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "studio layout: clean" : `studio layout: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
