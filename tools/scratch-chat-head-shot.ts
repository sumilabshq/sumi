import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";

const SHOTS_AT = process.argv[2] ?? "/tmp";
const SHEETS = [
	BOARD_SHEET,
	"plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant.css",
	"plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-page.css",
	"plugins/ai/chat-title/src/features/head-title/ui/head-title/head-title.css",
	"plugins/ai/sessions/src/features/sessions/ui/sessions-chevron/sessions-chevron.css",
	"plugins/ai/sessions/src/features/sessions/ui/sessions-popover/sessions-popover.css",
];
const LAYOUT =
	"body { margin: 0; } .demo-chat { height: 420px; overflow: hidden; } .demo-chat .wg-studio-ai { position: relative; height: 100%; display: flex; flex-direction: column; } .demo-scroll { flex: 1; padding: 30px 24px 0; overflow: hidden; } .demo-composer { margin: 0 24px 16px; padding: 8px; border-radius: 12px; background: var(--soft); }";
const bundle = await bundleOf("tools/scratch-chat-head-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const PAGE = `<!doctype html><html><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio"><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const PROBE = `(() => {
	const head = document.querySelector(".wg-chat-head");
	const title = document.querySelector(".sumi-head-title");
	const chevron = document.querySelector(".sumi-sessions-chevron");
	const field = document.querySelector(".sumi-head-title-field");
	const picker = [...document.querySelectorAll(".wg-studio-ai-strip .wg-kit-btn")].map((one) => one.textContent);
	return {
		head: head === null ? null : head.getBoundingClientRect().height,
		title: title === null ? null : { text: title.textContent, width: title.getBoundingClientRect().width, color: getComputedStyle(title).color },
		chevron: chevron === null ? null : { size: chevron.getBoundingClientRect().width, state: chevron.getAttribute("data-state") },
		field: field === null ? null : { focused: document.activeElement === field, selected: field.selectionEnd - field.selectionStart, value: field.value },
		strip: picker,
		boom: document.getElementById("boom").textContent,
	};
})()`;

const CASES: readonly { readonly name: string; readonly variant: string; readonly act: string | null }[] = [
	{ name: "head", variant: "short", act: null },
	{ name: "renaming", variant: "short", act: "document.querySelector('.sumi-head-title').click()" },
	{ name: "chevron-open", variant: "short", act: "document.querySelector('.sumi-sessions-chevron').click()" },
	{ name: "long-title", variant: "long", act: null },
	{ name: "empty", variant: "empty", act: null },
];

try {
	for (const each of CASES) {
		const page = await paged(`${origin}?v=${each.variant}`, `chat-head-${each.name}`, { size: [720, 420] });
		try {
			await waited(1200);
			if (each.act !== null) {
				await page.ask(`(() => { ${each.act}; return true; })()`);
				await waited(500);
			}
			console.log(each.name, JSON.stringify(await page.ask(PROBE)));
			const shot = `${SHOTS_AT}/chat-head-${each.name}.png`;
			writeFileSync(shot, await page.shoot());
			console.log(`screenshot: ${shot}`);
		} finally {
			page.close();
		}
	}
} finally {
	server.close();
}
