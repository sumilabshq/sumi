import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";
import { check, tally } from "./check-helpers.ts";

const SHOTS_AT = process.argv[2] ?? "/tmp/chat-context-shots";
const BEFORE_SHEETS = ["/tmp/chat-context-board-before.css", "/tmp/chat-context-assistant-before.css"];
const SHEETS = [
	BOARD_SHEET,
	"apps/studio/dist/studio.css",
	"plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant.css",
	"plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-page.css",
	"plugins/ai/chat-title/src/features/head-title/ui/head-title/head-title.css",
	"plugins/ai/sessions/src/features/sessions/ui/sessions-chevron/sessions-chevron.css",
	"plugins/ai/chat-context/src/features/chat-context/ui/chat-context/chat-context.css",
];
const LAYOUT =
	"body { margin: 0; } .demo-chat { height: 360px; overflow: hidden; } .demo-chat .wg-studio-ai { position: relative; height: 100%; } .demo-scroll { padding: 48px 24px 0; overflow: hidden; }";
const TABLE_PAGE = `<div class="wg-chat-app" style="padding:24px;width:520px"><div class="wg-root"><div class="wg-studio-ai-said is-markdown"><div>
<p>The table below compares the three runners. This paragraph is the reference text size for the reply.</p>
<div class="wg-studio-ai-table-wrap"><div class="wg-studio-ai-table"><table><thead><tr><th>Runner</th><th>Context</th><th class="is-number">Cost</th></tr></thead><tbody>
<tr><td>Claude Code</td><td>200k tokens</td><td class="is-number">12</td></tr><tr><td>Codex</td><td>128k tokens</td><td class="is-number">9</td></tr></tbody></table></div></div>
</div></div></div></div>`;

