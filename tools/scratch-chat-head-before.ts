import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const SHOTS_AT = process.argv[2] ?? "/tmp";
const SHEETS = [
	"packages/shared/core/board.css",
	"apps/studio/dist/studio.css",
	"plugins/ai/sessions/src/features/sessions/ui/sessions-chip/sessions-chip.css",
];
const LAYOUT =
	"body { margin: 0; } .wg-studio-chat { width: 1100px; height: 420px; padding: 0; } .demo-chat { height: 420px; overflow: hidden; } .demo-chat .wg-studio-ai { position: relative; height: 100%; display: flex; flex-direction: column; } .demo-scroll { flex: 1; padding: 70px 24px 0; overflow: hidden; } .demo-composer { margin: 0 auto 16px; padding: 8px; background: var(--soft); }";
const bundle = await bundleOf("tools/scratch-chat-head-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const PAGE = `<!doctype html><html><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio"><div class="wg-studio-chat"><div id="root"></div></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const PROBE = `(() => {
	const app = document.querySelector(".wg-chat-app").getBoundingClientRect();
	const head = document.querySelector(".wg-chat-head").getBoundingClientRect();
	const title = document.querySelector(".sumi-sessions-chip").getBoundingClientRect();
	const chevron = document.querySelector(".sumi-sessions-chip svg").getBoundingClientRect();
	const cs = getComputedStyle(document.querySelector(".wg-chat-head")); return { maxW: cs.maxWidth, ml: cs.marginLeft, pl: cs.paddingLeft, readW: cs.getPropertyValue("--studio-chat-content"), appLeft: app.left, headLeft: head.left, headWidth: head.width, titleTextFromPaneEdge: title.left + 4 - app.left, titleToChevron: chevron.left - title.right };
})()`;

try {
	const page = await paged(`${origin}?v=short`, "chat-head-real", { size: [1100, 420] });
	try {
		await waited(1200);
		console.log(JSON.stringify(await page.ask(PROBE)));
		const shot = `${SHOTS_AT}/chat-head-before.png`;
		writeFileSync(shot, await page.shoot());
		console.log(`screenshot: ${shot}`);
	} finally {
		page.close();
	}
} finally {
	server.close();
}
