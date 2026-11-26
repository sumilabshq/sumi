import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET, BROWSER_HOST_SHEET } from "./sheet-paths.mts";
import { check, tally } from "./check-helpers.ts";

const VIEW: readonly [number, number] = [1280, 800];
const SETTLE_MS = 700;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-canvas-home"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/canvas-home-page.tsx");
const sheets = [
	"design-systems/sumi/sumi.css",
	BROWSER_HOST_SHEET,
	BOARD_SHEET,
	"packages/shared/kit/side-panel.css",
	"plugins/canvas/src/features/canvas/ui/canvas-page/canvas-page.css",
	"plugins/canvas/src/shared/ui/top-row/top-row.css",
	"plugins/canvas/src/features/canvas-home/ui/canvas-home/canvas-home.css",
]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const DEMO_SHEET = `
html, body, #root, .canvas-home-demo { height: 100%; margin: 0; }
.canvas-home-demo { display: flex; }
body { background: var(--plate); font-family: var(--font-ui); color: var(--text); }
`;
const html = `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets}</style><style>${DEMO_SHEET}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
const file = path.join(shotsAt, "canvas-home.html");
writeFileSync(file, html);

async function shot(page: AskedPage, name: string): Promise<void> {
	writeFileSync(path.join(shotsAt, `${name}.png`), await page.shoot());
}

const CARDS = "document.querySelectorAll('.sumi-canvas-grid .sumi-canvas-card[data-canvas-card]')";
const NAMES = `[...${CARDS}].map((card) => card.querySelector('.sumi-canvas-card-name').textContent)`;
const SCROLL_TO = (top: string): string => `document.querySelector('.sumi-canvas-home-body').scrollTop = ${top}`;

const home = await paged(`${file}#home`, "test:canvas-home-paint", { size: VIEW, hearsFailures: true });
await waited(SETTLE_MS * 3);
check(
	"the home names the tab's place",
	await home.ask("document.querySelector('.sumi-canvas-top-row').textContent.includes('Canvases')"),
	true,
);
check(
	"open in chats shows one row of four",
	await home.ask("document.querySelectorAll('.sumi-canvas-home-row .sumi-canvas-card').length"),
	4,
);
check(
	"more than four canvases in chats offer Open all",
	await home.ask(
		"[...document.querySelectorAll('.sumi-canvas-home-quiet')].some((one) => one.textContent === 'Open all')",
	),
	true,
);
check(
	"a chip names its chat",
	String(
		await home.ask(
			"[...document.querySelectorAll('.sumi-canvas-card-chat-name')].map((one) => one.textContent).join()",
		),
	).includes("Заголовок чату та сесії"),
	true,
);
check(
	"the chip's dot is round",
	await home.ask(
		"(() => { const dot = document.querySelector('.sumi-canvas-card-chat-dot'); return parseFloat(getComputedStyle(dot).borderTopLeftRadius) >= dot.offsetHeight / 2; })()",
	),
	true,
);
check(
	"cards carry no border",
	await home.ask("getComputedStyle(document.querySelector('.sumi-canvas-card-cover')).boxShadow"),
	"none",
);
check(
	"the section head carries no count",
	await home.ask("document.querySelector('.sumi-canvas-home-head h2').textContent"),
	"Open in chats",
);
const firstNames = await home.ask(`${NAMES}.slice(0, 2).join()`);
check("the newest edit comes first", firstNames, "Sumi header,Canvas 299");
const drawnAtTop = Number(await home.ask(`${CARDS}.length`));
check("only the cards near the view are in the page, not all 301", drawnAtTop > 0 && drawnAtTop < 60, true);
await shot(home, "home");

await home.ask(SCROLL_TO("document.querySelector('.sumi-canvas-home-body').scrollHeight"));
await waited(SETTLE_MS * 2);
const namesAtEnd = String(await home.ask(`${NAMES}.join()`));
check("scrolled to the end, the last canvases are loaded", namesAtEnd.includes("Canvas 000"), true);
check("and the first ones left the page", namesAtEnd.includes("Canvas 299"), false);
check(
	"no waiting card is left at the end",
	await home.ask("document.querySelectorAll('.sumi-canvas-grid .sumi-canvas-card.is-waiting').length"),
	0,
);
const drawnAtEnd = Number(await home.ask(`${CARDS}.length`));
check("the page still holds only the cards near the view", drawnAtEnd > 0 && drawnAtEnd < 60, true);
await shot(home, "home-end");

