import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundledSidebarPage, doubleClickOn, openedSidebar } from "./flows-sidebar-harness.ts";

const OUT = process.argv[2] ?? "/tmp/sumi-picker-shots";
const SETTLE_MS = 700;

async function openPicker(page: AskedPage): Promise<void> {
	await doubleClickOn(page, ".sumi-flows-row-main", "Reading list");
	await waited(300);
	const [x, y] = (await page.ask(
		`(() => { const box = document.querySelector(".sumi-flows-field-icon").getBoundingClientRect(); return [box.left + 10, box.top + 10]; })()`,
	)) as [number, number];
	await page.press(x, y);
	await waited(500);
}

async function hoverCell(page: AskedPage, index: number): Promise<void> {
	const [x, y] = (await page.ask(
		`(() => { const box = document.querySelectorAll(".sumi-flows-picker [role=option]")[${index}].getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`,
	)) as [number, number];
	await page.hover(x, y);
	await waited(SETTLE_MS);
}

async function shoot(page: AskedPage, name: string, theme: string): Promise<void> {
	writeFileSync(path.join(OUT, `${name}-${theme}.png`), await page.shoot());
}

async function shots(bundled: string, theme: string): Promise<void> {
	const icons = await openedSidebar(bundled, theme, "inbox");
	await openPicker(icons.page);
	await shoot(icons.page, "icons", theme);
	await hoverCell(icons.page, 3);
	await shoot(icons.page, "icons-hover", theme);
	icons.stop();

	const emoji = await openedSidebar(bundled, theme, "inbox");
	await openPicker(emoji.page);
	await emoji.page.ask(
		`[...document.querySelectorAll(".sumi-flows-picker [role=tab]")].find((tab) => tab.textContent === "Emoji").click()`,
	);
	await waited(1500);
	await shoot(emoji.page, "emoji", theme);
	await hoverCell(emoji.page, 5);
	await shoot(emoji.page, "emoji-hover", theme);
	emoji.stop();
}

mkdirSync(OUT, { recursive: true });
const bundled = await bundledSidebarPage();

for (const theme of ["dark", "light"]) {
	await shots(bundled, theme);
}

console.log(`shots in ${OUT}`);
