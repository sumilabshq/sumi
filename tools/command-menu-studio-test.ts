import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const VIEW: readonly [number, number] = [1440, 900];
const SETTLE_MS = 350;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-command-menu-studio"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/shell-frame-page.tsx");
const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
const file = path.join(shotsAt, "command-menu-studio.html");
writeFileSync(file, html);

const FIRST_PAINT = `new Promise((done) => {
	setTimeout(() => done("never painted: " + document.getElementById("boom").textContent), 15000);
	const seen = () => document.querySelector(".wg-shell .wg-plate-head.is-app") ? done("painted") : requestAnimationFrame(seen);
	seen();
})`;
const MENU = `(() => {
	const panel = document.querySelector(".wg-cm-panel");
	if (panel === null) return null;
	return {
		token: document.querySelector(".wg-cm-token")?.textContent ?? "",
		text: document.querySelector(".wg-cm-input")?.value ?? "",
		labels: [...document.querySelectorAll(".wg-cm-label")].map((one) => one.textContent),
		width: Math.round(panel.getBoundingClientRect().width),
		blur: getComputedStyle(panel).backdropFilter,
	};
})()`;
const ESCAPE_ONCE = `(() => {
	document.querySelector(".wg-cm-input")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	return document.querySelector(".wg-cm-layer") === null;
})()`;
const MOST_ESCAPES = 4;
const INTO_FIELD = (key: string, mods: string): string =>
	`(() => { const field = document.querySelector(".wg-cm-input"); field?.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, code: ${JSON.stringify(key.length === 1 ? `Key${key.toUpperCase()}` : key)}, bubbles: true, cancelable: true, ${mods} })); return true; })()`;
const PICKED = `document.querySelector('.wg-cm-row[aria-selected="true"]')?.textContent ?? null`;
const PRESS_KEY = (key: string): string =>
	`(() => { document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, code: ${JSON.stringify(`Key${key.toUpperCase()}`)}, metaKey: true, bubbles: true })); return true; })()`;

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

async function pressOn(page: AskedPage, selector: string): Promise<boolean> {
	const at = await page.ask(
		`(() => { const box = [...document.querySelectorAll(${JSON.stringify(selector)})].find((one) => one.getClientRects().length > 0)?.getBoundingClientRect(); return box ? [box.x + box.width / 2, box.y + box.height / 2] : null; })()`,
	);

	if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
		return false;
	}

	await page.press(at[0], at[1]);
	return true;
}

async function escapedAll(page: AskedPage): Promise<boolean> {
	for (let at = 0; at < MOST_ESCAPES; at += 1) {
		await page.ask(ESCAPE_ONCE);
		await waited(SETTLE_MS);

		if ((await page.ask(`document.querySelector(".wg-cm-layer") === null`)) === true) {
			return true;
		}
	}

	return false;
}

async function menuAfter(page: AskedPage): Promise<unknown> {
	await waited(SETTLE_MS);
	return page.ask(MENU);
}

const page = await paged(file, "test:command-menu-studio", { size: VIEW });

