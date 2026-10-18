import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import type { Theme } from "./harness.ts";
import {
	BOARD,
	OBSIDIAN_CONTROLS,
	PLANNED,
	DRAWN,
	HOVER_PAINT,
	KEYED,
	METRICS,
	THEMED,
	TOOLTIP_OFFENDERS,
	isOpen,
	opened,
	pickedOf,
	pointOf,
	pressed,
	rowOf,
	searched,
} from "./app-picker-page.ts";

const VIEW: readonly [number, number] = [1800, 1000];
const THEMES: readonly Theme[] = ["light", "dark"];
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-app-picker"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const pageOf = (
	mode: string,
): string => `<!doctype html><html><head><meta charset="utf-8"><style>${OBSIDIAN_CONTROLS}</style><style>${sheets}</style></head>
<body class="theme-light"><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear(); window.__MODE__ = ${JSON.stringify(mode)};</script>
<script>${bundle}</script></body></html>`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

async function checksGroupsAndRows(page: AskedPage): Promise<void> {
	await opened(page);
	check("+ in the header opens the app picker", await isOpen(page), await isOpen(page));
	await waitUntil(async () => (await pickedOf(page)).groups.length === 2, 2000, 50);
	const picked = await pickedOf(page);
	check(
		"My apps lists the host's apps, then Built in",
		JSON.stringify(picked.groups) === JSON.stringify(["My apps", "Built in"]) &&
			rowOf(picked, "Apps/Barn")?.kind === "mine" &&
			rowOf(picked, "Apps/Barn")?.isOpenDisabled === true,
		picked.groups,
	);
	const browser = rowOf(picked, "browser");
	const canvas = rowOf(picked, "canvas");
	check(
		"Browser and Canvas carry a description, their permission chips and an Add",
		browser !== undefined &&
			browser.description.length > 0 &&
			JSON.stringify(browser.chips) === JSON.stringify(["Networkany site", "Inkread only"]) &&
			canvas !== undefined &&
			JSON.stringify(canvas.chips) === JSON.stringify(["Filesdesign/"]) &&
			browser.hasAdd &&
			canvas.hasAdd,
		{ browser, canvas },
	);
	const planned = picked.rows.filter((row) => row.kind === "planned");
	check(
		"every planned app is a disabled row with no Add, at the bottom",
		JSON.stringify(planned.map((row) => row.id)) === JSON.stringify(PLANNED) &&
			planned.every((row) => row.isDisabled && !row.hasAdd) &&
			picked.rows.slice(-PLANNED.length).every((row) => row.kind === "planned"),
		planned.map((row) => [row.id, row.isDisabled, row.hasAdd]),
	);
}

async function checksMetrics(page: AskedPage): Promise<void> {
	const metrics = await page.ask(METRICS);
	const wanted = {
		...BOARD,
		discPx: [BOARD.discPx, BOARD.discPx],
	};
	const differing = Object.entries(wanted).filter(
		([key, value]) => !isRecord(metrics) || JSON.stringify(metrics[key]) !== JSON.stringify(value),
	);
	check(
		"the picker's rows, disc, type, chips and Add measure as the board does",
		differing.length === 0 && isRecord(metrics) && metrics["isInView"] === true,
		{ metrics, differing: differing.map(([key]) => key) },
	);
}

async function checksSearch(page: AskedPage): Promise<void> {
	const byName = await searched(page, "term");
	const byDescription = await searched(page, "phone simulator");
	const mine = await searched(page, "barn");
	const none = await searched(page, "nothing like this");
	await searched(page, "");
	check(
		"search filters by name and by description, and hides an emptied group",
		JSON.stringify(byName.rows.map((row) => row.id)) === JSON.stringify(["terminal"]) &&
			JSON.stringify(byDescription.rows.map((row) => row.id)) === JSON.stringify(["ios-viewer"]) &&
			JSON.stringify(mine.groups) === JSON.stringify(["My apps"]) &&
			none.rows.length === 0,
		{
			byName: byName.rows.map((row) => row.id),
			byDescription: byDescription.rows.map((row) => row.id),
			mine: mine.groups,
		},
	);
	await page.ask(`${KEYED}("k", null)`);
	await waited(100);
	check(
		"⌘K focuses the search while the picker is open",
		(await page.ask(`document.activeElement?.matches("[data-host-picker-field]") === true`)) === true,
		await page.ask(`document.activeElement?.outerHTML.slice(0, 80) ?? null`),
	);
}

