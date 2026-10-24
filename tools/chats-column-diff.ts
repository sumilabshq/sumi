import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { INSTRUMENT } from "./chats-column-instrument.ts";
import { TAILWIND_BANNER } from "./canvas-sheet.mts";
import { bundleOf } from "./harness.ts";
import { kitTooltipSheet } from "./kit-tooltip-sheet.ts";

type Theme = "light" | "dark";

interface Pair {
	readonly name: string;
	readonly board: string;
	readonly built: string;
}

interface Scene {
	readonly board: string;
	readonly before: (page: AskedPage) => Promise<void>;
	readonly boardBefore?: (page: AskedPage) => Promise<void>;
	readonly pairs: readonly Pair[];
}

const VIEW: readonly [number, number] = [1440, 900];
const BOARDS = "docs/reference/sumi-layout";
const PROPS = [
	"width",
	"height",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"margin-top",
	"margin-bottom",
	"margin-left",
	"column-gap",
	"font-size",
	"font-weight",
	"letter-spacing",
	"color",
	"background-color",
	"border-top-left-radius",
	"box-shadow",
	"opacity",
];
const PLACE = ["left", "top"];
const SLACK_PX = 0.6;
const BLOOM_MS = 600;

const bundle = await bundleOf("tools/chats-column-page.tsx");
const sheets =
	`${kitTooltipSheet()}\n` +
	[
		"packages/shared/core/browser-host.css",
		"apps/host-obsidian/styles.css",
		"design-systems/sumi/sumi.css",
		"packages/domain/workspaces/workspaces.css",
		"packages/client/shell/shell.css",
	]
		.map((at) => readFileSync(at, "utf8").split(TAILWIND_BANNER)[0])
		.join("\n");
const font = readFileSync("packages/shared/kit/assets/fonts/inter/InterVariable-latin.woff2");
const FONT_FACE = `@font-face { font-family: "Inter Variable"; src: url(/inter.woff2) format("woff2"); font-weight: 100 900; }`;
const BUILT = `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACE}</style><style>${sheets}</style>
<style>body { margin: 0; }</style></head><body><div id="root"></div><script>${INSTRUMENT}</script><script>${bundle}</script></body></html>`;