try {
	check(
		"the studio painted",
		(await page.ask(FIRST_PAINT)) === "painted",
		await page.ask(`document.getElementById("boom").textContent`),
	);
	const tip = await page.ask(
		`(() => { const button = document.querySelector("[data-cm-search]"); return button ? [button.dataset.tipSaid, button.dataset.tipKeys] : null; })()`,
	);
	check(
		"the chats column has a Search button with ⌘K in its tooltip",
		JSON.stringify(tip) === JSON.stringify(["Search", "⌘K"]),
		tip,
	);

	await pressOn(page, "[data-cm-search]");
	const fromSearch = await menuAfter(page);
	check(
		"the Search button opens the glass menu over the studio",
		JSON.stringify(fromSearch).includes('"width":680') && JSON.stringify(fromSearch).includes("blur(32px)"),
		fromSearch,
	);
	writeFileSync(path.join(shotsAt, "01-studio-search.png"), await page.shoot());
	check("Escape shuts it", await escapedAll(page), "shut");

	await page.ask(PRESS_KEY("k"));
	check("⌘K opens it from anywhere", (await menuAfter(page)) !== null, "open");
	const glass = await page.ask(
		`(() => { const look = getComputedStyle(document.querySelector(".wg-cm-panel")); return { blur: look.backdropFilter, background: look.backgroundColor }; })()`,
	);
	check(
		"the glass lets the blur through: blurred, and the plate is clearly see-through",
		JSON.stringify(glass).includes("blur(32px)") && /0\.7\d?\)|oklab|color\(srgb/.test(JSON.stringify(glass)),
		glass,
	);
	await page.ask(INTO_FIELD("Tab", ""));
	const before = await page.ask(PICKED);
	await page.ask(INTO_FIELD("ArrowDown", ""));
	await waited(SETTLE_MS);
	const after = await page.ask(PICKED);
	check(
		"after Tab the arrows still move the pick and the field keeps the focus",
		before !== after && (await page.ask(`document.activeElement?.className`)) === "wg-cm-input",
		[before, after],
	);
	await page.ask(INTO_FIELD("k", "metaKey: true"));
	await waited(SETTLE_MS);
	check("⌘K again closes it", (await page.ask(`document.querySelector(".wg-cm-layer") === null`)) === true, "shut");

	await page.ask(PRESS_KEY("k"));
	await waited(60);
	await page.ask(`window.__menuPanel = document.querySelector(".wg-cm-panel"); true`);
	await page.ask(INTO_FIELD("k", "metaKey: true"));
	await waited(40);
	const leaving = await page.ask(`Number(getComputedStyle(document.querySelector(".wg-cm-panel")).opacity)`);
	await page.ask(PRESS_KEY("k"));
	await waited(SETTLE_MS);
	const reversed = await page.ask(
		`document.querySelector(".wg-cm-panel") === window.__menuPanel && getComputedStyle(window.__menuPanel).opacity === "1"`,
	);
	check(
		"a close in the middle of opening turns back at once, and opening again reverses the same panel",
		typeof leaving === "number" && leaving < 1 && reversed === true,
		[leaving, reversed],
	);
	await escapedAll(page);

	const pressedNewTab = await pressOn(page, "[data-host-column-add]");
	const fromNewTab = await menuAfter(page);
	check(
		"the New tab row opens the menu at New tab",
		pressedNewTab && JSON.stringify(fromNewTab).includes('"token":"New tab"'),
		fromNewTab,
	);
	writeFileSync(path.join(shotsAt, "02-studio-new-tab.png"), await page.shoot());
	await escapedAll(page);

	await page.ask(PRESS_KEY("t"));
	const fromKey = await menuAfter(page);
	check(
		"⌘T opens the menu at New tab, not an empty page",
		JSON.stringify(fromKey).includes('"token":"New tab"'),
		fromKey,
	);
	await escapedAll(page);

	const pressedCrumb = await pressOn(page, ".wg-plate-head.is-app [data-plate-crumb]");
	const fromCrumb = await menuAfter(page);
	check(
		"the app plate's title opens the menu filled with what it shows",
		pressedCrumb &&
			JSON.stringify(fromCrumb).includes('"text":"Canvas"') &&
			JSON.stringify(fromCrumb).includes("Top hit"),
		fromCrumb,
	);
	const icons = await page.ask(
		`[...document.querySelectorAll('.wg-cm-row:is([data-cm-row="tab"], [data-cm-row="app"]) .wg-cm-icon')].map((icon) => icon.querySelector("img, svg")?.getAttribute("class") ?? "")`,
	);
	check(
		"tab and app rows draw the sidebar's tab art, never the plain kit glyph",
		Array.isArray(icons) && icons.length > 0 && icons.every((name) => !String(name).includes("wg-kit-icon")),
		icons,
	);
	writeFileSync(path.join(shotsAt, "03-studio-header.png"), await page.shoot());
	await escapedAll(page);
	check(
		"nothing failed on the page",
		(await page.ask(`document.getElementById("boom").textContent`)) === "",
		await page.ask(`document.getElementById("boom").textContent`),
	);
} finally {
	page.close();
}

console.log(`shots in ${shotsAt}`);

if (failed > 0) {
	console.log(`${failed} failed`);
	process.exit(1);
}
