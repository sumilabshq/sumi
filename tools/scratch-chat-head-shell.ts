import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const SHOTS_AT = process.argv[2] ?? "/tmp";
const SHEETS = [
	"packages/shared/core/board.css",
	"apps/studio/dist/studio.css",
	"apps/studio/src/features/frame/shell.css",
	"plugins/sumi-host/src/features/title-bar/ui/title-bar/title-bar.css",
	"plugins/tabs/panes/src/features/pane-board/ui/pane-tools/pane-tools.css",
	"plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-page.css",
	"plugins/ai/chat-title/src/features/head-title/ui/head-title/head-title.css",
	"plugins/ai/sessions/src/features/sessions/ui/sessions-chevron/sessions-chevron.css",
];
const LAYOUT = `
body { margin: 0; }
.wg-shell { position: relative; width: 1100px; height: 360px; overflow: hidden; --shell-chrome-left: 78px; background: var(--frame); }
.demo-side { position: absolute; left: 0; top: 0; bottom: 0; width: 260px; border-right: 1px solid var(--line); background: var(--frame); }
.demo-floats { position: absolute; left: 0; top: 0; z-index: 5; display: flex; align-items: center; gap: var(--space-2); height: var(--header-h); padding-inline-start: 20px; }
.demo-lights { display: flex; gap: 8px; } .demo-lights i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; } .demo-lights i + i { background: #febc2e; } .demo-lights i + i + i { background: #28c840; }
.demo-floats .demo-toggle { position: absolute; left: calc(var(--shell-chrome-left) + var(--space-1-5) + var(--space-2)); top: 8px; } .demo-toggle { width: var(--h-sm); height: var(--h-sm); background: var(--hover); }
.demo-menu { width: var(--h-sm); height: var(--h-sm); background: var(--text); }
.demo-x { width: var(--h-xs); height: var(--h-xs); background: var(--hover); }
.wg-pane { position: absolute; top: 0; bottom: 0; right: 0; } .wg-pane .wg-studio-chat { width: 100% !important; max-width: none !important; padding: 0 !important; } .demo-menu, .demo-x, .demo-toggle { display: block; flex: none; }
.demo-chat { height: 100%; overflow: hidden; } .demo-chat .wg-studio-ai { position: relative; height: 100%; display: flex; flex-direction: column; }
.demo-scroll { flex: 1; padding: 70px 24px 0; overflow: hidden; } .demo-composer { margin: 0 24px 16px; padding: 8px; background: var(--soft); }
`;
const bundle = await bundleOf("tools/scratch-chat-head-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");

function pageOf(isDocked: boolean): string {
	const side = isDocked ? `<div class="demo-side"></div>` : "";
	const paneLeft = isDocked ? 261 : 0;
	return `<!doctype html><html><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio">
<div class="wg-studio wg-shell is-flat">
	${side}
	<div class="sumi-sidebar-title demo-floats" data-title-floats="${isDocked ? "beside" : "covering"}"><span class="demo-lights"><i></i><i></i><i></i></span><span class="demo-toggle" data-name="sidebar toggle"></span></div>
	<div class="sumi-title-bar wg-root"><div class="sumi-title-bar-tabs"></div><div class="sumi-title-bar-end"><span class="demo-menu" data-name="command menu"></span></div></div>
	<div class="wg-pane" data-pane-tools ${isDocked ? "" : "data-corner-start"} data-corner-end style="left:${String(paneLeft)}px">
		<div class="sumi-pane-tools wg-root"><span class="demo-x" data-name="pane close"></span></div>
		<div class="wg-studio-chat" style="height:100%"><div id="root" style="height:100%"></div></div>
	</div>
</div>
<pre id="boom"></pre><script>${bundle}</script></body></html>`;
}

const PROBE = `(() => {
	const pane = document.querySelector(".wg-pane").getBoundingClientRect();
	const toggle = document.querySelector(".demo-toggle").getBoundingClientRect();
	const title = document.querySelector(".sumi-head-title").getBoundingClientRect();
	const chevron = document.querySelector(".sumi-sessions-chevron svg").getBoundingClientRect();
	const x = document.querySelector(".demo-x").getBoundingClientRect();
	const menu = document.querySelector(".demo-menu").getBoundingClientRect();
	const text = title.left + 4;
	const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width)]; }; const chain = []; for (let e = document.querySelector(".wg-chat-head"); e && !e.classList.contains("wg-pane"); e = e.parentElement) { const c = getComputedStyle(e); chain.push([e.className, Math.round(e.getBoundingClientRect().width), c.maxWidth, c.marginLeft, c.display, c.position]); } return { chain, pane: r(".wg-pane"), ai: r(".wg-studio-ai"), head: r(".wg-chat-head"), bar: r(".sumi-title-bar"), menu: r(".demo-menu"), barEnd: r(".sumi-title-bar-end"), textFromPaneEdge: text - pane.left, textAfterToggle: text - toggle.right, textToChevron: chevron.left - title.right, closeToMenu: menu.left - x.right };
})()`;

for (const isDocked of [true, false]) {
	const html = pageOf(isDocked);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${String(address.port)}/` : "";
	const name = isDocked ? "sidebar-open" : "sidebar-closed";
	try {
		const page = await paged(`${origin}?v=short`, `chat-head-${name}`, { size: [1100, 360] });
		try {
			await waited(1200);
			console.log(name, JSON.stringify(await page.ask(PROBE)));
			const shot = `${SHOTS_AT}/chat-head-${name}.png`;
			writeFileSync(shot, await page.shoot());
			console.log(`screenshot: ${shot}`);
		} finally {
			page.close();
		}
	} finally {
		server.close();
	}
}