const server = http.createServer((request, response) => {
	const url = new URL(request.url ?? "/", "http://here");
	if (url.pathname === "/inter.woff2") {
		response.setHeader("content-type", "font/woff2");
		response.end(font);
		return;
	}

	const board = url.searchParams.get("board");
	response.setHeader("content-type", "text/html");
	if (board === null) {
		response.end(BUILT);
		return;
	}

	const theme = url.searchParams.get("theme") === "dark" ? "dark" : "";
	const text = readFileSync(path.join(BOARDS, `${path.basename(board)}.dc.html`), "utf8");
	response.end(text.replaceAll("{{themeCls}}", theme).replace('<script src="./support.js"></script>', ""));
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const LOOKS_OF = (pairs: readonly Pair[], side: "board" | "built"): string => `(() => {
	const props = ${JSON.stringify(PROPS)};
	const origin = document.querySelector(".sm").getBoundingClientRect();
	return Object.fromEntries(${JSON.stringify(pairs)}.map((pair) => {
		const found = document.querySelector(pair.${side});
		if (!found) return [pair.name, null];
		const style = getComputedStyle(found);
		const rect = found.getBoundingClientRect();
		const look = Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)]));
		look.left = String(Math.round((rect.left - origin.left) * 10) / 10) + "px";
		look.top = String(Math.round((rect.top - origin.top) * 10) / 10) + "px";
		look.width = String(Math.round(rect.width * 10) / 10) + "px";
		look.height = String(Math.round(rect.height * 10) / 10) + "px";
		return [pair.name, look];
	}));
})()`;

function isSame(one: string, other: string): boolean {
	if (one === other) {
		return true;
	}

	const oneNumber = Number.parseFloat(one);
	const otherNumber = Number.parseFloat(other);
	const isPx = one.endsWith("px") && other.endsWith("px");
	return isPx && Math.abs(oneNumber - otherNumber) <= SLACK_PX;
}

async function centreOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const box = await page.ask(
		`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + r.height / 2] : null; })()`,
	);
	if (!Array.isArray(box) || typeof box[0] !== "number" || typeof box[1] !== "number") {
		throw new Error(`nothing matches ${selector}`);
	}

	return [box[0], box[1]];
}

async function pressing(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await centreOf(page, selector);
	await page.press(x, y);
	await waited(BLOOM_MS);
}

async function hovering(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await centreOf(page, selector);
	await page.hover(x, y);
	await waited(700);
}

const COLUMN: readonly Pair[] = [
	{ name: "column", board: "nav.lc", built: "[data-ws-column]" },
	{ name: "top row", board: "nav.lc .ctl", built: ".wg-ws-top" },
	{ name: "filter button", board: "nav.lc .ctl .x-ib", built: ".wg-ws-top-button" },
	{ name: "filter glyph", board: "nav.lc .ctl .x-ib svg", built: ".wg-ws-top-button svg" },
	{ name: "header", board: "nav.lc .cch", built: ".wg-ws-head" },
	{ name: "workspace name", board: "nav.lc .cch .ws", built: ".wg-ws-name" },
	{ name: "name chevron", board: "nav.lc .cch .ws svg", built: ".wg-ws-name svg" },
	{ name: "new chat", board: "nav.lc .x-row.newc", built: "[data-ws-new-chat]" },
	{ name: "new chat glyph", board: "nav.lc .x-row.newc svg", built: "[data-ws-new-chat] svg" },
	{ name: "pinned head", board: "nav.lc .sh", built: '[data-ws-section="Pinned"] .wg-ws-section-head' },
	{ name: "pinned label", board: "nav.lc .sh .lab", built: '[data-ws-section="Pinned"] .wg-ws-section-label' },
	{ name: "selected row", board: "nav.lc .x-row.lift", built: ".wg-ws-row.is-active" },
	{ name: "selected title", board: "nav.lc .x-row.lift .t", built: ".wg-ws-row.is-active .wg-ws-row-title" },
	{ name: "unread row", board: "nav.lc .sh ~ .x-row:has(.bdot)", built: '[data-ws-chat="checks"]' },
	{ name: "unread dot", board: "nav.lc .bdot", built: ".wg-ws-unread" },
	{ name: "spinner", board: "nav.lc .spin", built: ".wg-ws-spin" },
	{
		name: "routines",
		board: "nav.lc .tabs > .x-row:nth-last-child(2)",
		built: ".wg-ws-foot .wg-ws-line-row:first-child",
	},
	{ name: "settings", board: "nav.lc .tabs > .x-row:last-child", built: ".wg-ws-foot .wg-ws-line-row:last-child" },
	{ name: "strip", board: "nav.lc .wsbar", built: "[data-ws-strip]" },
	{ name: "strip current", board: "nav.lc .wsi.on", built: '[data-ws-strip-id="default"]' },
	{ name: "strip current glyph", board: "nav.lc .wsi.on svg", built: '[data-ws-strip-id="default"] svg' },
	{ name: "strip rest", board: 'nav.lc .wsi[aria-label="Urcraft"]', built: '[data-ws-strip-id="urcraft"]' },
	{
		name: "strip emoji",
		board: 'nav.lc .wsi[aria-label="Widgetarium"] span',
		built: '[data-ws-strip-id="widgetarium"] .wg-ws-emoji',
	},
	{ name: "strip dot", board: "nav.lc .wsi .dot", built: ".wg-ws-strip .wg-ws-dot" },
	{ name: "strip new", board: 'nav.lc .wsi[aria-label="New workspace"]', built: ".wg-ws-strip-icon.is-new" },
];

const HOVER: readonly Pair[] = [
	{ name: "hovered section head", board: "nav.lc .sh.hov", built: '[data-ws-section="Pinned"] .wg-ws-section-head' },
	{ name: "hovered fold", board: "nav.lc .sh.hov .x-ib.fold", built: '[data-ws-section="Pinned"] .wg-ws-section-fold' },
	{
		name: "hovered settings",
		board: "nav.lc .sh.hov .acts .x-ib",
		built: '[data-ws-section="Pinned"] .wg-ws-section-act',
	},
];

const ROW_HOVER: readonly Pair[] = [
	{ name: "hovered row", board: "nav.lc .x-row.hov", built: '[data-ws-chat="deepl"]' },
	{ name: "hovered more", board: "nav.lc .x-row.hov .cx.mo", built: '[data-ws-chat="deepl"] .wg-ws-row-more' },
];

const MENU: readonly Pair[] = [
	{ name: "menu", board: ".menu.x-pop", built: ".wg-kit-pop:has([data-ws-menu])" },
	{ name: "menu current", board: ".menu .mi.on", built: "[data-ws-menu] .wg-kit-pop-item[data-state=checked]" },
	{
		name: "menu glyph",
		board: ".menu .mi.on .hic",
		built: "[data-ws-menu] .wg-kit-pop-item[data-state=checked] .wg-ws-item-glyph",
	},
	{ name: "menu key", board: ".menu .mi .k", built: "[data-ws-menu] .wg-ws-item-key" },
	{ name: "menu line", board: ".menu .msep", built: "[data-ws-menu] .wg-kit-pop-sep" },
	{ name: "menu name and icon", board: ".menu .msep + .mi", built: "[data-ws-item=look]" },
	{ name: "menu item glyph", board: ".menu .msep + .mi svg", built: "[data-ws-item=look] svg" },
];

const LOOK: readonly Pair[] = [
	{ name: "picker", board: ".pick.x-pop", built: ".wg-kit-pop:has([data-ws-look])" },
	{ name: "picker now", board: ".pick .nmrow .cur", built: ".wg-ws-pick-now" },
	{ name: "picker name", board: ".pick .nmrow label", built: ".wg-ws-pick-name" },
	{ name: "picker tab on", board: ".pick .tabsw button.on", built: '.wg-ws-pick-tab[aria-selected="true"]' },
	{
		name: "picker tab off",
		board: ".pick .tabsw button:not(.on):not(.rm)",
		built: '.wg-ws-pick-tab[aria-selected="false"]',
	},
	{ name: "remove icon", board: ".pick .tabsw .rm", built: ".wg-ws-pick-remove" },
	{ name: "search", board: ".pick .q", built: ".wg-ws-pick-search" },
	{ name: "grid", board: ".pick .gr", built: ".wg-ws-pick-grid" },
	{ name: "cell on", board: ".pick .gr button.on", built: '.wg-ws-pick-cell[aria-selected="true"]' },
	{ name: "cell", board: ".pick .gr button:not(.on)", built: '.wg-ws-pick-cell[aria-selected="false"]' },
];

const TIP: readonly Pair[] = [
	{ name: "strip tip", board: ".wtip", built: "[data-tip-face]" },
	{ name: "tip key", board: ".wtip .x-kbd", built: ".wg-kit-tooltip-key" },
];

const SCENES: readonly Scene[] = [
	{ board: "Fx-inter-chat", before: async () => undefined, pairs: COLUMN },
	{
		board: "Lc-hover",
		before: (page) => hovering(page, '[data-ws-section="Pinned"] .wg-ws-section-head'),
		pairs: HOVER,
	},
	{ board: "Fx-inter-chat", before: (page) => hovering(page, '[data-ws-chat="deepl"]'), pairs: ROW_HOVER },
	{ board: "Ws-menu", before: (page) => pressing(page, "[data-ws-name]"), pairs: MENU },
	{
		board: "Ws-pick-emoji",
		before: async (page) => {
			await page.ask(`window.__chats.parts.workspacesStore.finishOpening("widgetarium"); true`);
			await pressing(page, "[data-ws-name]");
			await pressing(page, "[data-ws-item=look]");
		},
		pairs: LOOK,
	},
	{ board: "Ws-strip", before: (page) => hovering(page, '[data-ws-strip-id="urcraft"]'), pairs: TIP },
];

function differencesOf(
	name: string,
	board: Record<string, string> | null,
	built: Record<string, string> | null,
): string[] {
	if (board === null || built === null) {
		return [`${name}: ${board === null ? "not on the board" : "not built"}`];
	}

	return [...PROPS, ...PLACE].flatMap((prop) => {
		const boardValue = board[prop] ?? "";
		const builtValue = built[prop] ?? "";
		return isSame(boardValue, builtValue) ? [] : [`${name} ${prop}: board ${boardValue} · built ${builtValue}`];
	});
}

function looksIn(held: unknown): Record<string, Record<string, string> | null> {
	return typeof held === "object" && held !== null ? (held as Record<string, Record<string, string> | null>) : {};
}

async function sceneDifferences(scene: Scene, theme: Theme): Promise<string[]> {
	const boardPage = await paged(`${origin}?board=${scene.board}&theme=${theme}`, "chats diff board", { size: VIEW });
	const builtPage = await paged(`${origin}?theme=${theme}`, "chats diff built", { size: VIEW });
	try {
		await waited(900);
		await scene.before(builtPage);
		const boardLooks = looksIn(await boardPage.ask(LOOKS_OF(scene.pairs, "board")));
		const builtLooks = looksIn(await builtPage.ask(LOOKS_OF(scene.pairs, "built")));
		return scene.pairs.flatMap((pair) =>
			differencesOf(pair.name, boardLooks[pair.name] ?? null, builtLooks[pair.name] ?? null),
		);
	} finally {
		boardPage.close();
		builtPage.close();
	}
}

let total = 0;
for (const theme of ["light", "dark"] as const) {
	for (const scene of SCENES) {
		const found = await sceneDifferences(scene, theme);
		total += found.length;
		console.log(`\n${theme} · ${scene.board}: ${found.length === 0 ? "no difference" : `${found.length} differences`}`);
		for (const line of found) {
			console.log(`  ${line}`);
		}
	}
}

server.close();
console.log(`\nchats column against the boards: ${total} differences`);
