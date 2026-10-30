import { writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { SETTLED_MS, check, lifted } from "./tabs-sidebar-check-kit.ts";
import { centreOf, pointedAt } from "./tabs-sidebar-scenes.ts";

const ESSENTIALS_FIT = `(() => { const grid = document.querySelector("[data-tabs-essentials]").getBoundingClientRect(); const tiles = [...document.querySelectorAll("[data-tabs-item=essential]")].map((tile) => tile.getBoundingClientRect()); const row = tiles.filter((tile) => Math.abs(tile.top - tiles[0].top) < 1); const last = row.at(-1); return { tiles: tiles.length, inRow: row.length, left: Math.round(row[0].left - grid.left), right: Math.round(grid.right - last.right), widths: [...new Set(row.map((tile) => Math.round(tile.width)))] }; })()`;
const KIT_MOTION_OF = `(() => { const menu = document.querySelector("[data-tabs-pointer-menu]"); const style = menu ? getComputedStyle(menu) : null; return { isKitMenu: menu?.classList.contains("wg-kit-float") ?? false, transition: style?.transitionProperty ?? null }; })()`;

export async function checksSidebarLook(page: AskedPage): Promise<void> {
	await checksKitMotion(page);
	await checksOneForm(page);
	await checksEssentialsWidth(page);
}

async function checksEssentialsWidth(page: AskedPage): Promise<void> {
	const full = await essentialsFitOf(page);
	check("eight Essentials stand in four equal columns that fill the row", isFilledRow(full, 4), full);

	for (const kept of [3, 1]) {
		await page.ask(`window.__SIDEBAR__.keepEssentials(${kept}); true`);
		await waited(SETTLED_MS);
		const fit = await essentialsFitOf(page);
		check(`${kept} Essentials fill the whole row in equal tiles`, fit["tiles"] === kept && isFilledRow(fit, kept), fit);
	}

	const tile = await centreOf(page, "[data-tabs-item=essential]");
	const start = await centreOf(page, "[data-tabs-list] > [data-tabs-item=tab]");
	const drag = await lifted(page, start, tile, 16);
	await waited(300);
	const room = await page.ask(
		`(() => { const grid = document.querySelector("[data-tabs-essentials]").getBoundingClientRect(); const tile = document.querySelector("[data-tabs-item=essential]").getBoundingClientRect(); return { half: Math.round((grid.width - 6) / 2), tile: Math.round(tile.width) }; })()`,
	);
	writeFileSync(
		path.join(path.dirname(String(await page.ask("location.pathname"))), "drag-into-one-essential.png"),
		await page.shoot(),
	);
	check(
		"a row carried over one Essential halves the row: the tile gives the drop the other half",
		typeof room === "object" && room !== null && Reflect.get(room, "tile") === Reflect.get(room, "half"),
		room,
	);
	await drag.drop(tile);
	await waited(SETTLED_MS);
	const two = await essentialsFitOf(page);
	check("dropping it there leaves two Essentials that fill the row", two["tiles"] === 2 && isFilledRow(two, 2), two);
}

async function checksKitMotion(page: AskedPage): Promise<void> {
	await page.ask(pointedAt("[data-tabs-list] > [data-tabs-item=tab]"));
	await waited(60);
	const menu = await page.ask(KIT_MOTION_OF);
	check(
		"a right-click menu is the kit's menu and blooms with the kit's scale",
		typeof menu === "object" &&
			menu !== null &&
			Reflect.get(menu, "isKitMenu") === true &&
			String(Reflect.get(menu, "transition")).includes("scale"),
		menu,
	);
	await page.ask(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`);
	await waited(300);
	await page.ask(
		`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); document.activeElement?.blur(); true`,
	);
	await page.hover(5, 5);
	await waited(300);
}

async function checksOneForm(page: AskedPage): Promise<void> {
	check(
		"the column has one form: no icon rail, no rail buttons, no app picker",
		(await page.ask(
			`document.querySelector("[data-host-rail], [data-host-column-toggle], [data-host-column-open-app], [data-host-app-picker]") === null && document.querySelector("[data-tabs-sidebar]") !== null`,
		)) === true,
		null,
	);
	check(
		"there is one sidebar: no tabs column of its own and no width edge",
		(await page.ask(`document.querySelector("[data-host-column], [data-host-column-edge]") === null`)) === true,
		null,
	);
}

async function essentialsFitOf(page: AskedPage): Promise<Record<string, unknown>> {
	const fit = await page.ask(ESSENTIALS_FIT);
	return typeof fit === "object" && fit !== null ? { ...fit } : {};
}

function isFilledRow(fit: Record<string, unknown>, inRow: number): boolean {
	const widths = fit["widths"];
	return (
		fit["inRow"] === inRow && fit["left"] === 0 && fit["right"] === 0 && Array.isArray(widths) && widths.length === 1
	);
}
