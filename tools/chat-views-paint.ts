import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { check, tally } from "./check-helpers.ts";

const ROOT = resolve(import.meta.dirname, "..");
const folder = mkdtempSync(join(tmpdir(), "chat-views-paint-"));
const SHOT = process.argv[2] ?? join(folder, "shot.png");

const VIEW = `
<div class="tabs">
	<div class="tab-list"><button>Picks</button><button>Spend</button></div>
	<div class="tab-panel">
		<div class="grid three">
			<a class="item" href="https://example.com/a"><img class="media" src="https://example.com/a.jpg" alt=""><span class="title">MacBook Air M4</span><span class="muted">13.6 inch, 16 GB</span><span class="price">€1 199</span></a>
			<a class="item" href="sumi://task/T-12"><img class="media" src="https://example.com/b.jpg" alt=""><span class="title">ThinkPad X1</span><span class="muted">14 inch, 32 GB</span><span class="price">€1 690</span></a>
			<div class="item"><img class="media" src="https://example.com/c.jpg" alt=""><span class="title">XPS 13</span><span class="muted">13.4 inch</span><span class="price">€1 049</span></div>
		</div>
	</div>
	<div class="tab-panel">
		<table class="chart" data-kind="bar"><thead><tr><th></th><th>2025</th><th>2026</th></tr></thead><tbody><tr><td>Q1</td><td>12</td><td>18</td></tr><tr><td>Q2</td><td>9</td><td>14</td></tr><tr><td>Q3</td><td>15</td><td>11</td></tr></tbody></table>
	</div>
</div>
<p class="muted">Ingredients <span class="meter" data-done="2" data-total="5"></span> 2 of 5</p>
<ul class="checklist"><li class="done">Milk, 500 ml</li><li class="done">Eggs, 2</li><li>Flour, 200 g</li></ul>
<ol class="steps checklist" data-walk="Cook step by step"><li><h3>Mix</h3><p>Whisk eggs with milk.</p></li><li><h3>Rest</h3><p>Twenty minutes.</p></li></ol>
<label><span>Currency</span><select id="currency"><option>EUR</option><option>UAH</option></select></label>
<pre data-language="ts">const total = prices.reduce((sum, price) => sum + price, 0);</pre>
<button data-opens="more">Specs</button><dialog id="more"><h3>Specs</h3><p>Full list.</p></dialog>
`;

const entry = join(folder, "entry.ts");
writeFileSync(
	entry,
	`import { frameOf } from ${JSON.stringify(join(ROOT, "plugins/ai/chat-views/src/features/chat-view/lib/frame-document.ts"))};
import { CODE_PART } from ${JSON.stringify(join(ROOT, "plugins/ai/chat-views/src/features/code-part/lib/code-part.ts"))};
import { tokenSheetOf } from ${JSON.stringify(join(ROOT, "plugins/ai/chat-views/src/features/chat-view/lib/live-tokens.ts"))};
const host = document.getElementById("host");
const heard = [];
window.addEventListener("message", (event) => heard.push(event.data));
frameOf({ html: ${JSON.stringify(VIEW)}, parts: [CODE_PART], host }).then((built) => {
	const frame = document.createElement("iframe");
	frame.sandbox = "allow-scripts";
	frame.srcdoc = built.source;
	frame.style.cssText = "display:block;width:100%;height:120px;border:0;background:transparent;color-scheme:dark";
	window.addEventListener("message", (event) => {
		if (event.source === frame.contentWindow && event.data.sumiView === "height") {
			frame.style.height = event.data.height + "px";
		}
	});
	host.append(frame);
	window.chatViewProbe = {
		heard,
		frame,
		tokenNames: built.tokenNames,
		switchToLight: () => {
			document.documentElement.classList.remove("dark");
			frame.style.colorScheme = "light";
			frame.contentWindow.postMessage({ sumiView: "tokens", css: tokenSheetOf(host, built.tokenNames) }, "*");
		},
	};
});
`,
);

const page = join(folder, "page.html");
writeFileSync(
	page,
	`<!doctype html><html class="dark"><head><meta charset="utf-8"><style>${readFileSync(join(ROOT, "design-systems/sumi/sumi.css"), "utf8")}</style>
<style>body{margin:0;background:var(--sumi-plate);color:var(--sumi-text);font:14px/1.6 var(--sumi-font-ui)}.column{width:768px;margin:0 auto;padding:32px 0;display:flex;flex-direction:column;gap:12px}</style></head>
<body><div class="column wg-chat-app"><p>Here are three laptops and last year's spend.</p><div id="host"></div><p>Prices are from the stores' pages today.</p></div>
<script>${await bundleOf(entry)}</script></body></html>`,
);

function chatCodeTokens(): string {
	const sheet = readFileSync(join(ROOT, "plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant.css"), "utf8");
	const opened = sheet.indexOf(".wg-chat-app {\n\t--sumi-code-foreground");
	return sheet.slice(opened, sheet.indexOf("}", opened) + 1);
}

const asked = await paged(page, "chat-views", {
	size: [832, 1500],
	hasFramesInProcess: true,
});
await waited(1500);
const probe = async (expression: string): Promise<unknown> => asked.ask(expression);
const heights = (await probe("JSON.stringify(window.chatViewProbe.heard.filter((m) => m.sumiView === 'height').map((m) => m.height))")) as string;
const reported: number[] = JSON.parse(heights);
check("the frame reports its height to the chat", reported.length > 0 && (reported.at(-1) ?? 0) > 300, true);
check("the frame is as tall as its view", await probe("Math.round(window.chatViewProbe.frame.getBoundingClientRect().height)"), reported.at(-1));
check("the view reads Sumi's tokens", (await probe("window.chatViewProbe.tokenNames.includes('--sumi-text') && window.chatViewProbe.tokenNames.includes('--sumi-accent-text')")) as boolean, true);
check("highlighted code reads the chat's code colours", (await probe("window.chatViewProbe.tokenNames.includes('--sumi-code-token-keyword')")) as boolean, true);
check("the frame sits on the chat's left edge", await probe("Math.round(window.chatViewProbe.frame.getBoundingClientRect().left - document.querySelector('.column p').getBoundingClientRect().left)"), 0);
writeFileSync(SHOT, await asked.shoot());
const inFrame = (expression: string): Promise<unknown> => asked.askInFrame("srcdoc", expression);
const panelsShown = "JSON.stringify([...document.querySelectorAll('.tab-panel')].map((panel) => !panel.hidden))";
check("the first tab shows its panel at start", await inFrame(panelsShown), "[true,false]");
await inFrame("document.querySelectorAll('.tab-list > button')[1].click()");
check("pressing the second tab shows its panel only", await inFrame(panelsShown), "[false,true]");
check("the pressed tab is the selected one", await inFrame("document.querySelectorAll('.tab-list > button')[1].getAttribute('aria-selected')"), "true");
await inFrame("document.querySelectorAll('.tab-list > button')[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
check("the right arrow wraps to the first tab", await inFrame(panelsShown), "[true,false]");
await probe("window.chatViewProbe.switchToLight()");
await waited(400);
writeFileSync(SHOT.replace(/\.png$/, "-light.png"), await asked.shoot());
asked.close();
console.log(`shots: ${SHOT}`);
console.log(tally.failed === 0 ? "chat views paint: all checks passed" : `chat views paint: ${tally.failed} checks failed`);
process.exit(tally.failed === 0 ? 0 : 1);
