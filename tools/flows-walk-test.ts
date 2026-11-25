import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PageSize } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";
import { openedSidebar, rowOf } from "./flows-sidebar-harness.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

type Theme = "light" | "dark";
type Box = readonly [left: number, top: number, right: number, bottom: number];

interface MenuLook {
	readonly surface: readonly string[];
	readonly itemHeight: number;
	readonly iconPx: number;
	readonly motion: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const SHOTS_DIR = process.argv[2] ?? null;
const THEMES: readonly Theme[] = ["light", "dark"];
const WINDOW: PageSize = [1440, 900];
const SHORT_WINDOW: PageSize = [1440, 600];
const STUDIO_PORTAL_LAYER = "wg-root wg-portal wg-kit-portal-layer is-studio";
const CHAT_PANES_PX = [1440, 1067, 760];
const CHAT_COLUMN_PX = 640;
const EDGE_TOLERANCE_PX = 1;
const ANCHOR_GAP_MOST_PX = 12;
const SETTLE_MS = 600;
const DOUBLE_CLICK_GAP_MS = 150;
const SPOT_NEAR_CORNER: readonly [number, number] = [1430, 890];
const FLOWS = "section[aria-label=General] .sumi-flows-row";
const AUTO = '.wg-studio-ai-strip .wg-kit-btn[aria-label="Permission mode"]';
const OPEN_POP = ".wg-kit-pop.is-open";
const FIRST_TAB = ".sumi-flow-strip .sumi-pane-tab";
const ICON_BUTTON = ".sumi-flows-field-icon";
const PICKER = `${OPEN_POP}:has(.sumi-flows-picker)`;

const boxOf = (selector: string): string =>
	`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })()`;

const rowMain = (name: string): string => rowOf(".sumi-flows-row-main", name);

const sent = (target: string, event: string): string => `${target}.dispatchEvent(${event})`;

const menuLook = `(() => {
	const panel = document.querySelector(${JSON.stringify(OPEN_POP)});
	const item = panel.querySelector("[role=menuitem]");
	const look = getComputedStyle(panel);
	return {
		surface: [look.backgroundColor, look.borderTopWidth, look.borderTopColor, look.borderTopLeftRadius, look.boxShadow],
		itemHeight: item.getBoundingClientRect().height,
		iconPx: item.querySelector(".wg-kit-pop-icon svg").getBoundingClientRect().width,
		motion: [look.animationName, look.animationDuration, look.borderTopWidth].join(" "),
	};
})()`;

async function shot(page: AskedPage, name: string): Promise<void> {
	if (SHOTS_DIR === null) return;
	mkdirSync(SHOTS_DIR, { recursive: true });
	writeFileSync(path.join(SHOTS_DIR, `${name}.png`), await page.shoot());
}

function isInside([left, top, right, bottom]: Box, [width, height]: PageSize): boolean {
	return left >= 0 && top >= 0 && right <= width && bottom <= height;
}

function near(got: number, want: number, tolerance: number): boolean {
	return Math.abs(got - want) <= tolerance;
}

async function closeMenus(page: AskedPage): Promise<void> {
	await page.ask(
		`document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`,
	);
	await page.press(900, 600);
	await waited(SETTLE_MS);
}

function chatHtml(bundled: string, theme: Theme, panePx: number): string {
	const sheets = BROWSER_SHEET_SOURCES.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const dark = theme === "dark" ? " dark" : "";
	const script = bundled.replaceAll("</script", "<\\/script");
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style></head><body class="theme-${theme}${dark}" style="margin:0"><div class="${STUDIO_PORTAL_LAYER}"></div><div class="wg-chat-app wg-studio" style="width:${panePx}px;height:${WINDOW[1]}px"><div id="chat" class="wg-root wg-studio-ai-host" style="height:100%"></div></div><script>${script}</script></body></html>`;
}

async function inChat(
	bundled: string,
	theme: Theme,
	panePx: number,
	run: (page: AskedPage) => Promise<void>,
): Promise<void> {
	const html = chatHtml(bundled, theme, panePx);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/#talked`, "flows walk", { size: WINDOW });

	try {
		await waited(1500);
		await run(page);
	} finally {
		page.close();
		server.close();
	}
}

async function chatColumnChecks(page: AskedPage, theme: Theme, panePx: number): Promise<void> {
	const column = (await page.ask(boxOf(".wg-studio-ai-scroll-content"))) as Box;
	const field = (await page.ask(boxOf(".wg-studio-ai-field"))) as Box;
	const width = column[2] - column[0];
	check(
		`${theme} ${panePx}px pane: the message column keeps ${CHAT_COLUMN_PX}px (got ${width}px)`,
		near(width, CHAT_COLUMN_PX, EDGE_TOLERANCE_PX),
		true,
	);
	check(
		`${theme} ${panePx}px pane: the composer field lines up with the column`,
		near(field[0], column[0], EDGE_TOLERANCE_PX) && near(field[2], column[2], EDGE_TOLERANCE_PX),
		true,
	);
}