await home.ask(SCROLL_TO("0"));
await waited(SETTLE_MS);
check(
	"scrolled back up, the first ones are drawn again",
	String(await home.ask(`${NAMES}.join()`)).includes("Canvas 299"),
	true,
);

await home.ask(
	"(() => { const field = document.querySelector('.sumi-canvas-search-field'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(field, 'canvas 12'); field.dispatchEvent(new Event('input', { bubbles: true })); })()",
);
await waited(SETTLE_MS * 2);
check(
	"search keeps the canvases whose title holds the words",
	await home.ask(`${NAMES}.join()`),
	"Canvas 129,Canvas 128,Canvas 127,Canvas 126,Canvas 125,Canvas 124,Canvas 123,Canvas 122,Canvas 121,Canvas 120",
);
await shot(home, "home-search");
check("the home heard no failure", home.failures(), []);
home.close();

const editor = await paged(`${file}#editor`, "test:canvas-home-paint", { size: VIEW, hearsFailures: true });
await waited(SETTLE_MS * 3);
check(
	"the editor's top row holds two plates",
	await editor.ask("document.querySelectorAll('.sumi-canvas-top-row > .sumi-canvas-plate').length"),
	2,
);
check(
	"the start plate reads only the canvas name",
	await editor.ask("document.querySelector('.sumi-canvas-plate').textContent.replace(/\\s+/g, ' ').trim()"),
	"Sumi header",
);
check(
	"the end plate shows the zoom in percent",
	/^\d+%$/.test(String(await editor.ask("document.querySelector('.sumi-canvas-top-button.is-zoom').textContent"))),
	true,
);
check(
	"the panel toggle shows the panel open",
	await editor.ask("document.querySelector('[aria-label=\"Hide pages and layers\"]').getAttribute('aria-pressed')"),
	"true",
);
check(
	"no plate blurs what passes under the row",
	await editor.ask("getComputedStyle(document.querySelector('.sumi-canvas-plate')).backdropFilter"),
	"none",
);
check(
	"the row fades the canvas field with a gradient 56px tall",
	await editor.ask(
		"(() => { const row = document.querySelector('.sumi-canvas-top-row'); return getComputedStyle(row).backgroundImage.startsWith('linear-gradient') && Math.round(row.getBoundingClientRect().height); })()",
	),
	56,
);
check(
	"the start plate sits as far from the row's left as from its top",
	await editor.ask(
		"(() => { const row = document.querySelector('.sumi-canvas-top-row').getBoundingClientRect(); const plate = document.querySelector('.sumi-canvas-plate').getBoundingClientRect(); return Math.round(plate.top - row.top) - Math.round(plate.left - row.left); })()",
	),
	0,
);
check(
	"no divider stands in the row",
	await editor.ask(
		"document.querySelectorAll('.sumi-canvas-top-row [role=separator], .sumi-canvas-top-row hr').length",
	),
	0,
);
check(
	"the panel starts under the row",
	await editor.ask(
		"Math.round(document.querySelector('.wg-kit-side-panel, [aria-label=\"Pages and layers\"]').getBoundingClientRect().top)",
	),
	44,
);
await shot(editor, "editor");

await editor.ask("document.querySelector('.sumi-canvas-top-button.is-zoom').click()");
await waited(SETTLE_MS);
await shot(editor, "editor-zoom-menu");
await editor.ask(
	"[...document.querySelectorAll('[role=menuitemradio]')].find((item) => item.textContent === '200%').click()",
);
await waited(SETTLE_MS * 2);
check(
	"200% in the menu zooms the field to 200%",
	await editor.ask("document.querySelector('.sumi-canvas-top-button.is-zoom').textContent"),
	"200%",
);

await editor.ask("document.querySelector('.sumi-canvas-top-button.is-title').click()");
await waited(SETTLE_MS);
check(
	"pressing the name opens its field",
	await editor.ask("document.querySelectorAll('.sumi-canvas-title-field').length"),
	1,
);
await shot(editor, "editor-renaming");
check("the editor heard no failure", editor.failures(), []);
editor.close();

console.log(`shots: ${shotsAt}`);
console.log(
	tally.failed ? `canvas home paint: ${tally.failed} check(s) failed` : "canvas home paint: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
