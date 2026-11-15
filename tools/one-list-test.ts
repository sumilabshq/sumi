import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [1440, 900];
const GATE = "test:one-list";
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-one-list"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/shell-frame-page.tsx");
const sheets = BROWSER_SHEET_SOURCES.map((at) => readFileSync(at, "utf8")).join("\n");

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function pageFileOf(theme: Theme, search: string): string {
	const html = `<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();history.replaceState(null, "", "${search}");</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const file = path.join(shotsAt, `one-list-${theme}-${search.replace(/\W/g, "")}.html`);
	writeFileSync(file, html);
	return file;
}

const DRAWN = `new Promise((done) => {
	const seen = () => {
		if (document.querySelector('[data-ws-column] [data-tabs-chat="release"]')) {
			done(true);
			return;
		}
		requestAnimationFrame(seen);
	};
	seen();
	setTimeout(() => done("never drawn: " + document.getElementById("boom").textContent), 15000);
})`;

const titleOf = (id: string): string =>
	`document.querySelector('[data-tabs-chat="${id}"] [data-tabs-words]')?.textContent ?? null`;

const listOfRow = (id: string): string =>
	`document.querySelector('[data-tabs-id="${id}"]')?.closest("[data-tabs-list]")?.dataset.tabsList ?? null`;

const centreOf = (selector: string): string => `(() => {
	const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
	return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
})()`;

const lowerHalfOf = (selector: string): string => `(() => {
	const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
	return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height * 0.8)];
})()`;

const PLACED = (id: string): string => `window.__PLACES__.placedTabs().then((placed) => {
	const tab = placed.tabs.find((one) => one.id === "${id}");
	const closed = placed.closed.find((one) => one.tab.id === "${id}");
	return { isOpen: tab !== undefined, isClosed: closed !== undefined };
})`;

const RECORD_KEPT = (id: string): string =>
	`window.__WORKSPACES__.chats.chats().chats.some((chat) => chat.id === "${id}")`;

const MENU_ITEMS = `[...document.querySelectorAll("[data-tabs-pointer-menu] [data-tabs-menu-item]")].map((item) => [item.dataset.tabsMenuItem, item.hasAttribute("data-disabled")])`;

const contextMenuAt = (selector: string): string => `(() => {
	const row = document.querySelector(${JSON.stringify(selector)});
	const box = row.getBoundingClientRect();
	row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + 20, clientY: box.top + box.height / 2 }));
	return true;
})()`;

const ESCAPE = `document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`;

const REOPEN = `(() => {
	const column = document.querySelector("[data-ws-column]");
	column.dispatchEvent(new KeyboardEvent("keydown", { key: "t", metaKey: true, shiftKey: true, bubbles: true, cancelable: true }));
	return true;
})()`;

const PointSchema = z.tuple([z.number(), z.number()]);

async function pointOf(page: AskedPage, expression: string): Promise<PagePoint> {
	return PointSchema.parse(await page.ask(expression));
}

async function opened(theme: Theme, search: string): Promise<AskedPage> {
	const page = await paged(pageFileOf(theme, search), GATE, { size: VIEW });
	const drawn = await page.ask(DRAWN);

	if (drawn !== true) {
		page.close();
		throw new Error(String(drawn));
	}

	await waited(400);
	return page;
}

async function checksPendingRecords(): Promise<void> {
	const page = await opened("light", "?seeded&records-pending");
	try {
		const titles = await Promise.all(["release", "checks", "deepl"].map((id) => page.ask(titleOf(id))));
		check(
			"chats stand in the sidebar with their titles before any chat record is read",
			JSON.stringify(titles) === JSON.stringify(["Release plan", "Translator 1.0 checks", "Fix DeepL key lookup"]),
			titles,
		);
	} finally {
		page.close();
	}
}

async function checksChatMenu(page: AskedPage): Promise<void> {
	await page.ask(contextMenuAt('[data-tabs-chat="deepl"]'));
	await waited(250);
	const items = z.array(z.tuple([z.string(), z.boolean()])).parse(await page.ask(MENU_ITEMS));
	await page.ask(ESCAPE);
	await waited(250);
	const isOn = (label: string): boolean => items.some(([item, isDisabled]) => item === label && !isDisabled);
	check("Close and Add to Essentials are enabled on a chat", isOn("Close") && isOn("Add to Essentials"), items);
}

async function checksChatOntoChat(page: AskedPage): Promise<void> {
	const was = await page.ask(listOfRow("deepl"));
	const held = await page.lift({
		from: await pointOf(page, centreOf('[data-tabs-chat="deepl"]')),
		to: await pointOf(page, lowerHalfOf('[data-tabs-chat="release"]')),
		steps: 16,
		stepMs: 16,
	});
	await waited(260);
	await held.drop(await pointOf(page, lowerHalfOf('[data-tabs-chat="release"]')));
	await waited(500);
	const now = await page.ask(listOfRow("deepl"));
	check("a chat dropped onto a chat row does not go inside it", now !== null && now !== "release", { was, now });
}

async function checksCloseAndReopen(page: AskedPage): Promise<void> {
	await page.hover(...(await pointOf(page, centreOf('[data-tabs-chat="release"] [data-tabs-words]'))));
	await waited(150);
	await page.press(...(await pointOf(page, centreOf('[data-host-close-tab="release"]'))));
	await waited(500);
	const gone = await page.ask(`document.querySelector('[data-tabs-chat="release"]') === null`);
	const archived = await page.ask(PLACED("release"));
	const isRecordKept = await page.ask(RECORD_KEPT("release"));
	check(
		"closing a chat tab takes it off the list into closed tabs, and the chat record stays",
		gone === true &&
			JSON.stringify(archived) === JSON.stringify({ isOpen: false, isClosed: true }) &&
			isRecordKept === true,
		{ gone, archived, isRecordKept },
	);
	await page.ask(REOPEN);
	await waited(600);
	const back = await page.ask(`document.querySelector('[data-tabs-chat="release"]') !== null`);
	check("reopening brings the chat back", back === true, back);
}

async function walk(theme: Theme): Promise<void> {
	const page = await opened(theme, "?seeded");
	try {
		const shot = path.join(shotsAt, `onelist-${theme}.png`);
		writeFileSync(shot, await page.shoot());
		console.log(`shot ${shot}`);

		if (theme === "light") {
			await checksChatMenu(page);
			await checksChatOntoChat(page);
			await checksCloseAndReopen(page);
		}

		const bad = await page.ask(`document.getElementById("boom").textContent`);
		check(`${theme}: nothing failed on the page`, bad === "", bad);
	} finally {
		page.close();
	}
}

await checksPendingRecords();
await walk("light");
await walk("dark");
console.log(`\none list: ${failed === 0 ? "clean" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
