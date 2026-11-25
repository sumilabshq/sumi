import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { shippedTauriSheet } from "./tauri-frontend-sheet.mts";

const OUT = "/tmp/settings-shots";
const WIDTHS = [1160, 720, 440];
const ALWAYS_ON = ["settings"];

const catalogue = globSync("plugins/**/metadata.json")
	.filter((file) => !file.includes("node_modules"))
	.map((file) => ({
		id: path.basename(path.dirname(file)),
		metadata: JSON.parse(readFileSync(file, "utf8")),
		requires: [],
		alwaysOn: ALWAYS_ON.includes(path.basename(path.dirname(file))),
	}));
const bundle = await bundleOf("tools/settings-page.tsx");
const FRESH_SHEETS = ["packages/shared/core/board.css", "apps/studio/dist/studio.css"];
const styles = [shippedTauriSheet(), ...FRESH_SHEETS.map((sheet) => readFileSync(sheet, "utf8"))]
	.map((sheet) => `<style>${sheet}</style>`)
	.join("");
const PAGE = `<!doctype html><html class="dark"><head><meta charset="utf-8">${styles}<style>body{margin:0;background:var(--frame,#0b0b0a)}</style></head>
<body class="dark"><script>window.addEventListener("error",(e)=>{window.__err=String(e.message)});</script><div id="root" class="wg-root"></div><script>window.__CATALOGUE__=${JSON.stringify(catalogue)};</script><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
mkdirSync(OUT, { recursive: true });

for (const width of WIDTHS) {
	const page = await paged(`${origin}?w=${width}`, "settings", { size: [width, 1400] });
	try {
		await waited(1000);
		console.log(
			JSON.stringify(
				await page.ask(
					`({ html: document.getElementById("root").innerHTML.length, bg: getComputedStyle(document.body).backgroundColor, err: window.__err ?? null })`,
				),
			),
		);
		writeFileSync(`${OUT}/appearance-${width}.png`, await page.shoot());
		if (width >= 900) {
			const field = `document.querySelector(".sumi-settings-search input")`;
			const typed = (words: string): string =>
				`(() => { const f = ${field}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(f, ${JSON.stringify(words)}); f.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`;
			const keyed = (key: string): string =>
				`${field}.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true }))`;
			const items = `[...document.querySelectorAll(".sumi-settings-nav .sumi-settings-item")].map((one) => one.textContent)`;
			const searched: Record<string, unknown> = {};
			await page.ask(
				`window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", metaKey: true, bubbles: true, cancelable: true })); true`,
			);
			searched.focusedByCmdF = await page.ask(`document.activeElement === ${field}`);
			await page.ask(typed("plu"));
			await waited(150);
			searched.afterTypingPlu = await page.ask(items);
			writeFileSync(`${OUT}/search-${width}.png`, await page.shoot());
			await page.ask(typed("zzz"));
			await waited(150);
			searched.afterTypingZzz = await page.ask(`document.querySelector(".sumi-settings-nav").textContent`);
			await page.ask(keyed("Escape"));
			await waited(150);
			searched.afterEscape = await page.ask(`${field}.value`);
			await page.ask(typed("plu"));
			await waited(150);
			await page.ask(keyed("Enter"));
			await waited(300);
			searched.afterEnter = await page.ask(
				`({ crumb: document.querySelector(".sumi-settings-crumb-now").textContent, query: ${field}.value })`,
			);
			console.log(JSON.stringify(searched));
			await page.ask(
				`[...document.querySelectorAll("button")].find((one) => one.textContent.trim() === "Appearance")?.click(); true`,
			);
			await waited(300);
		}

		await page.ask(`document.querySelector(".sumi-settings-body").scrollTop = 220; true`);
		await waited(300);
		writeFileSync(`${OUT}/appearance-scrolled-${width}.png`, await page.shoot());
		await page.ask(
			`[...document.querySelectorAll("button")].find((one) => one.textContent.trim() === "Plugins")?.click(); true`,
		);
		await waited(600);
		writeFileSync(`${OUT}/plugins-${width}.png`, await page.shoot());
		const card = (await page.ask(
			`(() => { const r = document.querySelector(".sumi-plugins-card").getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 3]; })()`,
		)) as [number, number];
		const resting = await page.ask(`getComputedStyle(document.querySelector(".sumi-plugins-card")).backgroundColor`);
		await page.hover(card[0], card[1]);
		await waited(300);
		console.log(
			JSON.stringify({
				resting,
				hovering: await page.ask(
					`(() => { const c = document.querySelector(".sumi-plugins-card"); return { hovered: c.matches(":hover"), bg: getComputedStyle(c).backgroundColor, card: getComputedStyle(c).getPropertyValue("--card") }; })()`,
				),
			}),
		);
		writeFileSync(`${OUT}/plugins-hover-${width}.png`, await page.shoot());
		await page.ask(`document.querySelector(".sumi-plugins-card-open")?.click(); true`);
		await waited(600);
		writeFileSync(`${OUT}/plugin-${width}.png`, await page.shoot());
	} finally {
		page.close();
	}
}

server.close();
console.log(`screenshots: ${OUT}`);
