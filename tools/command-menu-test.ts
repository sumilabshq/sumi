import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [1440, 900];
const SETTLE_MS = 250;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-command-menu"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/command-menu-page.tsx");
const sheets = [
	"design-systems/sumi/sumi.css",
	"packages/shared/core/browser-host.css",
	"apps/host-obsidian/styles.css",
	"apps/studio/src/features/command-menu/command-menu.css",
]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const DEMO_SHEET = `
html, body, #root { height: 100%; margin: 0; }
body { background: var(--sumi-frame); font-family: var(--sumi-font-ui); color: var(--sumi-text); }
.wg-cm-demo { display: flex; height: 100%; padding: 8px; gap: 8px; box-sizing: border-box; }
.wg-cm-demo-side { width: 268px; display: flex; flex-direction: column; gap: 8px; }
.wg-cm-demo-top { display: flex; justify-content: flex-end; padding: 12px 8px 0; }
.wg-cm-demo-new { margin-top: auto; height: 40px; border: 0; border-radius: 12px; background: var(--sumi-active); text-align: left; padding: 0 14px; font: inherit; }
.wg-cm-demo-plate { flex: 1; border-radius: 14px; background: var(--sumi-plate); padding: 10px 16px; }
.wg-cm-demo-crumb { border: 0; background: none; font: inherit; font-size: 15px; padding: 6px 8px; border-radius: 8px; }
`;

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function pageFileOf(theme: Theme): string {
	const html = `<!doctype html><html class="${theme === "dark" ? "dark theme-dark" : ""}"><head><meta charset="utf-8">
<style>${sheets}</style><style>${DEMO_SHEET}</style></head>
<body class="${theme === "dark" ? "theme-dark" : ""}"><div id="root"></div><pre id="boom"></pre>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const file = path.join(shotsAt, `command-menu-${theme}.html`);
	writeFileSync(file, html);
	return file;
}

const TYPE = (text: string): string => `(() => {
	const input = document.querySelector(".wg-cm-input");
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
	setValue.call(input, ${JSON.stringify(text)});
	input.dispatchEvent(new Event("input", { bubbles: true }));
	return input.value;
})()`;
const KEY = (key: string, mods: string): string => `(() => {
	const target = document.querySelector(".wg-cm-input") ?? window;
	target.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, code: ${JSON.stringify(key.length === 1 ? `Key${key.toUpperCase()}` : key)}, bubbles: true, ${mods} }));
	return true;
})()`;
const MENU = `(() => {
	const panel = document.querySelector(".wg-cm-panel");
	if (panel === null) return null;
	const style = getComputedStyle(panel);
	const box = panel.getBoundingClientRect();
	return {
		token: document.querySelector(".wg-cm-token")?.textContent ?? "",
		text: document.querySelector(".wg-cm-input")?.value ?? "",
		labels: [...document.querySelectorAll(".wg-cm-label")].map((one) => one.textContent),
		picked: document.querySelector('[aria-selected="true"].wg-cm-row, [aria-selected="true"].wg-cm-tile')?.textContent ?? "",
		tiles: document.querySelectorAll(".wg-cm-tile").length,
		foot: document.querySelector(".wg-cm-foot")?.textContent ?? "",
		width: Math.round(box.width),
		top: Math.round(box.top),
		radius: style.borderRadius,
		blur: style.backdropFilter,
		background: style.backgroundColor,
	};
})()`;

async function settled(page: AskedPage, expression: string): Promise<unknown> {
	await waited(SETTLE_MS);
	return page.ask(expression);
}

async function shot(page: AskedPage, name: string): Promise<void> {
	writeFileSync(path.join(shotsAt, `${name}.png`), await page.shoot());
}

async function centerOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const at = await page.ask(
		`(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [box.x + box.width / 2, box.y + box.height / 2]; })()`,
	);

	if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
		throw new Error(`no ${selector} on the page`);
	}

	return [at[0], at[1]];
}

const light = await paged(pageFileOf("light"), "test:command-menu", { size: VIEW });

try {
	await waited(800);
	check(
		"the page drew without a failure",
		(await light.ask(`document.getElementById("boom").textContent`)) === "",
		await light.ask(`document.getElementById("boom").textContent`),
	);
	const search = await centerOf(light, "[data-cm-search]");
	await light.hover(search[0], search[1]);
	await waited(900);
	const tip = await light.ask(
		`[document.querySelector("[data-cm-search]").dataset.tipSaid, document.querySelector("[data-cm-search]").dataset.tipKeys]`,
	);
	check("the search button names itself and its keys", JSON.stringify(tip) === JSON.stringify(["Search", "⌘K"]), tip);
	await shot(light, "01-search-tooltip");

	await light.press(search[0], search[1]);
	const home = await settled(light, MENU);
	check(
		"the search button opens the menu at Jump back in",
		JSON.stringify(home).includes("Jump back in") && JSON.stringify(home).includes("Commands"),
		home,
	);
	await shot(light, "02-home");

	await light.ask(TYPE("deep"));
	const found = await settled(light, MENU);
	check(
		"typing finds the chat as the top hit",
		JSON.stringify(found).includes("Top hit") && JSON.stringify(found).includes("Fix DeepL key lookup"),
		found,
	);
	await shot(light, "03-search");

	await light.ask(TYPE("github.com/ginetik"));
	const address = await settled(light, MENU);
	check("an address opens first", JSON.stringify(address).includes("Open github.com/ginetik"), address);
	await shot(light, "04-address");

	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));
	check("Escape clears, then closes", (await settled(light, MENU)) === null, "closed");

	await light.ask(KEY("k", "metaKey: true"));
	check("⌘K opens it from anywhere", (await settled(light, MENU)) !== null, "open");
	await light.ask(KEY("2", "metaKey: true"));
	await light.ask(TYPE("can"));
	const scoped = await settled(light, MENU);
	check("⌘2 looks in tabs only", JSON.stringify(scoped).includes('"labels":["Tabs"'), scoped);
	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));

	const newTab = await centerOf(light, "[data-demo-new-tab]");
	await light.press(newTab[0], newTab[1]);
	const tiles = await settled(light, MENU);
	check(
		"New tab opens the menu with apps and sites as tiles",
		JSON.stringify(tiles).includes('"token":"New tab"') && JSON.stringify(tiles).includes("Apps and sites"),
		tiles,
	);
	await shot(light, "05-new-tab");
	await light.ask(TYPE("figm"));
	const ghost = await settled(light, `document.querySelector(".wg-cm-ghost")?.textContent`);
	check("typing a site in New tab completes its address in grey", ghost === "figma.com", ghost);
	await shot(light, "06-new-tab-typed");
	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));

	const crumb = await centerOf(light, "[data-demo-crumb]");
	await light.press(crumb[0], crumb[1]);
	const here = await settled(light, MENU);
	check(
		"the header on an app tab opens a search filled with its name",
		JSON.stringify(here).includes('"token":""') && JSON.stringify(here).includes('"text":"Canvas"'),
		here,
	);
	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));

	await light.ask(KEY("k", "metaKey: true"));
	await light.ask(TYPE("example.com/board"));
	await settled(light, MENU);
	await light.ask(KEY("Enter", ""));
	check("Enter on an address opens it and shuts the menu", (await settled(light, MENU)) === null, "closed");
	await light.press(crumb[0], crumb[1]);
	const onPage = await settled(light, MENU);
	check(
		"the header on a page opens In this tab filled with its address",
		JSON.stringify(onPage).includes('"token":"In this tab"') &&
			JSON.stringify(onPage).includes('"text":"example.com/board"'),
		onPage,
	);
	await shot(light, "07-here");
	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));
	await light.ask(KEY("Escape", ""));

	await light.ask(KEY("k", "metaKey: true"));
	await light.ask(KEY("3", "metaKey: true"));
	await light.ask(TYPE("Ship it"));
	await settled(light, MENU);
	await light.ask(KEY("Enter", "shiftKey: true"));
	await waited(400);
	await light.ask(KEY("k", "metaKey: true"));
	await light.ask(KEY("3", "metaKey: true"));
	await light.ask(TYPE("ship"));
	const made = await settled(light, MENU);
	check("⇧↵ in Chats makes a chat that search then finds", JSON.stringify(made).includes("Ship it"), made);
	check(
		"the menu is glass: 680 wide, 16px corners, blurred",
		JSON.stringify(made).includes('"width":680') &&
			JSON.stringify(made).includes("16px") &&
			JSON.stringify(made).includes("blur(32px)"),
		made,
	);
} finally {
	light.close();
}

const dark = await paged(pageFileOf("dark"), "test:command-menu", { size: VIEW });

try {
	await waited(800);
	await dark.ask(KEY("k", "metaKey: true"));
	await dark.ask(TYPE("re"));
	const darkMenu = await settled(dark, MENU);
	check("dark theme paints the dark glass", JSON.stringify(darkMenu).includes("rgba(30, 30, 30, 0.92)"), darkMenu);
	await shot(dark, "08-dark");
} finally {
	dark.close();
}

console.log(`shots in ${shotsAt}`);

if (failed > 0) {
	console.log(`${failed} failed`);
	process.exit(1);
}
