import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";

const SHOT_DIR = path.resolve(process.argv[2] ?? tmpdir());
const LAYOUT = `body { margin: 0; background: var(--sumi-frame); }
.demo-window { display: flex; flex-direction: column; width: 900px; height: 520px; margin: 24px; background: var(--sumi-frame); box-shadow: 0 0 0 1px var(--sumi-line); }
.demo-header { display: flex; align-items: center; height: var(--sumi-header-h, 44px); padding: 0 8px 0 12px; border-bottom: 1px solid var(--sumi-line); }
.demo-tab { display: flex; align-items: center; height: 28px; padding: 0 12px; font: var(--sumi-fs-13) var(--sumi-font-ui); color: var(--sumi-text-2); }
.demo-tab.is-on { background: var(--sumi-selected); color: var(--sumi-text); }
.demo-fill { flex: 1; }
.demo-body { display: flex; flex: 1; min-height: 0; }
.demo-sidebar { display: flex; flex-direction: column; justify-content: space-between; width: 260px; border-right: 1px solid var(--sumi-line); }
.demo-rows { display: flex; flex-direction: column; padding: 12px 0; }
.demo-row { padding: 6px 16px; font: var(--sumi-fs-13) var(--sumi-font-ui); color: var(--sumi-text-2); }
.demo-row.is-on { background: var(--sumi-selected); color: var(--sumi-text); }
.demo-main { flex: 1; }`;

const bundle = await bundleOf("tools/workspace-switcher-page.tsx");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync(BOARD_SHEET, "utf8")}</style><style>${LAYOUT}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "workspace-switcher", { size: [960, 600] });

async function shot(name: string): Promise<void> {
	await waited(400);
	const at = path.join(SHOT_DIR, `ws-${name}.png`);
	writeFileSync(at, await page.shoot());
	console.log(`screenshot: ${at}`);
}

async function told(what: string, expression: string): Promise<void> {
	console.log(`${what}: ${JSON.stringify(await page.ask(expression))}`);
}

try {
	await waited(1200);
	await told(
		"strips",
		`({ header: document.querySelectorAll('[data-ws-strip="header"] [data-ws-strip-id]').length, sidebar: document.querySelectorAll('[data-ws-strip="sidebar"] [data-ws-strip-id]').length, current: document.querySelector('[data-ws-strip="header"] [aria-current="true"]')?.getAttribute('data-ws-strip-id'), dots: document.querySelectorAll('[data-ws-strip="header"] .sumi-ws-dot').length, boom: document.getElementById('boom').textContent })`,
	);
	await shot("1-strips");
	await page.ask(`document.querySelector('.sumi-control-menu-button').click()`);
	await waited(300);
	await page.ask(`document.querySelector('[data-ws-control]').click()`);
	await told(
		"submenu",
		`[...document.querySelectorAll('[data-ws-menu] .wg-kit-pop-item')].map((item) => item.textContent)`,
	);
	await shot("2-control-menu");
	await page.ask(`document.querySelector('[data-ws-item="look"]').click()`);
	await told(
		"editor",
		`({ name: document.querySelector('[data-ws-look] input[type="text"]')?.value, cells: document.querySelectorAll('[data-ws-look] [role="option"]').length })`,
	);
	await shot("3-name-and-icon");
	await page.ask(`document.querySelector('[data-ws-look] [data-ws-remove-icon]').click()`);
	await told(
		"after remove",
		`({ controlDot: document.querySelector('[data-ws-control] .sumi-ws-dot') !== null, headerDots: document.querySelectorAll('[data-ws-strip="header"] .sumi-ws-dot').length })`,
	);
	await shot("4-icon-removed");
	await page.ask(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
	await page.ask(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
	await waited(300);
	await page.ask(
		`document.querySelectorAll('[data-ws-strip="sidebar"] [data-ws-strip-id]')[1].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))`,
	);
	await told("strip editor", `document.querySelector('[data-ws-look] input[type="text"]')?.value`);
	await shot("5-strip-edit");
	console.log(`failures: ${JSON.stringify(page.failures())}`);
} finally {
	page.close();
	server.close();
}