async function checksHover(page: AskedPage): Promise<void> {
	const rest = await page.ask(`${HOVER_PAINT}("canvas")`);
	const [x, y] = await pointOf(page, '[data-host-picker-row="canvas"] [data-host-picker-name]');
	await page.hover(x, y);
	await waited(200);
	const hovered = await page.ask(`${HOVER_PAINT}("canvas")`);
	check(
		"a hovered row takes the row fill and its Add turns dark",
		isRecord(rest) &&
			isRecord(hovered) &&
			rest["row"] !== hovered["row"] &&
			hovered["add"] === hovered["primary"] &&
			rest["add"] !== hovered["add"],
		{ rest, hovered },
	);
	const offenders = await page.ask(TOOLTIP_OFFENDERS);
	check(
		"every picker control has one tooltip and no native title",
		Array.isArray(offenders) && offenders.length === 0,
		offenders,
	);
}

async function checksAdd(page: AskedPage): Promise<void> {
	const before = rowOf(await pickedOf(page), "browser")?.count ?? -1;
	await pressed(page, '[data-host-new-tab="browser"]');
	const closedOnAdd = !(await isOpen(page));
	await opened(page);
	const after = rowOf(await pickedOf(page), "browser")?.count ?? -1;
	check("Add on Browser opens a new browser tab and its count goes up by one", closedOnAdd && after === before + 1, {
		before,
		after,
		closedOnAdd,
	});
}

async function checksClosing(page: AskedPage): Promise<void> {
	await opened(page);
	await page.ask(`${KEYED}("Escape", "[data-host-picker-field]")`);
	await waited(300);
	const afterEscape = await isOpen(page);
	await opened(page);
	await page.press(40, VIEW[1] - 40);
	await waited(300);
	check("Escape and a press outside close the picker", !afterEscape && !(await isOpen(page)), {
		afterEscape,
		afterOutside: await isOpen(page),
	});
}

async function shotsOf(page: AskedPage): Promise<void> {
	await opened(page);
	const [x, y] = await pointOf(page, '[data-host-picker-row="browser"] [data-host-picker-name]');
	await page.ask("document.activeElement?.blur?.(); true");
	for (const theme of THEMES) {
		await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
		await page.hover(x, y);
		await waited(200);
		writeFileSync(path.join(shotsAt, `picker-${theme}.png`), await page.shoot());
	}
	await page.ask(`${THEMED}("light")`);
}

async function checksNoHostApps(page: AskedPage): Promise<void> {
	await opened(page);
	const picked = await pickedOf(page);
	check(
		"with no apps from the host, My apps is not drawn",
		JSON.stringify(picked.groups) === JSON.stringify(["Built in"]),
		picked.groups,
	);
}

const server = http.createServer((request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(pageOf(request.url === "/bare" ? "studio" : "studio-workspaces"));
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

async function drawnPage(url: string, gate: string): Promise<AskedPage> {
	const page = await paged(url, gate, { size: VIEW });
	const drawn = await waitUntil(async () => (await page.ask(DRAWN)) === true, 5000, 50);
	check(`${gate}: the studio drew the header +`, drawn, drawn);
	await page.reduceMotion();
	await waited(300);
	return page;
}

const page = await drawnPage(origin, "app picker");

try {
	await checksGroupsAndRows(page);
	await checksMetrics(page);
	await checksSearch(page);
	await checksHover(page);
	await shotsOf(page);
	await checksAdd(page);
	await checksClosing(page);
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the studio drew without a failure", boom === "", boom);
} finally {
	page.close();
}

const barePage = await drawnPage(`${origin}bare`, "app picker, no host apps");

try {
	await checksNoHostApps(barePage);
} finally {
	barePage.close();
	server.close();
}

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "app picker: clean" : `app picker: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