async function autoMenuChecks(page: AskedPage, theme: Theme): Promise<void> {
	const trigger = (await page.ask(boxOf(AUTO))) as Box;
	await page.ask(`document.querySelector(${JSON.stringify(AUTO)}).click()`);
	await waited(SETTLE_MS);
	const menu = (await page.ask(boxOf(OPEN_POP))) as Box;
	await shot(page, `auto-menu-${theme}`);
	check(`${theme}: the Auto menu stays inside the window`, isInside(menu, WINDOW), true);
	check(
		`${theme}: the Auto menu starts at its trigger's left edge`,
		near(menu[0], trigger[0], EDGE_TOLERANCE_PX),
		true,
	);
	check(
		`${theme}: the Auto menu flips up and sits right above its trigger`,
		menu[3] <= trigger[1] && trigger[1] - menu[3] <= ANCHOR_GAP_MOST_PX,
		true,
	);
}

async function chatChecks(theme: Theme): Promise<void> {
	const bundled = await bundleOf("tools/chat-composer-page.tsx");

	for (const panePx of CHAT_PANES_PX) {
		await inChat(bundled, theme, panePx, async (page) => {
			await chatColumnChecks(page, theme, panePx);
			await shot(page, `chat-${panePx}-${theme}`);

			if (panePx === WINDOW[0]) {
				await autoMenuChecks(page, theme);
			}
		});
	}
}

async function inSidebar(theme: Theme, size: PageSize, run: (page: AskedPage) => Promise<void>): Promise<void> {
	const opened = await openedSidebar(SIDEBAR_BUNDLE, theme, "inbox+board", size);

	try {
		await run(opened.page);
	} finally {
		opened.stop();
	}
}

async function openRowMenuAt(page: AskedPage, [x, y]: readonly [number, number]): Promise<void> {
	await page.ask(
		sent(
			rowOf(FLOWS, "Plugin layout"),
			`new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: ${x}, clientY: ${y} })`,
		),
	);
	await waited(SETTLE_MS);
}

async function sameMenuChecks(page: AskedPage, theme: Theme): Promise<void> {
	await openRowMenuAt(page, [60, 200]);
	const row = (await page.ask(menuLook)) as MenuLook;
	await shot(page, `row-menu-${theme}`);
	await destructiveChecks(page, theme);
	await closeMenus(page);
	await page.ask(
		sent(
			`document.querySelector(${JSON.stringify(FIRST_TAB)})`,
			`new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 400, clientY: 30 })`,
		),
	);
	await waited(SETTLE_MS);
	const tab = (await page.ask(menuLook)) as MenuLook;
	await closeMenus(page);
	check(`${theme}: the row menu draws the tab menu's surface`, row.surface, tab.surface);
	check(`${theme}: the row menu items are as tall as the tab menu's`, row.itemHeight, tab.itemHeight);
	check(`${theme}: the row menu icons are 14px like the tab menu's`, [row.iconPx, tab.iconPx], [14, 14]);
	check(`${theme}: the row menu and the tab menu fade and scale in 120ms with no border`, [row.motion, tab.motion], ["wg-kit-pop-in 0.12s 0px", "wg-kit-pop-in 0.12s 0px"]);
}

const resolvedColours = `(() => {
	const probe = document.createElement("span");
	document.querySelector(".wg-kit-portal-layer").append(probe);
	probe.style.color = "var(--danger)";
	probe.style.backgroundColor = "var(--danger-wash)";
	const look = getComputedStyle(probe);
	const colours = { danger: look.color, wash: look.backgroundColor };
	probe.remove();
	return colours;
})()`;

const deleteLook = `(() => {
	const item = [...document.querySelectorAll("${OPEN_POP} [role=menuitem]")].find((one) => one.textContent === "Delete flow");
	const glide = document.querySelector("${OPEN_POP} .wg-kit-pop-glide");
	return {
		text: getComputedStyle(item).color,
		icon: getComputedStyle(item.querySelector(".wg-kit-pop-icon svg")).color,
		glide: glide === null ? null : getComputedStyle(glide).backgroundColor,
		centre: (() => { const b = item.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })(),
	};
})()`;

interface DeleteLook {
	readonly text: string;
	readonly icon: string;
	readonly glide: string | null;
	readonly centre: readonly [number, number];
}

async function destructiveChecks(page: AskedPage, theme: Theme): Promise<void> {
	const colours = (await page.ask(resolvedColours)) as { readonly danger: string; readonly wash: string };
	const atRest = (await page.ask(deleteLook)) as DeleteLook;
	check(
		`${theme}: Delete flow draws red text and a red icon at rest`,
		[atRest.text, atRest.icon],
		[colours.danger, colours.danger],
	);
	await page.hover(atRest.centre[0], atRest.centre[1]);
	await waited(SETTLE_MS);
	const hovered = (await page.ask(deleteLook)) as DeleteLook;
	await shot(page, `delete-hover-${theme}`);
	check(
		`${theme}: hovered Delete flow keeps red text on a soft red wash`,
		[hovered.text, hovered.glide],
		[colours.danger, colours.wash],
	);
}

