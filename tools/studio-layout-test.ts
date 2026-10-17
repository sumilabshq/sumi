import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { CARD_LEAST_PX, CHAT_LEAST_PX, CHAT_USUAL_PX } from "../packages/core/src/engine/studio-state-port.ts";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

interface Layout {
	readonly rail: { readonly left: number; readonly right: number };
	readonly chat: { readonly left: number; readonly right: number; readonly width: number };
	readonly card: { readonly left: number; readonly width: number };
	readonly room: number;
	readonly side: number;
	readonly radius: string;
	readonly plate: string;
	readonly platePad: string;
	readonly edge: string;
	readonly edgeColour: string;
	readonly menuInHead: boolean;
	readonly stage: number | null;
	readonly cardInner: number;
	readonly kept: string | null;
	readonly handle: PagePoint;
}

const VIEW: readonly [number, number] = [1800, 900];
const WIDE_CHAT_PX = 1400;
const CONTENT_PX = 800;
const DRAG_PX = 200;
const CANVAS_DRAG_PX = 100;
const SLACK_PX = 1;
const KEPT_KEY = "widgetarium-studio-chat-px";
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-layout"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>if (location.hash !== "#kept") localStorage.clear(); window.__MODE__ = "studio";</script>
<script>${bundle}</script></body></html>`;

const LAYOUT_OF = `(() => {
	const chat = document.querySelector(".wg-studio-chat").getBoundingClientRect();
	const outlet = document.querySelector(".wg-studio-outlet");
	const card = outlet.getBoundingClientRect();
	const style = getComputedStyle(outlet);
	const handle = document.querySelector(".wg-studio-chat-edge").getBoundingClientRect();
	const stage = document.querySelector("[data-canvas-stage]");
	const rail = document.querySelector(".wg-studio-rail").getBoundingClientRect();
	return {
		rail: { left: rail.left, right: rail.right },
		chat: { left: chat.left, right: chat.right, width: chat.width },
		card: { left: card.left, width: card.width },
		room: document.querySelector(".wg-studio").clientWidth - rail.width,
		side: document.querySelector(".wg-studio-sidebar")?.getBoundingClientRect().width ?? 0,
		radius: style.borderTopLeftRadius,
		plate: style.getPropertyValue("--wg-kit-plate").trim(),
		platePad: style.getPropertyValue("--wg-kit-plate-pad").trim(),
		edge: style.borderTopWidth + " " + style.borderTopStyle,
		edgeColour: style.borderTopColor,
		menuInHead: document.querySelector('.wg-studio-chat .wg-studio-ai-head [aria-label$=" menu"]') !== null,
		stage: stage ? stage.getBoundingClientRect().width : null,
		cardInner: outlet.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
		kept: localStorage.getItem(${JSON.stringify(KEPT_KEY)}),
		handle: [handle.left + handle.width / 2, handle.top + handle.height / 2],
	};
})()`;

const ASK_CATALOGUE = `void window.__CATALOGUE__.requests.ask({ mode: "place" }); true`;

const CLOSE_CATALOGUE = `document.querySelector('.wg-studio-sidebar button[aria-label="Close the catalogue"]').click()`;

const BAND_BUTTONS = `document.querySelectorAll(".wg-studio-band button").length`;

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

const SHELL_PAINT = `(() => {
	const studio = document.querySelector(".wg-studio");
	const paintOf = (token) => (${PAINT_OF})(studio, token, "backgroundColor");
	return {
		shell: getComputedStyle(studio).backgroundColor,
		page: paintOf("--wg-kit-page"),
		card: getComputedStyle(document.querySelector(".wg-studio-outlet")).backgroundColor,
		group: paintOf("--wg-kit-group-fill"),
	};
})()`;

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
	const composer = document.querySelector(".wg-studio-chat .wg-studio-ai-composer").getBoundingClientRect();
	const turn = document.querySelector(".wg-studio-chat .wg-studio-ai-turn").getBoundingClientRect();
	const scroll = document.querySelector(".wg-studio-chat .wg-studio-ai-scroll").getBoundingClientRect();
	const gutters = (box) => [Math.round(box.left - chat.left), Math.round(chat.right - box.right)];
	return {
		scroll: Math.round(scroll.width),
		scrollRightPastCentre: Math.round(scroll.right - (chat.left + chat.width / 2)),
		chat: Math.round(chat.width),
		edge: parseFloat(getComputedStyle(document.querySelector(".wg-studio-chat")).paddingLeft),
		composer: Math.round(composer.width),
		composerGutters: gutters(composer),
		turn: Math.round(turn.width),
		turnGutters: gutters(turn),
	};
})()`;

