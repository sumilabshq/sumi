import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [1440, 900];
const GATE = "test:one-list";
const CLEAR = "rgba(0, 0, 0, 0)";
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-one-list"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/shell-frame-page.tsx");
const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");

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

const ROW_TAIL = `(() => {
	const row = document.querySelector('[data-tabs-chat="release"]');
	const close = row.querySelector('[data-host-close-tab="release"]').getBoundingClientRect();
	const fold = row.querySelector("[data-tabs-fold]").getBoundingClientRect();
	return { closeRight: Math.round(close.right), foldLeft: Math.round(fold.left), foldRight: Math.round(fold.right), rowRight: Math.round(row.getBoundingClientRect().right) };
})()`;

const LOOKS = `(() => {
	const row = document.querySelector('[data-tabs-chat="deepl"]');
	return { row: getComputedStyle(row).backgroundColor, fold: getComputedStyle(row.querySelector("[data-tabs-fold]")).backgroundColor, radius: getComputedStyle(row.querySelector("[data-tabs-fold]")).borderRadius };
})()`;

const FOLD_STATE = `(() => {
	const row = document.querySelector('[data-tabs-chat="release"]');
	const box = row.nextElementSibling;
	const style = getComputedStyle(box);
	return {
		isOpen: box.hasAttribute("data-open"),
		expanded: row.querySelector("[data-tabs-fold]").getAttribute("aria-expanded"),
		height: Math.round(box.getBoundingClientRect().height),
		transition: style.transitionProperty,
		duration: style.transitionDuration,
		shown: row.hasAttribute("data-shown"),
	};
})()`;

const FoldSchema = z.object({
	isOpen: z.boolean(),
	expanded: z.string().nullable(),
	height: z.number(),
	transition: z.string(),
	duration: z.string(),
	shown: z.boolean(),
});

const PLACED = (id: string): string => `window.__PLACES__.placedTabs().then((placed) => {
	const tab = placed.tabs.find((one) => one.id === "${id}");
	const closed = placed.closed.find((one) => one.tab.id === "${id}");
	return { isOpen: tab !== undefined, isFolded: tab?.isFolded ?? null, closedWith: closed?.held?.tabs.map((one) => one.id) ?? null };
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

async function nestedIntoDeepl(page: AskedPage): Promise<void> {
	const held = await page.lift({
		from: await pointOf(page, centreOf('[data-tabs-id="tab-1"]')),
		to: await pointOf(page, lowerHalfOf('[data-tabs-chat="deepl"]')),
		steps: 16,
		stepMs: 16,
	});
	await waited(260);
	await held.drop(await pointOf(page, lowerHalfOf('[data-tabs-chat="deepl"]')));
	await waited(500);
}

async function checksChevronLooks(page: AskedPage, theme: Theme): Promise<void> {
	await nestedIntoDeepl(page);
	await page.hover(...(await pointOf(page, centreOf('[data-tabs-chat="release"] [data-tabs-words]'))));
	await waited(200);
	const tail = z.record(z.string(), z.number()).parse(await page.ask(ROW_TAIL));
	await page.hover(...(await pointOf(page, centreOf('[data-tabs-chat="deepl"] [data-tabs-words]'))));
	await waited(200);
	const rowHovered = z.record(z.string(), z.string()).parse(await page.ask(LOOKS));
	await page.hover(...(await pointOf(page, centreOf('[data-tabs-chat="deepl"] [data-tabs-fold]'))));
	await waited(250);
	const foldHovered = z.record(z.string(), z.string()).parse(await page.ask(LOOKS));
	check(
		`${theme}: the close × stands left of the chevron, the chevron at the row's end`,
		(tail["closeRight"] ?? 0) <= (tail["foldLeft"] ?? 0),
		tail,
	);
	check(
		`${theme}: over the row the row greys, over the chevron only the chevron does, on its own rounded plate`,
		rowHovered["row"] !== CLEAR &&
			foldHovered["row"] === CLEAR &&
			foldHovered["fold"] !== CLEAR &&
			foldHovered["radius"] === "6px",
		{ rowHovered, foldHovered },
	);
}

async function checksFolding(page: AskedPage): Promise<void> {
	const before = FoldSchema.parse(await page.ask(FOLD_STATE));
	await page.press(...(await pointOf(page, centreOf('[data-tabs-chat="release"] [data-tabs-fold]'))));
	await waited(60);
	const moving = FoldSchema.parse(await page.ask(FOLD_STATE));
	await waited(500);
	const folded = FoldSchema.parse(await page.ask(FOLD_STATE));
	const placed = await page.ask(PLACED("release"));
	check(
		"the chevron folds the artifacts with a grid animation, keeps the chat as it was, and places keeps the fold",
		before.isOpen &&
			before.height > 0 &&
			!folded.isOpen &&
			folded.height === 0 &&
			folded.expanded === "false" &&
			moving.transition.includes("grid-template-rows") &&
			moving.duration !== "0s" &&
			folded.shown === before.shown &&
			JSON.stringify(placed) === JSON.stringify({ isOpen: true, isFolded: true, closedWith: null }),
		{ before, moving, folded, placed },
	);
	await page.press(...(await pointOf(page, centreOf('[data-tabs-chat="release"] [data-tabs-fold]'))));
	await waited(500);
	const unfolded = FoldSchema.parse(await page.ask(FOLD_STATE));
	check("pressed again it unfolds them", unfolded.isOpen && unfolded.height === before.height, unfolded);
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
		"closing a chat tab takes it off the list into closed tabs with its artifacts, and the chat record stays",
		gone === true &&
			JSON.stringify(archived) === JSON.stringify({ isOpen: false, isFolded: null, closedWith: ["tab-2", "tab-3"] }) &&
			isRecordKept === true,
		{ gone, archived, isRecordKept },
	);
	await page.ask(REOPEN);
	await waited(600);
	const children = await page.ask(
		`[...(document.querySelector('[data-tabs-chat="release"]')?.nextElementSibling?.querySelectorAll('[data-tabs-place="child"]') ?? [])].map((row) => row.dataset.tabsId)`,
	);
	check(
		"reopening brings the chat back with its artifacts",
		JSON.stringify(children) === '["tab-2","tab-3"]',
		children,
	);
}

async function checksReducedMotion(): Promise<void> {
	const page = await opened("light", "?seeded");
	try {
		await page.reduceMotion();
		await waited(100);
		const state = FoldSchema.parse(await page.ask(FOLD_STATE));
		check("with reduced motion the fold drops its transition", state.transition === "none", state);
	} finally {
		page.close();
	}
}

async function walk(theme: Theme): Promise<void> {
	const page = await opened(theme, "?seeded");
	try {
		await checksChevronLooks(page, theme);
		const shot = path.join(shotsAt, `onelist-${theme}.png`);
		writeFileSync(shot, await page.shoot());
		console.log(`shot ${shot}`);

		if (theme === "light") {
			await checksChatMenu(page);
			await checksFolding(page);
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
await checksReducedMotion();
console.log(`\none list: ${failed === 0 ? "clean" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
