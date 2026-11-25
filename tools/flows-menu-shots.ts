import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundledSidebarPage, openedSidebar, rowOf } from "./flows-sidebar-harness.ts";

const OUT = process.argv[2] ?? "/tmp/menu-shots";
const FLOWS = "section[aria-label=General] .sumi-flows-row";
const FOLDERS = ".sumi-flows-row[data-kind=folder]";
const SETTLE_MS = 700;

const contextOn = (target: string): string =>
	`(() => { const row = ${target}; const box = row.getBoundingClientRect(); row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: box.left + 40, clientY: box.top + 10 })); })()`;

const leftOf = (selector: string): string =>
	`(() => { const node = document.querySelector(${JSON.stringify(selector)}); return node === null ? null : node.getBoundingClientRect().left; })()`;

async function shoot(page: AskedPage, name: string, theme: string): Promise<void> {
	writeFileSync(path.join(OUT, `v5-${name}-${theme}.png`), await page.shoot());
}

async function rowMenu(bundled: string, theme: string): Promise<void> {
	const opened = await openedSidebar(bundled, theme, "inbox");
	const { page } = opened;
	await page.ask(contextOn(rowOf(FLOWS, "Plugin layout")));
	await waited(SETTLE_MS);
	await page.ask(`[...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === "Move to").click()`);
	await waited(SETTLE_MS);
	const [x, y] = (await page.ask(
		`(() => { const box = document.querySelector("[role=menuitemradio]").getBoundingClientRect(); return [box.left + 40, box.top + box.height / 2]; })()`,
	)) as [number, number];
	await page.hover(x, y);
	await waited(SETTLE_MS);
	await shoot(page, "row-menu-move-to", theme);
	opened.stop();
}

async function folderMenu(bundled: string, theme: string): Promise<void> {
	const opened = await openedSidebar(bundled, theme, "inbox");
	const { page } = opened;
	await page.ask(contextOn(rowOf(FOLDERS, "Sumi")));
	await waited(SETTLE_MS);
	const [x, y] = (await page.ask(
		`(() => { const box = document.querySelector(".sumi-flows-picker-colors").getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
	)) as [number, number];
	await page.hover(x, y);
	await waited(SETTLE_MS);
	await shoot(page, "folder-menu-color", theme);
	const edges = {
		label: await page.ask(leftOf(".sumi-flows-menu-label")),
		firstDotCircle: await page.ask(
			`(() => { const box = document.querySelector(".sumi-flows-picker-color").getBoundingClientRect(); return box.left + (box.width - 12) / 2; })()`,
		),
		firstDotButton: await page.ask(leftOf(".sumi-flows-picker-color")),
		renameIcon: await page.ask(leftOf("[role=menuitem] .wg-kit-pop-icon")),
		labelTopGap: await page.ask(
			`(() => { const panel = document.querySelector(".sumi-flows-menu-colors").closest(".wg-kit-pop"); const label = document.querySelector(".sumi-flows-menu-label").getBoundingClientRect(); return [label.top - panel.getBoundingClientRect().top, document.querySelector(".sumi-flows-picker-colors").getBoundingClientRect().height]; })()`,
		),
		glide: await page.ask(
			`(() => { const glide = document.querySelector(".wg-kit-pop-glide"); const block = document.querySelector(".sumi-flows-menu-colors").getBoundingClientRect(); const box = glide.getBoundingClientRect(); return { opacity: glide.style.opacity, glideTop: box.top, glideHeight: box.height, blockTop: block.top, blockHeight: block.height }; })()`,
		),
	};
	console.log(`${theme} folder menu ${JSON.stringify(edges)}`);
	opened.stop();
}

mkdirSync(OUT, { recursive: true });
const bundled = await bundledSidebarPage();

for (const theme of ["light", "dark"]) {
	await rowMenu(bundled, theme);
	await folderMenu(bundled, theme);
}

console.log(`shots in ${OUT}`);
