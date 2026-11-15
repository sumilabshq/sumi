import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [1440, 900];
const GATE = "test:one-sidebar";
const ACCENT = "rgb(59, 91, 253)";
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-one-sidebar"));
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

function pageFileOf(theme: Theme): string {
	const html = `<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();history.replaceState(null, "", "?seeded");</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const file = path.join(shotsAt, `one-sidebar-${theme}.html`);
	writeFileSync(file, html);
	return file;
}

const SIDEBAR_DRAWN = `new Promise((done) => {
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

const ANATOMY = `(() => {
	const column = document.querySelector("[data-ws-column]");
	const head = column.querySelector(".wg-ws-head");
	const add = column.querySelector("[data-host-column-add]");
	const essentials = column.querySelector("[data-tabs-essentials]");
	const firstSection = column.querySelector("[data-ws-section]");
	const follows = (one, other) => one !== null && other !== null && (one.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
	const recents = column.querySelector('[data-tabs-list="workspace"]');
	return {
		rightSides: document.querySelectorAll('.wg-shell-right, [data-shell-column="right"], [data-side-toggle="right"], [data-tabs-sidebar-column]').length,
		sidebars: document.querySelectorAll("[data-tabs-sidebar]").length,
		headGlyphs: head === null ? -1 : head.querySelectorAll(".wg-ws-emoji, .wg-ws-dot, .wg-ws-filled, img, [data-ws-name] > :first-child:not(.wg-ws-name-text)").length,
		headWords: head?.querySelector("[data-ws-name]")?.textContent ?? null,
		order: follows(head, essentials) && follows(essentials, firstSection),
		adds: column.querySelectorAll("[data-host-column-add]").length,
		isAddLastOfRecents: add !== null && recents !== null && recents.lastElementChild === add,
		sections: [...column.querySelectorAll("[data-ws-section]")].map((section) => section.dataset.wsSection),
		saysTabsIn: column.textContent.includes("Tabs in"),
		saysNewChat: column.textContent.includes("New chat"),
	};
})()`;

const CHAT_ROWS = `(() => {
	const chat = document.querySelector('[data-tabs-chat="release"]');
	const unread = document.querySelector('[data-tabs-chat="checks"] [data-tabs-unread]');
	const dot = unread === null ? null : unread.getBoundingClientRect();
	const rowBox = document.querySelector('[data-tabs-chat="checks"]').getBoundingClientRect();
	return {
		hasMascot: chat?.querySelector(".wg-chat-tab-icon") !== null,
		isGlanceHost: chat?.classList.contains("wg-chat-tab-icon-host") === true,
		working: document.querySelector('[data-tabs-chat="deepl"] .wg-chat-tab-icon')?.dataset.motion ?? null,
		dot: dot === null ? null : [Math.round(dot.width), Math.round(dot.height), getComputedStyle(unread).backgroundColor, Math.round(rowBox.right - dot.right)],
		dotsOnReadChats: document.querySelectorAll('[data-tabs-chat]:not([data-tabs-chat="checks"]) [data-tabs-unread]').length,
		tabIcons: document.querySelectorAll('[data-tabs-id="tab-1"] .wg-chat-tab-icon').length,
	};
})()`;

const ChatRowsSchema = z.object({
	hasMascot: z.boolean(),
	isGlanceHost: z.boolean(),
	working: z.string().nullable(),
	dot: z.tuple([z.number(), z.number(), z.string(), z.number()]).nullable(),
	dotsOnReadChats: z.number(),
	tabIcons: z.number(),
});

const MENU_ITEMS = `[...document.querySelectorAll("[data-tabs-pointer-menu] [data-tabs-menu-item]")].map((item) => item.dataset.tabsMenuItem)`;

const contextMenuAt = (selector: string): string => `(() => {
	const row = document.querySelector(${JSON.stringify(selector)});
	const box = row.getBoundingClientRect();
	row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + 20, clientY: box.top + box.height / 2 }));
	return true;
})()`;

const ESCAPE = `document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`;

async function menuOf(page: AskedPage, selector: string): Promise<readonly string[]> {
	await page.ask(contextMenuAt(selector));
	await waited(250);
	const items = z.array(z.string()).parse(await page.ask(MENU_ITEMS));
	await page.ask(ESCAPE);
	await waited(250);
	return items;
}

const AnatomySchema = z.object({
	rightSides: z.number(),
	sidebars: z.number(),
	headGlyphs: z.number(),
	headWords: z.string().nullable(),
	order: z.boolean(),
	adds: z.number(),
	isAddLastOfRecents: z.boolean(),
	sections: z.array(z.string()),
	saysTabsIn: z.boolean(),
	saysNewChat: z.boolean(),
});

async function checksAnatomy(page: AskedPage, theme: Theme): Promise<void> {
	const seen = AnatomySchema.parse(await page.ask(ANATOMY));
	check(`${theme}: no right sidebar, no right toggle`, seen.rightSides === 0 && seen.sidebars === 1, seen);
	check(
		`${theme}: the workspace header carries its name and no glyph`,
		seen.headGlyphs === 0 && seen.headWords === "Default",
		seen,
	);
	check(`${theme}: header, Essentials, then sections, top to bottom`, seen.order, seen);
	checksSections(seen, theme);
	check(
		`${theme}: no "Tabs in" and no "New chat" anywhere in the sidebar`,
		!seen.saysTabsIn && !seen.saysNewChat,
		seen,
	);
}

function checksSections(seen: z.infer<typeof AnatomySchema>, theme: Theme): void {
	check(
		`${theme}: New tab is the one last row of Recents, nothing at the top`,
		seen.adds === 1 && seen.isAddLastOfRecents,
		seen,
	);
	check(
		`${theme}: the sections are Pinned and Recents`,
		JSON.stringify(seen.sections) === '["Pinned","Recents"]',
		seen.sections,
	);
}

type ChatRows = z.infer<typeof ChatRowsSchema>;

function isBlueDot({ dot, dotsOnReadChats }: ChatRows): boolean {
	if (dot === null) {
		return false;
	}

	const [width, height, colour, fromEnd] = dot;
	return width === 8 && height === 8 && colour === ACCENT && fromEnd <= 12 && dotsOnReadChats === 0;
}

async function checksChatRows(page: AskedPage, theme: Theme): Promise<void> {
	const seen = ChatRowsSchema.parse(await page.ask(CHAT_ROWS));
	check(`${theme}: a chat row wears the mascot and answers the glance`, seen.hasMascot && seen.isGlanceHost, seen);
	check(`${theme}: a running chat's mascot bobs`, seen.working === "bob", seen.working);
	check(`${theme}: other tabs keep their own icons`, seen.tabIcons === 0, seen.tabIcons);
	check(`${theme}: an unread chat shows an 8px blue dot at the row's right end, read chats none`, isBlueDot(seen), [
		seen.dot,
		seen.dotsOnReadChats,
	]);
}

async function checksOneMenu(page: AskedPage): Promise<void> {
	const tabMenu = await menuOf(page, '[data-tabs-id="tab-1"]');
	const chatMenu = await menuOf(page, '[data-tabs-chat="deepl"]');
	check(
		"a tab row and a chat row open the same menu",
		tabMenu.length > 0 && JSON.stringify(tabMenu) === JSON.stringify(chatMenu),
		{ tabMenu, chatMenu },
	);
	check(
		"the menu holds Essentials, Pin, groups, Rename and Close, and no Move to section",
		JSON.stringify(tabMenu) ===
			JSON.stringify(["Add to Essentials", "Pin", "New group with this tab", "Move to group", "Rename", "Close"]),
		tabMenu,
	);
}

async function walk(theme: Theme): Promise<void> {
	const page = await paged(pageFileOf(theme), GATE, { size: VIEW });
	try {
		await drawnSidebar(page);
		await checksAnatomy(page, theme);
		await checksChatRows(page, theme);
		await shotOf(page, theme);

		await checksActions(page, theme);
		await checksQuiet(page, theme);
	} finally {
		page.close();
	}
}

async function checksActions(page: AskedPage, theme: Theme): Promise<void> {
	if (theme !== "light") {
		return;
	}

	await checksOneMenu(page);
}

async function checksQuiet(page: AskedPage, theme: Theme): Promise<void> {
	const bad = await page.ask(`document.getElementById("boom").textContent`);
	check(`${theme}: nothing failed on the page`, bad === "", bad);
}

async function drawnSidebar(page: AskedPage): Promise<void> {
	const drawn = await page.ask(SIDEBAR_DRAWN);

	if (drawn !== true) {
		throw new Error(String(drawn));
	}

	await waited(400);
}

async function shotOf(page: AskedPage, theme: Theme): Promise<void> {
	const shot = path.join(shotsAt, `sidebar-${theme}.png`);
	writeFileSync(shot, await page.shoot());
	console.log(`shot ${shot}`);
}

await walk("light");
await walk("dark");
console.log(`\none sidebar: ${failed === 0 ? "clean" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
