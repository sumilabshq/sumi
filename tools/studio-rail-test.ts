import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const VIEW: readonly [number, number] = [1400, 800];
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-rail"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = "studio-workspaces";</script>
<script>${bundle}</script></body></html>`;

const TILE_NAMED = `const nameOf = (tile) => document.getElementById(tile.getAttribute("aria-labelledby"))?.textContent ?? null;
const tileNamed = (said) => [...document.querySelectorAll(".wg-studio-rail button.wg-studio-rail-tile")].find((tile) => nameOf(tile) === said) ?? null;`;

const TILES = `(() => { ${TILE_NAMED} return [...document.querySelectorAll(".wg-studio-rail .wg-studio-rail-tile")].map((tile) => ({
	label: nameOf(tile),
	letter: tile.textContent.slice(0, tile.textContent.length - (nameOf(tile) ?? "").length).trim(),
	isCurrent: tile.getAttribute("aria-current") === "true",
	ring: getComputedStyle(tile).boxShadow,
	fill: getComputedStyle(tile).backgroundColor,
	ink: getComputedStyle(tile).color,
	ariaLabel: tile.getAttribute("aria-label"),
})); })()`;

const TOOLTIPS = `[...document.querySelectorAll('[role="tooltip"]')].filter((tip) => tip.getBoundingClientRect().width > 0).map((tip) => tip.textContent)`;

const TOKENS = `(() => {
	const probe = document.createElement("span");
	probe.style.background = "var(--wg-kit-fill)";
	probe.style.color = "var(--wg-kit-text)";
	document.querySelector(".wg-studio-rail").append(probe);
	const style = getComputedStyle(probe);
	const tokens = { fill: style.backgroundColor, ink: style.color };
	probe.remove();
	return tokens;
})()`;

const BORDER = `(() => {
	const rail = document.querySelector(".wg-studio-rail");
	const style = getComputedStyle(rail);
	return {
		edge: style.borderRightWidth + " " + style.borderRightStyle,
		colour: style.borderRightColor,
		railRight: rail.getBoundingClientRect().right,
		chatLeft: document.querySelector(".wg-studio-chat").getBoundingClientRect().left,
	};
})()`;

const MENU_TEXT = `document.querySelector(".wg-studio-menu")?.textContent ?? null`;

const OPENED = `JSON.stringify(window.__OPENED__)`;

interface Tile {
	readonly label: string;
	readonly letter: string;
	readonly isCurrent: boolean;
	readonly ring: string;
	readonly fill: string;
	readonly ink: string;
	readonly ariaLabel: string | null;
}

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function isTile(value: unknown): value is Tile {
	return typeof value === "object" && value !== null && "label" in value && "letter" in value;
}

async function tilesOf(page: AskedPage): Promise<readonly Tile[]> {
	const asked = await page.ask(TILES);
	return Array.isArray(asked) ? asked.filter(isTile) : [];
}

async function untilAnswered(page: AskedPage, expression: string): Promise<boolean> {
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await page.ask(expression)) === true) {
			return true;
		}

		await waited(50);
	}

	return false;
}

function pressOn(label: string, event: "click" | "contextmenu"): string {
	return `(() => { ${TILE_NAMED} tileNamed(${JSON.stringify(label)}).dispatchEvent(new MouseEvent("${event}", { bubbles: true, cancelable: true })); return true; })()`;
}

function tileLetterIs(label: string, letter: string): string {
	return `(() => { ${TILE_NAMED} return tileNamed(${JSON.stringify(label)})?.textContent.startsWith(${JSON.stringify(letter)}) === true; })()`;
}

function typedName(name: string): string {
	return `(() => {
		const field = document.querySelector('[data-name="Rename workspace"] input');
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(field, ${JSON.stringify(name)});
		field.dispatchEvent(new Event("input", { bubbles: true }));
		setTimeout(() => field.form.requestSubmit(), 50);
		return true;
	})()`;
}

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "studio rail", { size: VIEW });

try {
	await untilAnswered(page, `document.querySelectorAll(".wg-studio-rail .wg-studio-rail-tile").length === 3`);
	await waited(200);
	writeFileSync(path.join(shotsAt, "studio-rail.png"), await page.shoot());

	const tiles = await tilesOf(page);
	check(
		"the rail holds a letter tile per workspace, named in full, and a New workspace tile last",
		JSON.stringify(tiles.map(({ label, letter }) => [label, letter])) ===
			JSON.stringify([
				["Farm", "F"],
				["Barn", "B"],
				["New workspace", ""],
			]),
		tiles.map(({ label, letter }) => [label, letter]),
	);
	const tokens = await page.ask(TOKENS);
	const farm = tiles[0];
	check(
		"a tile is the kit's grey fill with the kit's text ink",
		typeof tokens === "object" &&
			tokens !== null &&
			farm !== undefined &&
			farm.fill === Reflect.get(tokens, "fill") &&
			farm.ink === Reflect.get(tokens, "ink"),
		{ tile: farm && [farm.fill, farm.ink], tokens },
	);
	check(
		"only the open workspace is marked, by a ring",
		tiles.map(({ isCurrent }) => isCurrent).join() === "true,false,false" &&
			farm !== undefined &&
			farm.ring !== "none" &&
			tiles.slice(1).every(({ ring }) => ring === "none"),
		tiles.map(({ isCurrent, ring }) => [isCurrent, ring]),
	);

	const labelled = await page.ask(
		`[...document.querySelectorAll(".wg-studio-rail[aria-label], .wg-studio-rail [aria-label]")].map((one) => one.getAttribute("aria-label"))`,
	);
	const railName = await page.ask(
		`document.getElementById(document.querySelector(".wg-studio-rail").getAttribute("aria-labelledby"))?.textContent ?? null`,
	);
	check(
		"nothing in the rail carries an aria-label, so a host that tooltips aria-labels draws no second tooltip",
		tiles.every(({ ariaLabel }) => ariaLabel === null) &&
			JSON.stringify(labelled) === "[]" &&
			railName === "Workspaces",
		{ labelled, railName },
	);
	await page.ask(
		`(() => { ${TILE_NAMED} const tile = tileNamed("Barn"); tile.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true })); tile.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })); tile.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); tile.dispatchEvent(new MouseEvent("mouseenter")); return true; })()`,
	);
	await untilAnswered(page, `${TOOLTIPS}.length > 0`);
	const tips = await page.ask(TOOLTIPS);
	const tipBox = await page.ask(
		`(() => { ${TILE_NAMED} const tip = document.querySelector('[role="tooltip"]').getBoundingClientRect(); return tip.left >= tileNamed("Barn").getBoundingClientRect().right; })()`,
	);
	check(
		"hovering a tile shows one tooltip with its full name, to the tile's right",
		JSON.stringify(tips) === '["Barn"]' && tipBox === true,
		{ tips, right: tipBox },
	);
	writeFileSync(path.join(shotsAt, "studio-rail-tooltip.png"), await page.shoot());

	const border = await page.ask(BORDER);
	check(
		"a 1px kit hairline separates the rail from the chat",
		typeof border === "object" &&
			border !== null &&
			Reflect.get(border, "edge") === "1px solid" &&
			!/(,|\/)\s*0\)$/.test(String(Reflect.get(border, "colour"))) &&
			Reflect.get(border, "railRight") === Reflect.get(border, "chatLeft"),
		border,
	);

	await page.ask(pressOn("Barn", "click"));
	await page.ask(pressOn("Farm", "click"));
	await waited(200);
	const openedByPress = await page.ask(OPENED);
	check("a press opens that workspace; the open one stays put", openedByPress === '["Apps/Barn"]', openedByPress);

	await page.ask(pressOn("New workspace", "click"));
	const created = await untilAnswered(page, tileLetterIs("Untitled workspace", "U"));
	const openedByNew = await page.ask(OPENED);
	check(
		"New workspace creates an Untitled workspace, opens it, and the rail lists it",
		created && openedByNew === '["Apps/Barn","Untitled workspace"]',
		{ created, opened: openedByNew },
	);

	await page.ask(pressOn("Farm", "contextmenu"));
	await untilAnswered(page, `document.querySelector('[data-name="Rename workspace"] input') !== null`);
	await page.ask(typedName("Ranch"));
	const renamed = await untilAnswered(page, tileLetterIs("Ranch", "R"));
	const renamedAsked = await page.ask(`JSON.stringify(window.__RENAMED__)`);
	check(
		"a right press renames the workspace through the host, and its tile follows",
		renamed && renamedAsked === '["Apps/Farm → Ranch"]',
		{ renamed, asked: renamedAsked },
	);

	await page.ask(`document.querySelector('.wg-studio-chat [aria-label$=" menu"]').click(); true`);
	await untilAnswered(page, `document.querySelector(".wg-studio-menu") !== null`);
	const menuText = String(await page.ask(MENU_TEXT));
	check(
		"the menu keeps Settings and Connect services and lists no workspaces",
		menuText.includes("Settings") &&
			menuText.includes("Connect services") &&
			!/Apps|New app|New workspace|Barn/.test(menuText),
		menuText,
	);
	writeFileSync(path.join(shotsAt, "studio-rail-menu.png"), await page.shoot());

	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
} finally {
	page.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "studio rail: clean" : `studio rail: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
