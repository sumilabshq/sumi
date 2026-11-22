import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const TRANSCRIPT = process.argv[2] ?? "";
const SHOT = process.argv[3] ?? "/tmp/agent-chat.png";
const SHEETS = ["packages/shared/core/board.css", "apps/studio/dist/studio.css"];
const LAYOUT =
	"body { margin: 0; background: var(--sumi-plate); } .sumi-agent-chat { width: 760px; height: 560px; } .wg-studio-ai-host, .wg-studio-ai { height: 100%; }";
const bundle = await bundleOf("tools/agent-chat-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const said = JSON.stringify(readFileSync(TRANSCRIPT, "utf8")).replaceAll("</", "<\\/");
const PAGE = `<!doctype html><html class="theme-dark"><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio wg-root theme-dark"><div id="root"></div><pre id="boom"></pre><script>window.AGENT_TRANSCRIPT = ${said};</script><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

try {
	const page = await paged(origin, "agent-chat", { size: [760, 560] });
	try {
		await waited(1500);
		console.log(await page.ask("document.getElementById('boom').textContent"));
		writeFileSync(SHOT, await page.shoot());
		console.log(`screenshot: ${SHOT}`);
	} finally {
		page.close();
	}
} finally {
	server.close();
}