const REMEMBER_WIDE = `localStorage.setItem(${JSON.stringify(KEPT_KEY)}, "1000"); location.hash = "kept"; location.reload(); true`;

const DOUBLE_PRESS_EDGE = `document.querySelector(".wg-studio-chat-edge").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function isLayout(value: unknown): value is Layout {
	return typeof value === "object" && value !== null && "chat" in value && "card" in value;
}

async function layoutOf(page: AskedPage): Promise<Layout> {
	const asked = await page.ask(LAYOUT_OF);
	if (!isLayout(asked)) throw new Error(`the studio drew no chat and card: ${JSON.stringify(asked)}`);
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

function isShellPageAndCardGroup(paint: unknown): boolean {
	if (typeof paint !== "object" || paint === null) {
		return false;
	}

	const { shell, page, card, group } = Object.fromEntries(Object.entries(paint));
	return shell === page && card === group && card !== shell;
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

	const { chat, edge, composer, composerGutters, turn, turnGutters, scroll, scrollRightPastCentre } =
		Object.fromEntries(Object.entries(column));
	return (
		typeof scroll === "number" &&
		scroll <= CONTENT_PX &&
		isNear(Number(scrollRightPastCentre), CONTENT_PX / 2) &&
		chat === WIDE_CHAT_PX - 2 * Number(edge) &&
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
	const drawn = await untilAnswered(page, `document.querySelector('.wg-studio-chat [aria-label$=" menu"]') !== null`);
	check("the studio drew its chat with the menu", drawn, drawn);
	await waited(300);
	writeFileSync(path.join(shotsAt, "studio-layout.png"), await page.shoot());

	const opened = await layoutOf(page);
	check("the studio opens on the canvas", opened.stage !== null, opened.stage);
	check(
		"the rail stands at the left edge, the chat right against it and the card right of the chat",
		opened.rail.left === 0 && opened.chat.left === opened.rail.right && opened.chat.right <= opened.card.left,
		{ rail: opened.rail, chat: opened.chat, card: opened.card },
	);
	check("the chat opens at its usual width", isNear(opened.chat.width, CHAT_USUAL_PX), opened.chat.width);
	check(
		"the card is rounded concentric around the kit's plate, by its plate pad",
		parseFloat(opened.radius) === parseFloat(opened.plate) + parseFloat(opened.platePad) && opened.radius !== "0px",
		{ radius: opened.radius, plate: opened.plate, platePad: opened.platePad },
	);
	check("and carries no outline: the group fill sets it apart", opened.edge.startsWith("0px"), { edge: opened.edge });
	check("the app menu stands in the chat's header", opened.menuInHead, opened.menuInHead);

	const widened = await draggedEdge(page, DRAG_PX);
	check(
		"dragging the edge widens the chat by the distance dragged, and the card gives it up",
		isNear(widened.chat.width, opened.chat.width + DRAG_PX) && isNear(widened.card.width, opened.card.width - DRAG_PX),
		{ before: opened.chat.width, after: widened.chat.width, card: widened.card.width },
	);
	check("and the width is remembered for this viewer", widened.kept === String(widened.chat.width), widened.kept);

	const widest = await draggedEdge(page, VIEW[0]);
	check(
		"a drag grows the chat with no cap until the card keeps its least width",
		widest.chat.width > CONTENT_PX &&
			isNear(widest.chat.width, widest.room - CARD_LEAST_PX) &&
			widest.kept === String(widest.room - CARD_LEAST_PX),
		{ chat: widest.chat.width, room: widest.room, kept: widest.kept },
	);

	const narrowest = await draggedEdge(page, -VIEW[0]);
	check(
		"a drag past the chat's floor stops at its least width",
		isNear(narrowest.chat.width, CHAT_LEAST_PX) && narrowest.kept === String(CHAT_LEAST_PX),
		{ chat: narrowest.chat.width, kept: narrowest.kept },
	);

	await page.ask(DOUBLE_PRESS_EDGE);
	await waited(120);
	const reset = await layoutOf(page);
	check(
		"a double press on the edge puts the usual width back",
		isNear(reset.chat.width, CHAT_USUAL_PX),
		reset.chat.width,
	);

	const bandButtons = await page.ask(BAND_BUTTONS);
	check("the band carries no catalogue button", bandButtons === 0, bandButtons);
	await draggedEdge(page, VIEW[0]);
	await page.ask(ASK_CATALOGUE);
	await untilAnswered(page, `document.querySelector(".wg-studio-sidebar") !== null`);
	await waited(120);
	const catalogueOpened = await layoutOf(page);
	check(
		"a catalogue opened beside a wide chat narrows the chat, never the card past its least width",
		catalogueOpened.side > 0 &&
			isNear(catalogueOpened.chat.width, catalogueOpened.room - catalogueOpened.side - CARD_LEAST_PX),
		{ chat: catalogueOpened.chat.width, side: catalogueOpened.side },
	);
	const besideCatalogue = await draggedEdge(page, VIEW[0]);
	const roomBesideCatalogue = besideCatalogue.room - besideCatalogue.side - CARD_LEAST_PX;
	check(
		"with the catalogue open a drag still leaves the card its least width",
		besideCatalogue.side > 0 &&
			isNear(besideCatalogue.chat.width, roomBesideCatalogue) &&
			besideCatalogue.kept === String(roomBesideCatalogue),
		{ chat: besideCatalogue.chat.width, side: besideCatalogue.side, kept: besideCatalogue.kept },
	);
	await page.ask(CLOSE_CATALOGUE);
	const catalogueClosed = await untilAnswered(page, `document.querySelector(".wg-studio-sidebar") === null`);
	check("the catalogue's own close press shuts it", catalogueClosed, catalogueClosed);
	await page.ask(DOUBLE_PRESS_EDGE);

	await page.ask(SEND_MINE);
	await untilAnswered(page, `document.querySelector(".wg-studio-ai-turn.is-mine .wg-studio-ai-said") !== null`);
	const shell = await page.ask(SHELL_PAINT);
	check(
		"the studio behind the chat is the page colour and the card the group plate",
		isShellPageAndCardGroup(shell),
		shell,
	);
	const hosted = await page.ask(`${ACCENT_PAINT_OF}(true)`);
	check(
		"inside Obsidian the studio's accent, ring and text on the accent are the host's",
		isPaintedAs(hosted, { accent: HOST_ACCENT, onAccent: HOST_ON_ACCENT, ring: HOST_ACCENT }),
		hosted,
	);
	const hostless = await page.ask(`${ACCENT_PAINT_OF}(false)`);
	check(
		"and outside Obsidian the system's own accent stays",
		!isPaintedAs(hostless, { accent: HOST_ACCENT }),
		hostless,
	);
	await draggedEdge(page, WIDE_CHAT_PX - CHAT_USUAL_PX);
	const column = await page.ask(CONTENT_COLUMN);
	check(
		"a 1400px chat keeps its list, its scrollbar and its composer in one centred 800px column",
		isCentredColumn(column),
		column,
	);
	await page.ask(DOUBLE_PRESS_EDGE);
	await waited(120);
	writeFileSync(path.join(shotsAt, "studio-layout.png"), await page.shoot());

	const staged = await untilAnswered(page, `document.querySelector("[data-canvas-stage]") !== null`);
	await waited(300);
	writeFileSync(path.join(shotsAt, "studio-layout-canvas.png"), await page.shoot());
	const canvasBefore = await layoutOf(page);
	const canvasAfter = await draggedEdge(page, CANVAS_DRAG_PX);
	check(
		"in the canvas a drag re-fits the canvas stage to the card",
		staged &&
			canvasBefore.stage !== null &&
			canvasAfter.stage !== null &&
			isNear(canvasAfter.stage, canvasBefore.stage - CANVAS_DRAG_PX) &&
			isNear(canvasAfter.stage, canvasAfter.cardInner),
		{ staged, before: canvasBefore.stage, after: canvasAfter.stage, card: canvasAfter.cardInner },
	);
	check("and the menu stays in the chat's header", canvasAfter.menuInHead, canvasAfter.menuInHead);
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
	await page.ask(REMEMBER_WIDE);
	await waited(300);
	await untilAnswered(page, `document.querySelector(".wg-studio-chat") !== null`);
	await waited(200);
	const remembered = await layoutOf(page);
	check("a remembered 1000px opens the chat at 1000px", isNear(remembered.chat.width, 1000), remembered.chat.width);
} finally {
	page.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "studio layout: clean" : `studio layout: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
