import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET, BROWSER_HOST_SHEET } from "./sheet-paths.mts";
import { check, tally } from "./check-helpers.ts";

const VIEW: readonly [number, number] = [1100, 1500];
const SETTLE_MS = 600;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-mcp-apps"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/mcp-apps-page.tsx");
const sheets = [
	"design-systems/sumi/sumi.css",
	BROWSER_HOST_SHEET,
	BOARD_SHEET,
]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const DEMO_SHEET = `
html, body, #root { height: 100%; margin: 0; }
body { background: var(--sumi-plate); font-family: var(--sumi-font-ui); color: var(--sumi-text); }
.mcp-apps-demo { width: 760px; margin: 0 auto; padding: 32px 0; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; font-size: 14px; }
.mcp-apps-demo p { margin: 0; }
.mcp-apps-demo-row { color: var(--wg-kit-text-muted); font-size: 12px; }
[data-demo-look] { align-self: stretch; }
`;
const html = `<!doctype html><html class="dark theme-dark"><head><meta charset="utf-8">
<style>${sheets}</style><style>${DEMO_SHEET}</style></head>
<body class="theme-dark"><div id="root"></div><pre id="boom"></pre>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
const file = path.join(shotsAt, "mcp-apps.html");
writeFileSync(file, html);

async function shot(page: AskedPage, name: string): Promise<void> {
	writeFileSync(path.join(shotsAt, `${name}.png`), await page.shoot());
}

const page = await paged(file, "test:mcp-apps-paint", { size: VIEW, hasFramesInProcess: true, hearsFailures: true });
await waited(SETTLE_MS * 2);
check("the mini canvas draws in the chat column", await page.ask("document.querySelectorAll('[data-mcp-app=\"canvas-mini\"] .sumi-mini-canvas').length"), 1);
check("it draws the shown page's three artboards", await page.ask("document.querySelectorAll('[data-mcp-app] .sumi-mini-canvas .sumi-canvas-board').length"), 3);
check("its head names every page", await page.ask("[...document.querySelectorAll('[data-mcp-app] .sumi-mini-canvas-page')].map((tab) => tab.textContent).join(',')"), "Report,Ideas");
check("its head opens the canvas through a sumi link", await page.ask("document.querySelector('.sumi-mcp-square').getAttribute('href')"), "sumi://canvas/tab-1");
check("the card fills the chat column, which lays its rows at their own width", await page.ask("Math.round(document.querySelector('[data-mcp-app] .sumi-mini-canvas').getBoundingClientRect().width)"), 760);
check("the card stands at its height", await page.ask("Math.round(document.querySelector('.sumi-mini-canvas').getBoundingClientRect().height)"), 420);
await shot(page, "mini-canvas");

const layerAt = "getComputedStyle(document.querySelector('.sumi-mini-canvas .sumi-canvas-layer')).transform";
const before = await page.ask(layerAt);
await page.drag({ from: [500, 400], to: [400, 360], steps: 8, stepMs: 16 });
await waited(SETTLE_MS);
check("a drag before any press leaves the field still: the chat keeps its scroll", await page.ask(layerAt), before);
await page.press(500, 400);
await waited(SETTLE_MS);
check("a press inside takes the field", await page.ask("document.querySelectorAll('[data-mcp-app] .sumi-mini-canvas-cover').length"), 0);
await page.drag({ from: [500, 400], to: [380, 340], steps: 10, stepMs: 16 });
await waited(SETTLE_MS);
check("then a drag pans the canvas", (await page.ask(layerAt)) !== before, true);
await shot(page, "mini-canvas-panned");

await page.ask("[...document.querySelectorAll('[data-mcp-app] .sumi-mini-canvas-page')].find((tab) => tab.textContent === 'Ideas').click()");
await waited(SETTLE_MS * 2);
check("a page tab switches the field to that page", await page.ask("document.querySelectorAll('[data-mcp-app] .sumi-mini-canvas .sumi-canvas-board').length"), 1);
check("and marks it shown", await page.ask("document.querySelector('.sumi-mini-canvas-page.is-shown').textContent"), "Ideas");
await shot(page, "mini-canvas-ideas");
check("the card wears each look", await page.ask("[...document.querySelectorAll('[data-mcp-card]')].map((card) => card.dataset.mcpCard).join(',')"), "tile,border,none");
check("the page heard no failure", page.failures(), []);
page.close();

console.log(`shots: ${shotsAt}`);
console.log(tally.failed ? `mcp apps paint: ${tally.failed} check(s) failed` : "mcp apps paint: all checks passed");
process.exit(tally.failed ? 1 : 0);