mkdirSync(SHOTS_AT, { recursive: true });
const bundle = await bundleOf("tools/chat-context-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const pages = new Map<string, string>([
	[
		"/",
		`<!doctype html><html><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio"><div class="wg-root wg-portal wg-kit-portal-layer is-studio"></div><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`,
	],
	[
		"/table-after",
		`<!doctype html><html><head><meta charset="utf-8">${styles}<style>body{margin:0}</style></head><body class="wg-studio">${TABLE_PAGE}</body></html>`,
	],
	[
		"/table-before",
		`<!doctype html><html><head><meta charset="utf-8">${BEFORE_SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("")}<style>body{margin:0}</style></head><body class="wg-studio">${TABLE_PAGE}</body></html>`,
	],
]);
const server = http.createServer((request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(pages.get((request.url ?? "/").split("?")[0] ?? "/") ?? "");
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}` : "";

const TEXT_PROBE = `(() => {
	const of = (node) => node === null ? null : { size: getComputedStyle(node).fontSize, line: getComputedStyle(node).lineHeight, weight: getComputedStyle(node).fontWeight, color: getComputedStyle(node).color };
	return { p: of(document.querySelector(".is-markdown p")), td: of(document.querySelector("td")), th: of(document.querySelector("th")) };
})()`;
const HEAD_PROBE = `(() => {
	const chip = document.querySelector(".sumi-chat-context-chip");
	const more = document.querySelector(".sumi-chat-context-more");
	const title = document.querySelector(".sumi-head-title");
	const box = (node) => node === null ? null : node.getBoundingClientRect();
	return {
		chip: chip === null ? null : chip.textContent,
		chipIcon: chip === null ? null : chip.querySelectorAll("svg").length,
		chipStyle: chip === null ? null : (({ fontSize, color, padding, borderRadius }) => ({ fontSize, color, padding, borderRadius }))(getComputedStyle(chip)),
		more: more === null ? null : { w: box(more).width, h: box(more).height, right: Math.round(window.innerWidth - box(more).right) },
		afterTitle: chip !== null && title !== null ? box(chip).left >= box(title).right : null,
		menu: [...document.querySelectorAll(".wg-kit-pop-item")].map((item) => item.textContent),
		separators: document.querySelectorAll(".wg-kit-pop-sep").length,
		boom: document.getElementById("boom").textContent,
	};
})()`;
const PRESS = (selector: string): string =>
	`(() => { document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); return true; })()`;
const PANEL_PROBE = `(() => {
	const panel = document.querySelector(".sumi-chat-context-pop.is-open");
	const item = document.querySelector(".sumi-chat-context-pop .wg-kit-pop-item");
	const folder = document.querySelector(".sumi-chat-context-folder");
	const path = document.querySelector(".sumi-chat-context-path");
	const edge = (node) => node === null ? null : node.getBoundingClientRect();
	const muted = document.createElement("i");
	muted.style.color = "var(--text-3)";
	document.body.append(muted);
	const token = getComputedStyle(muted).color;
	muted.remove();
	const chip = document.querySelector(".sumi-chat-context-chip");
	const more = document.querySelector(".sumi-chat-context-more");
	return {
		panel: panel === null ? null : { left: edge(panel).left, right: edge(panel).right, width: edge(panel).width },
		more: more === null ? null : { right: edge(more).right, w: edge(more).width, h: edge(more).height, color: getComputedStyle(more).color },
		chipLeft: chip === null ? null : edge(chip).left,
		chipBackground: chip === null ? null : getComputedStyle(chip).backgroundColor,
		chipFill: chip === null ? null : getComputedStyle(chip, "::before").backgroundColor,
		chipColor: chip === null ? null : getComputedStyle(chip).color,
		chipText: chip === null ? null : getComputedStyle(chip.querySelector(".sumi-chat-context-label")).fontSize,
		token,
		itemWeight: item === null ? null : getComputedStyle(item).fontWeight,
		itemSize: item === null ? null : getComputedStyle(item).fontSize,
		focusVisible: [...document.querySelectorAll(".sumi-chat-context-pop .wg-kit-pop-item")].filter((one) => one.matches(":focus-visible")).length,
		pathText: path === null ? null : path.textContent,
		pathHeight: path === null ? null : edge(path).height,
		pathScrollFits: path === null ? null : path.scrollWidth <= path.clientWidth + 1,
		folderTitle: folder === null ? null : folder.getAttribute("title"),
		firstRowGap: item === null || panel === null ? null : edge(item).top - edge(panel).top,
		iconMid: folder === null ? null : edge(folder.querySelector(".sumi-chat-context-folder-icon")).top + edge(folder.querySelector(".sumi-chat-context-folder-icon")).height / 2,
		nameMid: folder === null ? null : edge(folder.querySelector(".sumi-chat-context-name")).top + edge(folder.querySelector(".sumi-chat-context-name")).height / 2,
	};
})()`;
const CLICK_ITEM = (text: string): string =>
	`(() => { const item = [...document.querySelectorAll(".wg-kit-pop-item")].find((one) => one.textContent.includes(${JSON.stringify(text)})); item.click(); return true; })()`;

const TRANSPARENT = "rgba(0, 0, 0, 0)";

interface Probe {
	panel: { left: number; right: number; width: number } | null;
	more: { right: number; w: number; h: number } | null;
	chipLeft: number | null;
	chipBackground: string | null;
	chipFill: string | null;
	chipColor: string | null;
	chipText: string | null;
	token: string;
	itemWeight: string | null;
	itemSize: string | null;
	focusVisible: number;
	pathText: string | null;
	pathHeight: number | null;
	pathScrollFits: boolean | null;
	folderTitle: string | null;
	firstRowGap: number | null;
	iconMid: number | null;
	nameMid: number | null;
}

const HEAD_GEOMETRY = `(() => {
	const head = document.querySelector(".wg-chat-head");
	const [title, chevron, chip, more] = [".sumi-head-title", ".sumi-sessions-chevron", ".sumi-chat-context-chip", ".sumi-chat-context-more"].map((selector) => document.querySelector(selector));
	const box = (node) => node.getBoundingClientRect();
	const follows = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
	return {
		domOrder: follows(title, chevron) && follows(chevron, chip),
		visualOrder: box(title).right <= box(chevron).left + 1 && box(chevron).right <= box(chip).left + 1 && box(chip).right <= box(more).left + 1,
		moreRight: box(more).right,
		contentRight: box(head).right - parseFloat(getComputedStyle(head).paddingRight),
		chipGap: box(chip).left - box(chevron).right,
	};
})()`;

interface HeadGeometry {
	domOrder: boolean;
	visualOrder: boolean;
	moreRight: number;
	contentRight: number;
	chipGap: number;
}

async function checkHead(page: AskedPage, label: string, domOrder: boolean): Promise<void> {
	const head = (await page.ask(HEAD_GEOMETRY)) as HeadGeometry;
	console.log(label, JSON.stringify(head));
	check(`${label}: DOM order is title, chevron, chip`, head.domOrder, domOrder);
	check(`${label}: drawn order is title, chevron, chip, more`, head.visualOrder, true);
	check(
		`${label}: more button right edge is the header content right edge`,
		Math.abs(head.moreRight - head.contentRight) <= 1,
		true,
	);
	check(`${label}: chip is 10px after the chevron`, Math.abs(head.chipGap - 10) <= 1, true);
}

async function shot(page: AskedPage, name: string): Promise<void> {
	const file = `${SHOTS_AT}/${name}.png`;
	writeFileSync(file, await page.shoot());
	console.log(`screenshot: ${file}`);
}

async function run(
	url: string,
	name: string,
	size: readonly [number, number],
	body: (page: AskedPage) => Promise<void>,
): Promise<void> {
	const page = await paged(url, name, { size });
	try {
		await waited(1200);
		await body(page);
	} finally {
		page.close();
	}
}

try {
	await run(`${origin}/table-before`, "table-before", [600, 200], async (page) => {
		console.log("table before", JSON.stringify(await page.ask(TEXT_PROBE)));
		await shot(page, "v3-table-before");
	});
	await run(`${origin}/table-after`, "table-after", [600, 200], async (page) => {
		const text = (await page.ask(TEXT_PROBE)) as {
			p: { size: string; line: string; weight: string };
			td: { size: string; line: string; weight: string };
			th: { size: string; line: string; weight: string; color: string };
		};
		console.log("table after", JSON.stringify(text));
		check(
			"cells share the paragraph size, line height and weight",
			[text.td.size, text.td.line, text.td.weight],
			[text.p.size, text.p.line, text.p.weight],
		);
		check(
			"header cells share them too",
			[text.th.size, text.th.line, text.th.weight],
			[text.p.size, text.p.line, text.p.weight],
		);
		await shot(page, "v3-table-after");
	});
	await run(`${origin}/?v=git`, "chip-git", [720, 360], async (page) => {
		const head = (await page.ask(HEAD_PROBE)) as Record<string, unknown>;
		console.log("git chip", JSON.stringify(head));
		check("the chip shows the branch in a git folder", [head["chip"], head["chipIcon"]], ["feat/chat-context", 1]);
		check("the chip sits after the title", head["afterTitle"], true);
		await checkHead(page, "header", true);
		const rest = (await page.ask(PANEL_PROBE)) as Probe;
		console.log("chip at rest", JSON.stringify(rest));
		check("the chip has no background at rest", [rest.chipBackground, rest.chipFill], [TRANSPARENT, TRANSPARENT]);
		check("the chip ink is the muted token", rest.chipColor, rest.token);
		check("the chip text is 13px", rest.chipText, "13px");
		check("the more button is 28px", [rest.more?.w, rest.more?.h], [28, 28]);
		await shot(page, "v3-chip-rest");
		await page.ask(PRESS(".sumi-chat-context-chip"));
		await waited(500);
		const open = (await page.ask(HEAD_PROBE)) as { menu: string[]; separators: number };
		const chipOpen = (await page.ask(PANEL_PROBE)) as Probe;
		console.log("git menu", JSON.stringify(open), JSON.stringify(chipOpen));
		check(
			"the menu has folder, branch, computer, open in the first editor found",
			open.menu.map((text) => text),
			["Sumi~/Projects/Sumi", "feat/chat-context", "This Mac", "Open in Zed"],
		);
		check(
			"no Open terminal here",
			open.menu.some((text) => text.includes("terminal")),
			false,
		);
		check("one separator", open.separators, 1);
		check("the panel is 260px wide", chipOpen.panel?.width, 260);
		check("opened from the chip, the panel is left-aligned to the chip", chipOpen.panel?.left, chipOpen.chipLeft);
		check("the menu text is the kit weight and size", [chipOpen.itemWeight, chipOpen.itemSize], ["400", "12.5px"]);
		check("no focus frame when opened by pointer", chipOpen.focusVisible, 0);
		check("the path is shortened with ~", chipOpen.pathText, "~/Projects/Sumi");
		check("the path is one line", (chipOpen.pathHeight ?? 99) <= 18, true);
		check("the first row is 4px or more under the panel top", (chipOpen.firstRowGap ?? 0) >= 4, true);
		check(
			"the folder icon centre sits on the name line centre",
			Math.abs((chipOpen.iconMid ?? 0) - (chipOpen.nameMid ?? 99)) <= 2,
			true,
		);
		check("the folder row title is the full path", chipOpen.folderTitle, "/Users/demo/Projects/Sumi");
		check("the path is never cut", chipOpen.pathScrollFits, true);
		await shot(page, "v3-chip-menu");
		await page.ask(CLICK_ITEM("Open in Zed"));
		await waited(300);
		check("pressing Open in runs open -a over the folder", await page.ask("window.__OPENED__.map((one) => one.args)"), [
			["-a", "Zed", "/Users/demo/Projects/Sumi"],
		]);
		await page.ask(PRESS(".sumi-chat-context-more"));
		await waited(500);
		const more = (await page.ask(PANEL_PROBE)) as Probe;
		console.log("more menu", JSON.stringify(more));
		check("the panel is 260px wide from the more button", more.panel?.width, 260);
		check(
			"opened from the more button, the panel right edge meets the button",
			Math.round(more.panel?.right ?? -1),
			Math.round(more.more?.right ?? -2),
		);
		check("no focus frame when the more button opens it", more.focusVisible, 0);
		await shot(page, "v3-more-menu");
		await page.ask(PRESS(".sumi-chat-context-apps"));
		await waited(400);
		await shot(page, "v3-submenu");
		check(
			"the submenu lists the editors found and Finder",
			await page.ask(`[...document.querySelectorAll(".wg-kit-pop-item")].map((one) => one.textContent).slice(-3)`),
			["Zed", "Cursor", "Finder"],
		);
		await page.ask(CLICK_ITEM("Cursor"));
		await waited(400);
		await page.ask(PRESS(".sumi-chat-context-more"));
		await waited(400);
		check(
			"the chosen editor names the item after it",
			await page.ask(
				`[...document.querySelectorAll(".wg-kit-pop-item")].map((one) => one.textContent).find((text) => text.startsWith("Open in"))`,
			),
			"Open in Cursor",
		);
	});
	await run(`${origin}/?v=plain`, "chip-plain", [720, 360], async (page) => {
		const head = (await page.ask(HEAD_PROBE)) as Record<string, unknown>;
		check("the chip shows the folder name without git", [head["chip"], head["chipIcon"]], ["notes", 1]);
		await page.ask(PRESS(".sumi-chat-context-more"));
		await waited(500);
		const open = (await page.ask(HEAD_PROBE)) as { menu: string[] };
		check(
			"no branch row without git",
			open.menu.some((text) => text.includes("feat/")),
			false,
		);
		await shot(page, "v3-plain-menu");
	});
	await run(`${origin}/?v=long`, "chip-long", [720, 360], async (page) => {
		await page.ask(PRESS(".sumi-chat-context-more"));
		await waited(500);
		const long = (await page.ask(PANEL_PROBE)) as Probe;
		console.log("long path", JSON.stringify(long));
		check("a long path keeps the panel at 260px", long.panel?.width, 260);
		check(
			"a long path is one line, middle-cut with an ellipsis",
			[(long.pathHeight ?? 99) <= 18, long.pathText?.includes("…")],
			[true, true],
		);
		check("the long path keeps its start and end", long.pathText, "~/Projects/…/src/components");
		check("the long path is not clipped by the panel", long.pathScrollFits, true);
		check("the first row is 4px or more under the panel top", (long.firstRowGap ?? 0) >= 4, true);
		check(
			"the folder icon centre sits on the name line centre",
			Math.abs((long.iconMid ?? 0) - (long.nameMid ?? 99)) <= 2,
			true,
		);
		console.log(
			"long path measures",
			JSON.stringify({
				pathHeight: long.pathHeight,
				firstRowGap: long.firstRowGap,
				iconMid: long.iconMid,
				nameMid: long.nameMid,
			}),
		);
		await shot(page, "v3-long-path");
	});
	await run(`${origin}/?v=git&fills=context-first`, "chip-context-first", [720, 360], async (page) => {
		await checkHead(page, "header with the chat context registered first", false);
		await shot(page, "v3-header-context-first");
	});
	await run(`${origin}/?v=none`, "chip-none", [720, 360], async (page) => {
		const head = (await page.ask(HEAD_PROBE)) as Record<string, unknown>;
		check("no working folder, no chip", [head["chip"], head["more"]], [null, null]);
		await shot(page, "v3-chip-none");
	});
} finally {
	server.close();
}

console.log(
	tally.failed ? `chat context shots: ${tally.failed} check(s) failed` : "chat context shots: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
