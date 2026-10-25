import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { INSTRUMENT } from "./chats-column-instrument.ts";
import { TAILWIND_BANNER } from "./canvas-sheet.mts";
import { bundleOf } from "./harness.ts";
import { kitTooltipSheet } from "./kit-tooltip-sheet.ts";

interface Timed {
	readonly ms: number;
	readonly frames: number;
	readonly isShown: boolean;
}

interface TimedRow {
	readonly action: string;
	readonly ms: number;
	readonly commits: number;
	readonly renders: Readonly<Record<string, number>>;
}

const VIEW: readonly [number, number] = [1440, 900];
const MOST_MS = 100;
const BLOOM_MS = 500;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-chats-column"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/chats-column-page.tsx");
const sheets =
	`${kitTooltipSheet()}\n` +
	[
		"packages/shared/core/browser-host.css",
		"apps/host-obsidian/styles.css",
		"design-systems/sumi/sumi.css",
		"apps/studio/src/features/workspaces/workspaces.css",
		"apps/studio/src/features/frame/shell.css",
	]
		.map((at) => readFileSync(at, "utf8").split(TAILWIND_BANNER)[0])
		.join("\n");
const font = readFileSync("packages/shared/kit/assets/fonts/inter/InterVariable-latin.woff2");
const FONT_FACE = `@font-face { font-family: "Inter Variable"; src: url(/inter.woff2) format("woff2"); font-weight: 100 900; }`;
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACE}</style><style>${sheets}</style>
<style>body { margin: 0; }</style></head><body><div id="root"></div><pre id="boom"></pre>
<script>${INSTRUMENT}</script><script>${bundle}</script></body></html>`;

let checks = 0;
let failed = 0;
const timings: TimedRow[] = [];

function check(what: string, isOk: boolean, got: unknown): void {
	checks += 1;
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const server = http.createServer((request, response) => {
	if (request.url === "/inter.woff2") {
		response.setHeader("content-type", "font/woff2");
		response.end(font);
		return;
	}

	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

async function centreOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const box = await page.ask(`(() => {
		const found = document.querySelector(${JSON.stringify(selector)});
		if (!found) return null;
		const rect = found.getBoundingClientRect();
		return [rect.left + rect.width / 2, rect.top + rect.height / 2];
	})()`);
	if (!Array.isArray(box) || typeof box[0] !== "number" || typeof box[1] !== "number") {
		throw new Error(`nothing on the page matches ${selector}`);
	}

	return [box[0], box[1]];
}

async function untilTrue(page: AskedPage, expression: string): Promise<boolean> {
	for (let tries = 0; tries < 60; tries += 1) {
		if ((await page.ask(expression)) === true) {
			return true;
		}

		await waited(25);
	}

	return false;
}

async function timed(
	page: AskedPage,
	action: string,
	event: string,
	shown: string,
	act: () => Promise<unknown>,
): Promise<Timed> {
	await page.ask(
		`window.__renders = {}; window.__chats.commits.count = 0; window.__timed = window.__paintWhen(${JSON.stringify(event)}, () => ${shown}); true`,
	);
	await act();
	const answer = await page.ask("window.__timed");
	await waited(150);
	const commits = Number(await page.ask("window.__chats.commits.count"));
	const renders = await page.ask("window.__renders");
	const timedAnswer = isTimed(answer) ? answer : { ms: -1, frames: 0, isShown: false };
	timings.push({
		action,
		ms: timedAnswer.ms,
		commits,
		renders: typeof renders === "object" && renders !== null ? Object.fromEntries(Object.entries(renders)) : {},
	});
	check(
		`${action}: painted in ${timedAnswer.ms}ms, under ${MOST_MS}ms`,
		timedAnswer.isShown && timedAnswer.ms >= 0 && timedAnswer.ms < MOST_MS,
		timedAnswer,
	);
	return timedAnswer;
}

function isTimed(held: unknown): held is Timed {
	return typeof held === "object" && held !== null && "ms" in held && "isShown" in held;
}

async function pressing(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await centreOf(page, selector);
	await page.press(x, y);
}

function typed(selector: string, text: string): string {
	return `(() => {
		const field = document.querySelector(${JSON.stringify(selector)});
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(field, ${JSON.stringify(text)});
		field.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	})()`;
}

function keyed(target: string, init: Readonly<Record<string, unknown>>): string {
	return `(() => { ${target}.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...${JSON.stringify(init)} })); return true; })()`;
}

const TEXT_OF = (selector: string): string =>
	`(document.querySelector(${JSON.stringify(selector)})?.textContent ?? null)`;

const ROW_TITLES = `[...document.querySelectorAll("[data-ws-section]")].map((section) => [section.dataset.wsSection, [...section.querySelectorAll("[data-ws-chat]")].map((row) => row.querySelector(".wg-ws-row-title, input")?.textContent || row.querySelector("input")?.value)])`;

async function boardPage(query: string): Promise<AskedPage> {
	const page = await paged(`${origin}?${query}`, "chats column", { size: VIEW });
	await untilTrue(page, `document.querySelector("[data-ws-column]") !== null && document.fonts.status === "loaded"`);
	await waited(150);
	return page;
}

async function chatChecks(page: AskedPage): Promise<void> {
	check("the board's sections and rows are drawn", true, await page.ask(ROW_TITLES));
	check(
		"marks: unread dot on a chat that finished unseen, spinner on a running one",
		(await page.ask(
			`[document.querySelector('[data-ws-chat="checks"] .wg-ws-unread') !== null, document.querySelector('[data-ws-chat="deepl"] .wg-ws-spin') !== null]`,
		)) !== null,
		await page.ask(
			`[document.querySelector('[data-ws-chat="checks"] .wg-ws-unread') !== null, document.querySelector('[data-ws-chat="deepl"] .wg-ws-spin') !== null]`,
		),
	);
	await timed(
		page,
		"select a chat",
		"pointerdown",
		`document.querySelector('[data-ws-chat="checks"]')?.classList.contains("is-active")`,
		() => pressing(page, '[data-ws-chat="checks"] .wg-ws-row-pick'),
	);
	const selected = [
		await page.ask(TEXT_OF("[data-ws-crumb]")),
		await page.ask(`document.querySelector('[data-ws-chat="checks"] .wg-ws-unread') === null`),
	];
	check(
		"selecting reads its title into the crumb and clears its unread dot",
		JSON.stringify(selected) === JSON.stringify(["Default/Translator 1.0 checks", true]),
		selected,
	);
	await timed(
		page,
		"new chat",
		"pointerdown",
		`document.querySelector('[data-ws-section="Recents"] [data-ws-chat]')?.textContent.startsWith("New chat") && document.querySelector('[data-ws-section="Recents"] [data-ws-chat]')?.classList.contains("is-active")`,
		() => pressing(page, "[data-ws-new-chat]"),
	);
	check(
		"new chat is selected at once, first in Recents, titled New chat",
		(await page.ask(TEXT_OF("[data-ws-crumb]"))) === "Default/New chat",
		await page.ask(TEXT_OF("[data-ws-crumb]")),
	);
}

async function pinAndRename(page: AskedPage): Promise<void> {
	await page.ask(
		`(() => { const row = document.querySelector('[data-ws-chat="notes"]'); const box = row.getBoundingClientRect(); row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: box.left + 40, clientY: box.top + 10 })); return true; })()`,
	);
	const hasMenu = await untilTrue(page, `document.querySelector('[data-ws-chat-menu="notes"]') !== null`);
	await waited(BLOOM_MS);
	check("a right press on a row opens Pin and Rename", hasMenu, await page.ask(TEXT_OF('[data-ws-chat-menu="notes"]')));
	await timed(
		page,
		"pin a chat",
		"pointerdown",
		`document.querySelector('[data-ws-section="Pinned"] [data-ws-chat="notes"]') !== null`,
		async () => {
			const [x, y] = await centreOf(page, '[data-ws-chat-menu="notes"] .wg-kit-pop-item:first-child');
			await page.press(x, y);
		},
	);
	await page.ask(
		`(() => { const row = document.querySelector('[data-ws-chat="notes"]'); const box = row.getBoundingClientRect(); row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: box.left + 40, clientY: box.top + 10 })); return true; })()`,
	);
	await untilTrue(page, `document.querySelector('[data-ws-chat-menu="notes"]') !== null`);
	await waited(BLOOM_MS);
	check(
		"a pinned chat offers Unpin",
		(await page.ask(TEXT_OF('[data-ws-chat-menu="notes"]'))) === "UnpinRename",
		await page.ask(TEXT_OF('[data-ws-chat-menu="notes"]')),
	);
	await pressing(page, '[data-ws-chat-menu="notes"] .wg-kit-pop-item:last-child');
	await untilTrue(page, `document.querySelector('[data-ws-chat="notes"] input') !== null`);
	await page.ask(typed('[data-ws-chat="notes"] input', "Release notes"));
	await page.ask(keyed(`document.querySelector('[data-ws-chat="notes"] input')`, { key: "Enter" }));
	const isRenamed = await untilTrue(page, `${TEXT_OF('[data-ws-chat="notes"] .wg-ws-row-title')} === "Release notes"`);
	check(
		"Rename turns the row into a field and Enter keeps the title",
		isRenamed,
		await page.ask(TEXT_OF('[data-ws-chat="notes"]')),
	);
}

async function headerMenu(page: AskedPage): Promise<void> {
	await pressing(page, "[data-test-plate] [aria-haspopup=menu]");
	const hasMenu = await untilTrue(page, `document.querySelector("[data-ws-chat-menu]") !== null`);
	await waited(BLOOM_MS);
	check(
		"the chat header's more opens only Pin and Rename for the active chat",
		hasMenu && /^(Un)?pinRename$/i.test(String(await page.ask(TEXT_OF("[data-ws-chat-menu]")))),
		await page.ask(TEXT_OF("[data-ws-chat-menu]")),
	);
	check(
		"the chat header's menu opens below its more button, not at the press",
		(await page.ask(
			`(() => { const menu = document.querySelector("[data-ws-chat-menu]").closest(".wg-kit-pop")?.getBoundingClientRect() ?? document.querySelector("[data-ws-chat-menu]").getBoundingClientRect(); const more = document.querySelector("[data-test-plate] [aria-haspopup=menu]").getBoundingClientRect(); return menu.top >= more.bottom && menu.left < more.right && menu.right > more.left; })()`,
		)) === true,
		await page.ask(
			`[document.querySelector("[data-ws-chat-menu]").getBoundingClientRect().toJSON(), document.querySelector("[data-test-plate] [aria-haspopup=menu]").getBoundingClientRect().toJSON()]`,
		),
	);
	check(
		"the chat header's menu opens in the portal layer, above the plate",
		(await page.ask(`document.querySelector("[data-ws-chat-menu]").closest("[data-test-plate]") === null`)) === true,
		await page.ask(`document.querySelector("[data-ws-chat-menu]").parentElement?.className`),
	);
	await pressing(page, "[data-ws-chat-menu] .wg-kit-pop-item:last-child");
	await untilTrue(page, `document.querySelector("[data-ws-crumb] input") !== null`);
	await page.ask(typed("[data-ws-crumb] input", "Header title"));
	await page.ask(keyed(`document.querySelector("[data-ws-crumb] input")`, { key: "Enter" }));
	const isRenamed = await untilTrue(page, `${TEXT_OF("[data-ws-crumb]")}?.endsWith("/Header title")`);
	check(
		"Rename from the header turns the chat name into a field and Enter keeps it",
		isRenamed,
		await page.ask(TEXT_OF("[data-ws-crumb]")),
	);
}

async function sectionHover(page: AskedPage): Promise<void> {
	const [x, y] = await centreOf(page, '[data-ws-section="Recents"] .wg-ws-section-head');
	await page.hover(x, y);
	await waited(400);
	const look = await page.ask(`(() => {
		const head = document.querySelector('[data-ws-section="Recents"] .wg-ws-section-head');
		const fold = head.querySelector(".wg-ws-section-fold");
		const acts = head.querySelector(".wg-ws-section-acts");
		return { fold: [getComputedStyle(fold).width, getComputedStyle(fold).opacity], acts: getComputedStyle(acts).opacity, pad: getComputedStyle(head).paddingLeft, fill: getComputedStyle(head).backgroundColor };
	})()`);
	check(
		"section hover: the chevron slides in, the controls appear, the label moves 2px",
		JSON.stringify(look) ===
			JSON.stringify({ fold: ["12px", "1"], acts: "1", pad: "10px", fill: "rgba(0, 0, 0, 0.035)" }),
		look,
	);
	writeFileSync(path.join(shotsAt, "chats-section-hover.png"), await page.shoot());
	await page.hover(700, 450);
}

async function workspaceChecks(page: AskedPage): Promise<void> {
	await timed(page, "open the workspace menu", "pointerdown", `document.querySelector("[data-ws-menu]") !== null`, () =>
		pressing(page, "[data-ws-name]"),
	);
	const items = await page.ask(
		`[...document.querySelectorAll("[data-ws-menu] .wg-kit-pop-item")].map((item) => [...item.childNodes].filter((part) => !part.classList?.contains("wg-ws-item-glyph")).map((part) => part.textContent).join(""))`,
	);
	check(
		"the menu lists every workspace with ⌘1…⌘6, then Name and icon… and New workspace, and no settings",
		JSON.stringify(items) ===
			JSON.stringify([
				"Default⌘1",
				"Widgetarium⌘2",
				"Urcraft⌘3",
				"Personal⌘4",
				"Travel⌘5",
				"Reading⌘6",
				"Name and icon…",
				"New workspace",
			]),
		items,
	);
	await waited(BLOOM_MS);
	writeFileSync(path.join(shotsAt, "chats-workspace-menu.png"), await page.shoot());
	await timed(
		page,
		"open Name and icon",
		"pointerdown",
		`document.querySelector("[data-ws-look]") !== null`,
		async () => {
			const [x, y] = await centreOf(page, "[data-ws-item=look]");
			await page.press(x, y);
		},
	);
	await waited(BLOOM_MS);
	writeFileSync(path.join(shotsAt, "chats-name-and-icon.png"), await page.shoot());
	const sameFrame = `${TEXT_OF(".wg-ws-name-text")} === "Home base" && document.querySelector('[data-ws-strip-id="default"]')?.getAttribute("aria-label") === "Home base" && ${TEXT_OF("[data-ws-crumb]")}?.startsWith("Home base/")`;
	await timed(page, "rename a workspace", "input", sameFrame, () =>
		page.ask(typed('[data-ws-look] input[type="text"]', "Home base")),
	);
	await timed(
		page,
		"remove its icon",
		"pointerdown",
		`document.querySelector('[data-ws-strip-id="default"] .wg-ws-dot') !== null && document.querySelector(".wg-ws-pick-now .wg-ws-dot") !== null`,
		() => pressing(page, ".wg-ws-pick-remove"),
	);
	await pressing(page, ".wg-ws-pick-tab:nth-child(2)");
	await untilTrue(page, `document.querySelector(".wg-ws-pick-grid.is-emoji") !== null`);
	await timed(page, "pick an emoji", "pointerdown", `${TEXT_OF('[data-ws-strip-id="default"]')} === "🚀"`, () =>
		pressing(page, '.wg-ws-pick-cell[aria-label="rocket launch"]'),
	);
	await page.ask(typed('[data-ws-look] input[type="search"]', "plane"));
	check(
		"search narrows the grid",
		(await page.ask(`document.querySelectorAll(".wg-ws-pick-cell").length`)) === 1,
		await page.ask(`document.querySelectorAll(".wg-ws-pick-cell").length`),
	);
	await page.ask(keyed("document.activeElement", { key: "Escape" }));
	await untilTrue(page, `document.querySelector("[data-ws-look]") === null`);
	const [x, y] = await centreOf(page, '[data-ws-strip-id="urcraft"]');
	await page.hover(x, y);
	await untilTrue(page, `document.querySelector("[data-tip-bubble]")?.dataset.phase === "open"`);
	await waited(200);
	check(
		"hovering the strip names the workspace with its key",
		(await page.ask(TEXT_OF("[data-tip-face]"))) === "Urcraft⌘3",
		await page.ask(TEXT_OF("[data-tip-face]")),
	);
	writeFileSync(path.join(shotsAt, "chats-strip-tip.png"), await page.shoot());
	await timed(
		page,
		"switch workspace from the strip",
		"pointerdown",
		`document.querySelector('[data-ws-strip-id="urcraft"]')?.getAttribute("aria-current") === "true"`,
		() => page.press(x, y),
	);
	await timed(
		page,
		"switch workspace with ⌘2",
		"keydown",
		`document.querySelector('[data-ws-strip-id="widgetarium"]')?.getAttribute("aria-current") === "true"`,
		() => page.ask(keyed("window", { key: "2", code: "Digit2", metaKey: true })),
	);
	await pressing(page, "[data-ws-name]");
	await untilTrue(page, `document.querySelector("[data-ws-menu]") !== null`);
	await waited(BLOOM_MS);
	await timed(page, "new workspace", "pointerdown", `${TEXT_OF(".wg-ws-name-text")} === "Untitled 1"`, async () => {
		const [nx, ny] = await centreOf(page, "[data-ws-item=new]");
		await page.press(nx, ny);
	});
	check(
		"the new workspace is last in the strip and current",
		true,
		await page.ask(
			`[...document.querySelectorAll("[data-ws-strip-id]")].map((icon) => icon.getAttribute("aria-label") + (icon.getAttribute("aria-current") ? "*" : ""))`,
		),
	);
}

async function stripShapes(): Promise<void> {
	const one = await boardPage("one");
	try {
		check(
			"one workspace: no strip",
			(await one.ask(`document.querySelector("[data-ws-strip]") === null`)) === true,
			await one.ask(`document.querySelector("[data-ws-strip]") === null`),
		);
		writeFileSync(path.join(shotsAt, "chats-one-workspace.png"), await one.shoot());
	} finally {
		one.close();
	}

	const many = await boardPage("many");
	try {
		const strip = await many.ask(`(() => {
			const scroll = document.querySelector(".wg-ws-strip-scroll");
			const plus = document.querySelector(".wg-ws-strip-icon.is-new");
			return { overflows: scroll.scrollWidth > scroll.clientWidth, fadesEnd: scroll.dataset.fadesEnd, plusOutside: !scroll.contains(plus), plusRight: plus.getBoundingClientRect().right <= document.querySelector("[data-ws-column]").getBoundingClientRect().right, scrollbar: scroll.offsetHeight - scroll.clientHeight };
		})()`);
		check(
			"many workspaces: the icons scroll sideways with no bar, the end fades, + stays outside on the right",
			JSON.stringify(strip) ===
				JSON.stringify({ overflows: true, fadesEnd: "true", plusOutside: true, plusRight: true, scrollbar: 0 }),
			strip,
		);
		writeFileSync(path.join(shotsAt, "chats-many-workspaces.png"), await many.shoot());
	} finally {
		many.close();
	}
}

const IDS_IN = (section: string): string =>
	`[...document.querySelectorAll('[data-ws-section="${section}"] [data-ws-chat]')].map((row) => row.dataset.wsChat)`;
const CARRY_TAKEN = `(() => { window.__chatCarried = []; document.addEventListener("wg-carry", (event) => { window.__chatCarried.push(event.detail.phase); event.detail.isTaken = event.detail.x > 300; }); return true; })()`;

async function chatDragged(
	page: AskedPage,
	from: string,
	to: (rect: { readonly top: number; readonly bottom: number; readonly x: number }) => readonly [number, number],
	target: string,
): Promise<{ readonly ghost: unknown; readonly line: unknown }> {
	const [x, y] = await centreOf(page, from);
	await page.hover(x, y);
	const drag = await page.lift({ from: [x, y], to: [x, y + 8], steps: 4, stepMs: 16 });
	await waited(60);
	const rect = (await page.ask(
		`(() => { const box = document.querySelector('${target}').getBoundingClientRect(); return { top: box.top, bottom: box.bottom, x: box.left + box.width / 2 }; })()`,
	)) as { top: number; bottom: number; x: number };
	const at = to(rect);
	await drag.over(at);
	await waited(60);
	const ghost = await page.ask(`document.querySelector("[data-drag-ghost]") !== null`);
	const line = await page.ask(`document.querySelector(".wg-ws-drop-line:not([hidden])") !== null`);
	await drag.drop(at);
	await waited(250);
	return { ghost, line };
}

async function dragChecks(page: AskedPage): Promise<void> {
	const pinnedFirst = JSON.stringify(await page.ask(IDS_IN("Pinned")));
	check("the board opens with Weekly and Release pinned", pinnedFirst === '["weekly","release"]', pinnedFirst);
	const intoPinned = await chatDragged(
		page,
		'[data-ws-chat="brief"]',
		({ top, x }) => [x, top + 4],
		'[data-ws-chat="release"]',
	);
	check(
		"a held chat shows a ghost and a drop line over Pinned",
		intoPinned.ghost === true && intoPinned.line === true,
		intoPinned,
	);
	const afterPin = JSON.stringify(await page.ask(IDS_IN("Pinned")));
	check(
		"a recent chat dropped above a pinned one is pinned there",
		afterPin === '["weekly","brief","release"]',
		afterPin,
	);
	await chatDragged(page, '[data-ws-chat="weekly"]', ({ bottom, x }) => [x, bottom - 3], '[data-ws-chat="release"]');
	const reordered = JSON.stringify(await page.ask(IDS_IN("Pinned")));
	check(
		"a pinned chat dropped below the last one moves to the end",
		reordered === '["brief","release","weekly"]',
		reordered,
	);
	await chatDragged(
		page,
		'[data-ws-chat="release"]',
		({ top, bottom, x }) => [x, (top + bottom) / 2],
		'[data-ws-chat="deepl"]',
	);
	const unpinned = [await page.ask(IDS_IN("Pinned")), await page.ask(IDS_IN("Recents"))];
	check(
		"a pinned chat dropped into Recents is unpinned",
		JSON.stringify(unpinned[0]) === '["brief","weekly"]' && JSON.stringify(unpinned[1]).includes('"release"'),
		unpinned,
	);
	check(
		"a drop leaves no ghost, no line and no lifted row",
		(await page.ask(
			`document.querySelector("[data-drag-ghost]") === null && document.querySelector(".wg-ws-drop-line") === null && document.querySelector("[data-ws-lifted]") === null`,
		)) === true,
		null,
	);
	for (const id of ["brief", "weekly"]) {
		await chatDragged(
			page,
			`[data-ws-chat="${id}"]`,
			({ top, bottom, x }) => [x, (top + bottom) / 2],
			'[data-ws-chat="notes"]',
		);
	}

	check(
		"with every chat unpinned, Pinned is gone",
		(await page.ask(`document.querySelector('[data-ws-section="Pinned"]') === null`)) === true,
		await page.ask(IDS_IN("Pinned")),
	);
	await chatDragged(page, '[data-ws-chat="checks"]', ({ top, x }) => [x, top + 12], '[data-ws-section="Pinned"]');
	const firstPinned = JSON.stringify(await page.ask(IDS_IN("Pinned")));
	check("a held chat opens an empty Pinned to drop into", firstPinned === '["checks"]', firstPinned);
	await page.ask(CARRY_TAKEN);
	await chatDragged(page, '[data-ws-chat="deepl"]', () => [800, 400], "[data-test-plate]");
	const carried = String(await page.ask(`window.__chatCarried.join(" ")`));
	check(
		"a chat carried onto a pane is offered to it and, taken, becomes the active chat",
		carried.startsWith("over") &&
			carried.endsWith("drop") &&
			(await page.ask(`document.querySelector('[data-ws-chat="deepl"]')?.classList.contains("is-active")`)) === true,
		carried,
	);
}

const dragging = await boardPage("theme=light");
try {
	await dragChecks(dragging);
	writeFileSync(path.join(shotsAt, "chats-after-drag.png"), await dragging.shoot());
} finally {
	dragging.close();
}

const light = await boardPage("theme=light");
try {
	writeFileSync(path.join(shotsAt, "chats-light.png"), await light.shoot());
	await chatChecks(light);
	await pinAndRename(light);
	await headerMenu(light);
	await sectionHover(light);
	await workspaceChecks(light);
} finally {
	light.close();
}

const dark = await boardPage("theme=dark");
try {
	writeFileSync(path.join(shotsAt, "chats-dark.png"), await dark.shoot());
} finally {
	dark.close();
}

await stripShapes();
server.close();

console.log("\naction | ms to paint | commits | rows re-rendered");
for (const row of timings) {
	console.log(`${row.action} | ${row.ms} | ${row.commits} | ${JSON.stringify(row.renders)}`);
}

console.log(
	`\nchats column: ${failed === 0 ? "clean" : "BLOCKED"} — ${checks - failed}/${checks} checks, shots in ${shotsAt}`,
);
process.exit(failed === 0 ? 0 : 1);
