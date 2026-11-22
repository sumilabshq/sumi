import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const SHOTS_AT = process.argv[2] ?? "/tmp";
const THEME = process.argv[3] ?? "theme-dark";
const SHEETS = ["packages/shared/core/board.css", "apps/studio/dist/studio.css"];
const LAYOUT =
	"body { margin: 0; background: var(--plate); } .demo { width: 720px; padding: 24px 32px; display: flex; flex-direction: column; gap: 8px; } .demo-label { margin-top: 16px; color: var(--text-3); font: 13px var(--font-ui); }";
const bundle = await bundleOf("tools/background-agents-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const PAGE = `<!doctype html><html class="${THEME}"><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio wg-root ${THEME}"><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

try {
	const page = await paged(origin, "background-agents", { size: [760, 620] });
	try {
		await waited(1200);
		const shot = `${SHOTS_AT}/background-agents-${THEME}.png`;
		writeFileSync(shot, await page.shoot());
		console.log(`screenshot: ${shot}`);
	} finally {
		page.close();
	}
} finally {
	server.close();
}