async function cornerMenuChecks(page: AskedPage, theme: Theme): Promise<void> {
	await openRowMenuAt(page, SPOT_NEAR_CORNER);
	const menu = (await page.ask(boxOf(OPEN_POP))) as Box;
	await shot(page, `corner-menu-${theme}`);
	await closeMenus(page);
	const [x, y] = SPOT_NEAR_CORNER;
	check(`${theme}: a menu opened by the bottom-right corner stays inside the window`, isInside(menu, WINDOW), true);
	check(
		`${theme}: and flips to end at the pointer`,
		near(menu[2], x, EDGE_TOLERANCE_PX) && near(menu[3], y, EDGE_TOLERANCE_PX),
		true,
	);
}

async function folderClickChecks(page: AskedPage, theme: Theme): Promise<void> {
	const folder = rowMain("Personal");
	const expanded = `${folder}?.getAttribute("aria-expanded") ?? null`;
	const before = await page.ask(expanded);
	await page.ask(`${folder}.click()`);
	await waited(DOUBLE_CLICK_GAP_MS);
	await page.ask(
		`(() => { const one = ${folder}; one.click(); ${sent("one", `new MouseEvent("dblclick", { bubbles: true, cancelable: true })`)}; })()`,
	);
	await waited(SETTLE_MS);
	check(`${theme}: a fast double click on a folder toggles it twice`, await page.ask(expanded), before);
	check(
		`${theme}: and does not start renaming`,
		await page.ask(`document.querySelectorAll(".sumi-flows-field").length`),
		0,
	);

	for (const key of ["F2", "Enter"]) {
		await page.ask(
			sent(
				rowMain("Personal"),
				`new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true })`,
			),
		);
		await waited(SETTLE_MS);
		check(
			`${theme}: ${key} on a folder row starts renaming`,
			await page.ask(`document.querySelectorAll(".sumi-flows-field").length`),
			1,
		);
		await page.ask(
			sent(
				`document.querySelector(".sumi-flows-field-input")`,
				`new KeyboardEvent("keydown", { key: "Escape", bubbles: true })`,
			),
		);
		await waited(SETTLE_MS);
	}

	await page.ask(sent(rowMain("Plugin layout"), `new MouseEvent("dblclick", { bubbles: true, cancelable: true })`));
	await waited(SETTLE_MS);
	check(
		`${theme}: a double click on a Flow row still renames it`,
		await page.ask(`document.querySelectorAll(".sumi-flows-field").length`),
		1,
	);
	await page.ask(
		sent(
			`document.querySelector(".sumi-flows-field-input")`,
			`new KeyboardEvent("keydown", { key: "Escape", bubbles: true })`,
		),
	);
	await waited(SETTLE_MS);
}

async function pickerBox(page: AskedPage, name: string): Promise<{ readonly button: Box; readonly picker: Box }> {
	await page.ask(sent(rowMain(name), `new KeyboardEvent("keydown", { key: "F2", bubbles: true, cancelable: true })`));
	await waited(SETTLE_MS);
	const button = (await page.ask(boxOf(ICON_BUTTON))) as Box;
	await page.press((button[0] + button[2]) / 2, (button[1] + button[3]) / 2);
	await waited(SETTLE_MS);
	return { button, picker: (await page.ask(boxOf(PICKER))) as Box };
}

async function pickerChecks(theme: Theme): Promise<void> {
	await inSidebar(theme, WINDOW, async (page) => {
		const { button, picker } = await pickerBox(page, "Plugin layout");
		await shot(page, `picker-below-${theme}`);
		check(
			`${theme}: the icon picker opens below the icon button`,
			picker[1] >= button[3] && picker[1] - button[3] <= ANCHOR_GAP_MOST_PX,
			true,
		);
		check(`${theme}: and starts at its left edge`, near(picker[0], button[0], EDGE_TOLERANCE_PX), true);
	});
	await inSidebar(theme, SHORT_WINDOW, async (page) => {
		const { button, picker } = await pickerBox(page, "Research");
		await shot(page, `picker-flipped-${theme}`);
		check(
			`${theme}: near the bottom edge the picker flips above the icon button`,
			picker[3] <= button[1] && button[1] - picker[3] <= ANCHOR_GAP_MOST_PX,
			true,
		);
		check(`${theme}: and stays inside the window`, isInside(picker, SHORT_WINDOW), true);
	});
}

async function sidebarChecks(theme: Theme): Promise<void> {
	await inSidebar(theme, WINDOW, async (page) => {
		await sameMenuChecks(page, theme);
		await cornerMenuChecks(page, theme);
		await folderClickChecks(page, theme);
	});
	await pickerChecks(theme);
}

const SIDEBAR_BUNDLE = await bundleOf("tools/flows-sidebar-page.tsx");

for (const theme of THEMES) {
	await chatChecks(theme);
	await sidebarChecks(theme);
}

console.log(tally.failed ? `flows walk: ${tally.failed} check(s) failed` : "flows walk: all checks passed");
process.exit(tally.failed ? 1 : 0);
