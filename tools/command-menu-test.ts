import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET, BROWSER_HOST_SHEET } from "./sheet-paths.mts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [1440, 900];
const SETTLE_MS = 250;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-command-menu"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/command-menu-page.tsx");
const sheets = [
	"design-systems/sumi/sumi.css",
	BROWSER_HOST_SHEET,
	BOARD_SHEET,
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
	target.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, code: ${JSON.stringify(key.length === 1 ? `Key${key.toUpperCase()}` : key)}, bubbles: true, cancelable: true, ${mods} }));
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
		head: document.querySelector(".wg-cm-head")?.textContent ?? "",
		active: document.querySelector('.wg-cm-mode[aria-pressed="true"]')?.dataset.cmMode ?? "",
		count: document.querySelector(".wg-cm-mode-count")?.textContent ?? "",
		mode: document.querySelector("[data-cm-field-icon]")?.dataset.cmFieldIcon ?? "",
		rows: [...document.querySelectorAll(".wg-cm-row .wg-cm-title")].map((one) => one.textContent),
		picked: document.querySelector('[aria-selected="true"].wg-cm-row, [aria-selected="true"].wg-cm-tile')?.textContent ?? "",
		tiles: document.querySelectorAll(".wg-cm-tile").length,
		foot: document.querySelector(".wg-cm-foot")?.textContent ?? "",
		width: Math.round(box.width),
		top: Math.round(box.top),
		radius: style.borderRadius,
		blur: style.backdropFilter,
		background: style.backgroundColor,
		shadow: style.boxShadow,
	};
})()`;

const COMPOSER = `(() => ({
	cards: document.querySelectorAll(".wg-cm-ask .wg-studio-ai-card").length,
	plus: document.querySelector(".wg-cm-ask .wg-studio-ai-plus") !== null,
	buttons: [...document.querySelectorAll(".wg-cm-ask .wg-studio-ai-strip-button")].map((one) => one.textContent.trim()),
	hasUsage: document.querySelector('.wg-cm-ask [aria-label="Usage"]') !== null,
	carried: document.querySelector("[data-cm-carried]")?.textContent ?? "",
	open: document.querySelector(".wg-cm-panel") !== null,
}))()`;
const PASTE = `(() => {
	const pixel = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (one) => one.charCodeAt(0));
	const files = new DataTransfer();
	files.items.add(new File([pixel], "shot.png", { type: "image/png" }));
	files.items.add(new File(["the build failed"], "build.txt", { type: "text/plain" }));
	document.querySelector(".wg-cm-input").dispatchEvent(new ClipboardEvent("paste", { clipboardData: files, bubbles: true, cancelable: true }));
	return true;
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
		"the search button opens Suggested, the three modes stand as text with their keys",
		JSON.stringify(home).includes('"mode":"find"') &&
			JSON.stringify(home).includes('"active":"anywhere"') &&
			JSON.stringify(home).includes('"head":"Suggested⌘KNew⌘NAsk⌘I"') &&
			(await light.ask(`document.querySelector(".wg-cm-switch") === null`)) === true,
		home,
	);
	await shot(light, "02-home");

	await light.ask(TYPE("canv"));
	const found = await settled(light, MENU);
	check(
		"typing counts what it found, picks the best and ends in the two fallbacks",
		JSON.stringify(found).includes('"active":"anywhere"') &&
			!JSON.stringify(found).includes('"count":""') &&
			JSON.stringify(found).includes('"picked":"Canvas') &&
			JSON.stringify(found).includes("Search “canv” on the web") &&
			JSON.stringify(found).includes("Ask Sumi about “canv”"),
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
	await light.ask(TYPE("why the build fails"));
	await settled(light, MENU);
	await light.ask(KEY("n", "metaKey: true"));
	const switched = await settled(light, MENU);
	check(
		"⌘N switches Suggested to New and keeps the text, Search the web first",
		JSON.stringify(switched).includes('"mode":"new"') &&
			JSON.stringify(switched).includes('"active":"new-tab"') &&
			JSON.stringify(switched).includes('"text":"why the build fails"') &&
			JSON.stringify(switched).includes('"rows":["Search the web","Ask Sumi"]'),
		switched,
	);
	await shot(light, "05-new-typed");
	await light.ask(KEY("n", "metaKey: true"));
	check("⌘N again closes it", (await settled(light, MENU)) === null, "closed");

	await light.ask(KEY("k", "metaKey: true"));
	await settled(light, MENU);
	const askMode = await centerOf(light, '[data-cm-mode="ask"]');
	await light.press(askMode[0], askMode[1]);
	await light.ask(TYPE("why the build fails"));
	const asking = await settled(light, MENU);
	const wash = await light.ask(`getComputedStyle(document.querySelector(".wg-cm-field"), "::after").opacity`);
	check(
		"pressing Ask turns on agent mode: Sumi's icon, the wash, Create and send, then Create only",
		JSON.stringify(asking).includes('"mode":"ask"') &&
			JSON.stringify(asking).includes('"active":"ask"') &&
			JSON.stringify(asking).includes('"rows":["Create and send","Create only"]') &&
			JSON.stringify(asking).includes("↵Create and send⇧↵Create only") &&
			Number(wash) > 0.9,
		{ asking, wash },
	);
	await shot(light, "05-asking");
	await light.ask(TYPE("? why the build fails"));
	await light.ask(KEY("k", "metaKey: true"));
	const unmarked = await settled(light, MENU);
	check(
		"a typed ? stays text: Suggested shows no agent mode",
		JSON.stringify(unmarked).includes('"mode":"find"') && !JSON.stringify(unmarked).includes('"rows":["Ask Sumi"'),
		unmarked,
	);
	await light.ask(KEY("i", "metaKey: true"));
	await settled(light, MENU);
	await light.ask(KEY("i", "metaKey: true"));
	check("⌘I opens Ask, ⌘I again closes it", (await settled(light, MENU)) === null, "closed");

	await light.ask(KEY("i", "metaKey: true"));
	await light.ask(TYPE("why the build fails"));
	const composer = await settled(light, COMPOSER);
	check(
		"Ask shows the chat composer's controls: +, the folder, Auto, Opus, Medium, and no Usage",
		JSON.stringify(composer) ===
			JSON.stringify({
				cards: 0,
				plus: true,
				buttons: ["translator", "Auto", "Opus", "Medium"],
				hasUsage: false,
				carried: "",
				open: true,
			}),
		composer,
	);
	await light.ask(PASTE);
	const pasted = await settled(light, COMPOSER);
	check(
		"files pasted into the field in Ask become the composer's cards",
		JSON.stringify(pasted).includes('"cards":2'),
		pasted,
	);
	await shot(light, "05-ask-composer");
	await light.ask(KEY("k", "metaKey: true"));
	const carried = await settled(light, COMPOSER);
	const carriedKinds = await light.ask(
		`[...document.querySelectorAll("[data-cm-carried] [data-kind]")].map((one) => one.dataset.kind)`,
	);
	check(
		"in Suggested the files stay in Ask: no cards, a chip counting them by kind",
		JSON.stringify(carried).includes('"cards":0') &&
			JSON.stringify(carried).includes('"carried":"2"') &&
			JSON.stringify(carriedKinds) === JSON.stringify(["image", "text"]),
		{ carried, carriedKinds },
	);
	await shot(light, "05-ask-carried");
	const chip = await centerOf(light, "[data-cm-carried]");
	await light.press(chip[0], chip[1]);
	const back = await settled(light, COMPOSER);
	check(
		"pressing the chip goes back to Ask with the files and the text",
		JSON.stringify(back).includes('"cards":2') &&
			(await light.ask(`document.querySelector(".wg-cm-input").value`)) === "why the build fails",
		back,
	);
	const folder = await centerOf(light, '.wg-cm-ask [aria-label="Choose a folder"]');
	await light.press(folder[0], folder[1]);
	await waited(SETTLE_MS);
	const recipes = await centerOf(light, ".wg-studio-ai-menu-row:nth-of-type(2)");
	const onTop = await light.ask(
		`document.elementFromPoint(${recipes[0]}, ${recipes[1]})?.closest(".wg-kit-pop") !== null`,
	);
	await shot(light, "05-ask-folder");
	await light.press(recipes[0], recipes[1]);
	const picked = await settled(light, COMPOSER);
	check(
		"the folder menu opens above the menu and a pick keeps the menu open",
		onTop === true &&
			JSON.stringify(picked).includes('"buttons":["recipes"') &&
			JSON.stringify(picked).includes('"open":true'),
		{ onTop, picked },
	);
	await light.ask(KEY("Enter", ""));
	await waited(SETTLE_MS);
	await light.ask(KEY("i", "metaKey: true"));
	await light.ask(TYPE("draft only"));
	await settled(light, MENU);
	await light.ask(KEY("Enter", "shiftKey: true"));
	const asked = await settled(light, "window.__ASKED__");
	check(
		"↵ creates and sends, ⇧↵ creates only",
		JSON.stringify(asked) ===
			JSON.stringify([
				{ text: "why the build fails", sends: true },
				{ text: "draft only", sends: false },
			]),
		asked,
	);

	const newTab = await centerOf(light, "[data-demo-new-tab]");
	await light.press(newTab[0], newTab[1]);
	const tiles = await settled(light, MENU);
	check(
		"New tab opens New with apps and sites as tiles",
		JSON.stringify(tiles).includes('"mode":"new"') && JSON.stringify(tiles).includes("Apps and sites"),
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
	const afterEnter = await settled(light, MENU);
	check("Enter on an address opens it and shuts the menu", afterEnter === null, afterEnter);
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
	await light.ask(TYPE("Ship it"));
	await settled(light, MENU);
	await light.ask(KEY("Enter", "metaKey: true"));
	await waited(400);
	await light.ask(KEY("k", "metaKey: true"));
	await light.ask(TYPE("ship"));
	const made = await settled(light, MENU);
	check("⌘↵ asks Sumi in a new chat that Find then finds", JSON.stringify(made).includes("Ship it"), made);
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
	check(
		"dark theme paints the dark plate as 90% glass",
		JSON.stringify(darkMenu).includes("color(srgb 0.12") && JSON.stringify(darkMenu).includes("/ 0.9)"),
		darkMenu,
	);
	await shot(dark, "08-dark");
} finally {
	dark.close();
}

console.log(`shots in ${shotsAt}`);

if (failed > 0) {
	console.log(`${failed} failed`);
	process.exit(1);
}
