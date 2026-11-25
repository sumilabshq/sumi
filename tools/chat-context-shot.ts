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
		`<!doctype html><html><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio"><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`,
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
const CLICK_ITEM = (text: string): string =>
	`(() => { const item = [...document.querySelectorAll(".wg-kit-pop-item")].find((one) => one.textContent.includes(${JSON.stringify(text)})); item.click(); return true; })()`;

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
		await shot(page, "table-before");
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
		await shot(page, "table-after");
	});
	await run(`${origin}/?v=git`, "chip-git", [720, 360], async (page) => {
		const head = (await page.ask(HEAD_PROBE)) as Record<string, unknown>;
		console.log("git chip", JSON.stringify(head));
		check("the chip shows the branch in a git folder", [head["chip"], head["chipIcon"]], ["feat/chat-context", 1]);
		check("the chip sits after the title", head["afterTitle"], true);
		await page.ask(`(() => { document.querySelector(".sumi-chat-context-chip").click(); return true; })()`);
		await waited(500);
		const open = (await page.ask(HEAD_PROBE)) as { menu: string[]; separators: number };
		console.log("git menu", JSON.stringify(open));
		check(
			"the menu has folder, branch, computer, open in the first editor found",
			open.menu.map((text) => text),
			["Sumi/Users/demo/Projects/Sumi", "feat/chat-context", "This Mac", "Open in Zed"],
		);
		check("one separator", open.separators, 1);
		await shot(page, "chip-git-menu");
		await page.ask(CLICK_ITEM("Open in Zed"));
		await waited(300);
		check("pressing Open in runs open -a over the folder", await page.ask("window.__OPENED__.map((one) => one.args)"), [
			["-a", "Zed", "/Users/demo/Projects/Sumi"],
		]);
		await page.ask(`(() => { document.querySelector(".sumi-chat-context-more").click(); return true; })()`);
		await waited(300);
		await page.ask(`(() => { document.querySelector(".sumi-chat-context-apps").click(); return true; })()`);
		await waited(400);
		await shot(page, "chip-git-submenu");
		check(
			"the submenu lists the editors found and Finder",
			await page.ask(`[...document.querySelectorAll(".wg-kit-pop-item")].map((one) => one.textContent).slice(-3)`),
			["Zed", "Cursor", "Finder"],
		);
		await page.ask(CLICK_ITEM("Cursor"));
		await waited(400);
		await page.ask(`(() => { document.querySelector(".sumi-chat-context-more").click(); return true; })()`);
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
		await page.ask(`(() => { document.querySelector(".sumi-chat-context-more").click(); return true; })()`);
		await waited(500);
		const open = (await page.ask(HEAD_PROBE)) as { menu: string[] };
		check(
			"no branch row without git",
			open.menu.some((text) => text.includes("feat/")),
			false,
		);
		await shot(page, "chip-plain-menu");
	});
	await run(`${origin}/?v=none`, "chip-none", [720, 360], async (page) => {
		const head = (await page.ask(HEAD_PROBE)) as Record<string, unknown>;
		check("no working folder, no chip", [head["chip"], head["more"]], [null, null]);
		await shot(page, "chip-none");
	});
} finally {
	server.close();
}

console.log(
	tally.failed ? `chat context shots: ${tally.failed} check(s) failed` : "chat context shots: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
