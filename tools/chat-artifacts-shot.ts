import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";

const SHOT_AT = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-chat-artifacts.png"));
const SHEETS = [
	BOARD_SHEET,
	"plugins/tabs/tab-strip/src/features/tab-strip/ui/tab-strip/tab-strip.css",
	"plugins/tabs/tabs-sidebar/src/features/tabs-sidebar/ui/tabs-sidebar/tabs-sidebar.css",
];
const LAYOUT = `body { margin: 0; } .demo { padding: 24px; min-height: 100vh; box-sizing: border-box; background: var(--sumi-frame, #0b0b0a); }`;

const bundle = await bundleOf("tools/chat-artifacts-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const PAGE = `<!doctype html><html class="dark"><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head>
<body class="dark"><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const page = await paged(origin, "chat-artifacts", { size: [420, 360] });
try {
	await waited(800);
	const drawn = await page.ask(`({
		rows: document.querySelectorAll("[data-sort-id]").length,
		nested: document.querySelectorAll(".wg-kit-side-menu-sub [data-sort-id]").length,
		folds: [...document.querySelectorAll("[data-side-fold]")].map((fold) => fold.getAttribute("aria-expanded")),
		veil: document.querySelector(".wg-kit-drop-refusal")?.textContent ?? null,
		boom: document.getElementById("boom").textContent,
	})`);
	console.log(JSON.stringify(drawn));
	writeFileSync(SHOT_AT, await page.shoot());
	const row = await page.ask(
		`(() => { const box = document.querySelector('[data-sort-id="groups-chat"]').getBoundingClientRect(); return [box.left + 40, box.top + box.height / 2]; })()`,
	);
	if (Array.isArray(row) && typeof row[0] === "number" && typeof row[1] === "number") {
		await page.hover(row[0], row[1]);
		await waited(300);
		writeFileSync(SHOT_AT.replace(/\.png$/, "-hover.png"), await page.shoot());
	}
	console.log(`screenshot: ${SHOT_AT}`);
} finally {
	page.close();
	server.close();
}
