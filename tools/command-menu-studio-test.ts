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
		head: document.querySelector(".wg-cm-head")?.textContent ?? "",
		active: document.querySelector('.wg-cm-mode[aria-pressed="true"]')?.dataset.cmMode ?? "",
		count: document.querySelector(".wg-cm-mode-count")?.textContent ?? "",
		mode: document.querySelector("[data-cm-field-icon]")?.dataset.cmFieldIcon ?? "",
		rows: [...document.querySelectorAll(".wg-cm-row .wg-cm-title")].map((one) => one.textContent),
		width: Math.round(panel.getBoundingClientRect().width),
		blur: getComputedStyle(panel).backdropFilter,
	};
})()`;
const ESCAPE_ONCE = `(() => {
	document.querySelector(".wg-cm-input")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	return document.querySelector(".wg-cm-layer") === null;
})()`;
const MOST_ESCAPES = 4;
const INSTANT_MS = 50;
const OPEN_LATENCY = `new Promise((done) => {
	const startedAt = performance.now();
	window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", metaKey: true, bubbles: true }));
	const seen = () => {
		const panel = document.querySelector(".wg-cm-panel");
		if (panel && getComputedStyle(panel).opacity === "1" && document.querySelector(".wg-cm-row")) {
			done(Math.round(performance.now() - startedAt));
			return;
		}
		if (performance.now() - startedAt > 3000) { done(-1); return; }
		requestAnimationFrame(seen);
	};
	seen();
})`;
const TYPING_LATENCY = (typed: string): string => `new Promise((done) => {
	const field = document.querySelector(".wg-cm-input");
	const before = document.querySelector(".wg-cm-list")?.textContent;
	const startedAt = performance.now();
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(field, ${JSON.stringify(typed)});
	field.dispatchEvent(new Event("input", { bubbles: true }));
	const seen = () => {
		if (document.querySelector(".wg-cm-list")?.textContent !== before) {
			done(Math.round(performance.now() - startedAt));
			return;
		}
		if (performance.now() - startedAt > 3000) { done(-1); return; }
		requestAnimationFrame(seen);
	};
	seen();
})`;
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

	await page.ask(`document.activeElement?.blur(); true`);
	const openMs = await page.ask(OPEN_LATENCY);
	check(
		`⌘K shows the menu with its rows in ${INSTANT_MS} ms or less`,
		typeof openMs === "number" && openMs >= 0 && openMs <= INSTANT_MS,
		openMs,
	);
	const typingMs = [
		await page.ask(TYPING_LATENCY("r")),
		await page.ask(TYPING_LATENCY("re")),
		await page.ask(TYPING_LATENCY("reo")),
	];
	check(
		`every keystroke redraws the rows in ${INSTANT_MS} ms or less`,
		typingMs.every((ms) => typeof ms === "number" && ms >= 0 && ms <= INSTANT_MS),
		typingMs,
	);
	await page.ask(TYPING_LATENCY(""));
	check("⌘K opens it from anywhere", (await menuAfter(page)) !== null, "open");
	const glass = await page.ask(
		`(() => { const look = getComputedStyle(document.querySelector(".wg-cm-panel")); return { blur: look.backdropFilter, background: look.backgroundColor }; })()`,
	);
	check(
		"the glass is blurred and the plate stays readable at 90%",
		JSON.stringify(glass).includes("blur(32px)") && /\/ 0\.9\)/.test(JSON.stringify(glass)),
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

	await page.ask(`document.activeElement?.blur(); true`);
	const flicked = await page.ask(`new Promise((done) => {
		const press = (target) => target.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", metaKey: true, bubbles: true, cancelable: true }));
		const startedAt = performance.now();
		press(window);
		const opened = () => {
			if (document.querySelector(".wg-cm-input") === null) {
				if (performance.now() - startedAt > 3000) { done(-1); return; }
				requestAnimationFrame(opened);
				return;
			}
			const pressedAt = performance.now();
			press(document.querySelector(".wg-cm-input"));
			const shut = () => {
				if (document.querySelector(".wg-cm-layer") === null) { done(Math.round(performance.now() - pressedAt)); return; }
				if (performance.now() - pressedAt > 3000) { done(-1); return; }
				requestAnimationFrame(shut);
			};
			shut();
		};
		opened();
	})`);
	check(
		`⌘K pressed the moment the menu appears shuts it in ${INSTANT_MS} ms or less`,
		typeof flicked === "number" && flicked >= 0 && flicked <= INSTANT_MS,
		flicked,
	);
	await escapedAll(page);

	await page.ask(`(() => {
		const field = document.createElement("input");
		field.setAttribute("data-under-menu", "");
		field.style.cssText = "position:fixed;left:620px;top:840px;width:200px;height:30px;z-index:1";
		document.body.append(field);
		return true;
	})()`);
	await page.ask(PRESS_KEY("k"));
	await menuAfter(page);
	await pressOn(page, "[data-under-menu]");
	await waited(SETTLE_MS);
	const underneath = await page.ask(
		`[document.activeElement?.hasAttribute("data-under-menu") ?? false, document.querySelector(".wg-cm-layer") === null]`,
	);
	check(
		"a press below the open menu shuts it and stays on the overlay",
		JSON.stringify(underneath) === JSON.stringify([false, true]),
		underneath,
	);
	await page.ask(`document.querySelector("[data-under-menu]")?.remove(); true`);

	await pressOn(page, "[data-cm-search]");
	await menuAfter(page);
	await pressOn(page, "[data-cm-search]");
	const searchAgain = await menuAfter(page);
	check("the Search button pressed while the menu is open shuts it", searchAgain === null, searchAgain);
	await escapedAll(page);

	const pressedNewTab = await pressOn(page, "[data-host-column-add]");
	const fromNewTab = await menuAfter(page);
	check(
		"the New tab row opens the menu in New",
		pressedNewTab && JSON.stringify(fromNewTab).includes('"mode":"new"'),
		fromNewTab,
	);
	writeFileSync(path.join(shotsAt, "02-studio-new-tab.png"), await page.shoot());
	await escapedAll(page);

	await page.ask(PRESS_KEY("t"));
	const fromKey = await menuAfter(page);
	check("⌘T opens the menu in New, not an empty page", JSON.stringify(fromKey).includes('"mode":"new"'), fromKey);
	await escapedAll(page);

	const pressedCrumb = await pressOn(page, ".wg-plate-head.is-app [data-plate-crumb]");
	const fromCrumb = await menuAfter(page);
	check(
		"the app plate's title opens the menu filled with what it shows",
		pressedCrumb &&
			JSON.stringify(fromCrumb).includes('"text":"Canvas"') &&
			JSON.stringify(fromCrumb).includes('"active":"anywhere"') &&
			!JSON.stringify(fromCrumb).includes('"count":""'),
		[pressedCrumb, fromCrumb, await page.ask(`document.querySelectorAll("[data-plate-crumb]").length`)],
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
	await page.ask(PRESS_KEY("n"));
	const fromN = await menuAfter(page);
	check("⌘N opens the menu in New", JSON.stringify(fromN).includes('"mode":"new"'), fromN);
	await page.ask(PRESS_KEY("n"));
	check("⌘N again closes it", (await menuAfter(page)) === null, "shut");
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
