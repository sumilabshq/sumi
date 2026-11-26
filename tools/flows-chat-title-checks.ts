import http from "node:http";
import { readFileSync } from "node:fs";
import { paged, waited } from "./chrome-ask.ts";
import { check } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";

const WINDOW_SIZE = [1440, 900] as const;
const SIDEBAR_PX = 261;
const SPACE_4_PX = 16;
const TOLERANCE_PX = 1;
const TITLE_INSET_PX = 4;
const SETTLE_MS = 1200;
const SHEETS = [
	"packages/shared/core/board.css",
	"apps/studio/dist/studio.css",
	"apps/studio/src/features/frame/shell.css",
	"plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-page.css",
	"plugins/ai/sessions/src/features/sessions/ui/sessions-chip/sessions-chip.css",
];
const LAYOUT = `body{margin:0}.wg-shell{position:relative;width:100vw;height:100vh;overflow:hidden;--shell-chrome-left:78px}
.wg-pane{position:absolute;top:0;bottom:0;right:0}.wg-pane .wg-studio-chat{width:100%!important;max-width:none!important;padding:0!important}
.demo-chat{height:100%}.demo-chat .wg-studio-ai{position:relative;height:100%;display:flex;flex-direction:column}.demo-scroll{flex:1;padding:70px 24px 0}`;

const PROBE = `(() => {
	const left = (selector) => document.querySelector(selector).getBoundingClientRect().left;
	const head = getComputedStyle(document.querySelector(".wg-chat-head"));
	return { pane: left(".wg-pane"), head: left(".wg-chat-head"), title: left(".sumi-sessions-chip"), cornerStart: getComputedStyle(document.querySelector(".wg-pane")).getPropertyValue("--corner-start"), paddingStart: head.paddingInlineStart };
})()`;

interface Measured {
	readonly pane: number;
	readonly head: number;
	readonly title: number;
	readonly cornerStart: string;
	readonly paddingStart: string;
}

function pageOf(bundle: string, isDocked: boolean): string {
	const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
	const floats = isDocked ? "beside" : "covering";
	const corner = isDocked ? "" : "data-corner-start";
	return `<!doctype html><html><head><meta charset="utf-8">${styles}<style>${LAYOUT}</style></head><body class="wg-studio">
<div class="wg-studio wg-shell is-flat"><div class="sumi-sidebar-title" data-title-floats="${floats}"></div>
<div class="wg-pane" ${corner} data-corner-end style="left:${isDocked ? SIDEBAR_PX : 0}px"><div class="wg-studio-chat" style="height:100%"><div id="root" style="height:100%"></div></div></div></div>
<pre id="boom"></pre><script>${bundle}</script></body></html>`;
}

async function measured(html: string, name: string): Promise<Measured> {
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${String(port)}/?v=short`, name, { size: WINDOW_SIZE });
	try {
		await waited(SETTLE_MS);
		return (await page.ask(PROBE)) as Measured;
	} finally {
		page.close();
		server.close();
	}
}

export async function chatTitleChecks(): Promise<void> {
	const bundle = await bundleOf("tools/flows-chat-title-page.tsx");
	for (const isDocked of [true, false]) {
		const state = isDocked ? "docked" : "hidden";
		const seen = await measured(pageOf(bundle, isDocked), `chat-title-${state}`);
		console.log(`   chat title ${state}: ${JSON.stringify(seen)}`);
		const wantedPx = isDocked ? SPACE_4_PX : Number.parseFloat(seen.paddingStart);
		const textStartPx = seen.title + TITLE_INSET_PX - seen.pane;
		check(`${state}: the chat title text starts at the pane's left plus ${String(wantedPx)}px`, Math.abs(textStartPx - wantedPx) <= TOLERANCE_PX, true);
	}
}
