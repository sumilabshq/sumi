import { writeFileSync } from "node:fs";
import path from "node:path";
import { waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { Measured } from "./tabs-sidebar-check-kit.ts";
import {
	CHAT_IDS,
	CHAT_TOP_IDS,
	GROUP_NAMES,
	LIST_IDS,
	PAINT_BUDGET_MS,
	SETTLED_MS,
	SHOWN_ID,
	TILE_IDS,
	TITLE,
	WORKSPACE_IDS,
	addFailures,
	check,
	failureCount,
	idsOf,
	lifted,
	menuPick,
	pressOn,
	printTimings,
	recordTiming,
	timed,
} from "./tabs-sidebar-check-kit.ts";
import { checksNativeDrag } from "./tabs-sidebar-drag-checks.ts";
import { checksSidebarLook } from "./tabs-sidebar-look-checks.ts";
import { centreOf, pointedAt } from "./tabs-sidebar-scenes.ts";

export async function checksSidebar(page: AskedPage, folder: string): Promise<number> {
	await checksPressing(page);
	await checksChats(page);
	await checksEssentialsMenu(page);
	await checksGroups(page);
	await checksRename(page);
	await checksDrag(page, folder);
	await checksSections(page, folder);
	addFailures(await checksNativeDrag(page, folder));
	await checksSidebarLook(page);
	printTimings();
	return failureCount();
}

async function checksPressing(page: AskedPage): Promise<void> {
	await timed(page, "show a tab", () => pressOn(page, '[data-tabs-id="tab-3"]'));
	check("pressing a row shows it", (await page.ask(SHOWN_ID)) === "tab-3", await page.ask(SHOWN_ID));
	const listed = await idsOf(page, LIST_IDS);
	await timed(page, "show an essential", () => pressOn(page, '[data-tabs-item=essential][data-tabs-id="essential-2"]'));
	check(
		"pressing an essential opens and shows it, and no row stays shown",
		(await page.ask(`document.querySelector('[data-tabs-id="essential-2"]').hasAttribute("data-shown")`)) === true &&
			(await page.ask(SHOWN_ID)) === null,
		await page.ask(SHOWN_ID),
	);
	check(
		"an Essential's tab never shows a second time in the chat's list",
		JSON.stringify(await idsOf(page, LIST_IDS)) === JSON.stringify(listed),
		await idsOf(page, LIST_IDS),
	);
	await checksWobblyPress(page);
	const before = await idsOf(page, CHAT_IDS);
	await pressOn(page, "[data-host-column-add]");
	await waited(SETTLED_MS);
	const token = await page.ask(`document.querySelector(".wg-cm-token")?.textContent ?? null`);
	check("New tab opens the command menu at New tab, with no empty page", token === "New tab", token);
	await timed(page, "new tab from the menu", () => pressOn(page, '[data-cm-tile="app"]'));
	const workspace = await idsOf(page, WORKSPACE_IDS);
	check(
		"a tab picked in New tab lands as the shown row of Tabs in workspace, above the chat's tabs",
		workspace.length === 1 &&
			workspace[0] === (await page.ask(SHOWN_ID)) &&
			JSON.stringify(await idsOf(page, CHAT_IDS)) === JSON.stringify(before) &&
			(await page.ask(`document.querySelector("[data-tabs-section]")?.dataset.tabsSection`)) === "workspace",
		[workspace, await idsOf(page, CHAT_IDS)],
	);
}

async function checksChats(page: AskedPage): Promise<void> {
	await page.ask(`window.__arm()`);
	await page.ask(`window.__armed.at = performance.now(); window.__SIDEBAR__.switchChat("chat-translator"); true`);
	await waited(SETTLED_MS);
	const measured = (await page.ask(`window.__result()`)) as Measured;
	recordTiming("switch chat", measured);
	check(
		`switch chat: first paint under ${PAINT_BUDGET_MS} ms`,
		measured.ms !== null && measured.ms < PAINT_BUDGET_MS,
		measured,
	);
	check(
		"switching chats swaps the list and the title",
		(await page.ask(TITLE)) === "Translator" &&
			JSON.stringify(await idsOf(page, CHAT_IDS)) === JSON.stringify(["tab-9", "tab-10", "tab-11"]) &&
			(await idsOf(page, WORKSPACE_IDS)).length === 1,
		[await idsOf(page, CHAT_IDS), await idsOf(page, WORKSPACE_IDS)],
	);
	check(
		"Essentials stay the same in another chat",
		(await idsOf(page, TILE_IDS)).length === 8,
		await idsOf(page, TILE_IDS),
	);
	await page.ask(`window.__SIDEBAR__.switchChat("chat-release"); true`);
	await waited(SETTLED_MS);
	check(
		"switching back brings the first chat's tabs back",
		(await idsOf(page, LIST_IDS)).includes("tab-2"),
		await idsOf(page, LIST_IDS),
	);
}

async function checksEssentialsMenu(page: AskedPage): Promise<void> {
	await timed(page, "open the tab menu", async () => {
		await page.ask(pointedAt('[data-tabs-id="tab-7"]'));
	});
	await waited(200);
	await timed(page, "add to Essentials", () => menuPick(page, "Add to Essentials"));
	const tiles = await idsOf(page, TILE_IDS);
	check(
		"Add to Essentials moves the tab out of the list into a ninth tile",
		tiles.length === 9 && !(await idsOf(page, LIST_IDS)).includes("tab-7"),
		tiles,
	);
	await page.ask(pointedAt(`[data-tabs-item=essential][data-tabs-id="${tiles.at(-1) ?? ""}"]`));
	await waited(250);
	await timed(page, "remove from Essentials", () => menuPick(page, "Remove from Essentials"));
	check(
		"Remove from Essentials puts the live tab back at the end of Tabs in workspace",
		(await idsOf(page, WORKSPACE_IDS)).at(-1) === "tab-7" && (await idsOf(page, TILE_IDS)).length === 8,
		await idsOf(page, WORKSPACE_IDS),
	);
}

async function checksGroups(page: AskedPage): Promise<void> {
	await page.ask(pointedAt("[data-tabs-list]"));
	await waited(250);
	await timed(page, "new group", () => menuPick(page, "New group"));
	await waited(200);
	check(
		"New group makes a grey group named New group and opens its menu",
		JSON.stringify(await idsOf(page, GROUP_NAMES)).includes('"New group"') &&
			(await page.ask(`document.querySelector("[data-tabs-group-menu]") !== null`)) === true,
		await idsOf(page, GROUP_NAMES),
	);
	check(
		"the group menu stands in the kit's popover",
		(await page.ask(`document.querySelector("[data-tabs-group-menu]")?.closest(".wg-kit-pop") != null`)) === true,
		null,
	);
	await timed(page, "colour a group", () => pressOn(page, "[data-tabs-hue=green]"));
	check(
		"picking a colour tints the group",
		(await page.ask(`document.querySelectorAll("[data-tabs-box][data-hue=green]").length`)) === 1,
		null,
	);
	await page.ask(
		`document.activeElement?.blur(); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`,
	);
	await waited(250);
	await page.ask(pointedAt('[data-tabs-id="tab-8"]'));
	await waited(250);
	await timed(page, "new group with this tab", () => menuPick(page, "New group with this tab"));
	await waited(200);
	check(
		"a group made with a chat's tab is that list's own New group and holds the tab",
		(await idsOf(page, GROUP_NAMES)).filter((name) => name === "New group").length === 2 &&
			(await page.ask(
				`document.querySelector('[data-tabs-list]:not([data-tabs-list="workspace"]) [data-tabs-box] [data-tabs-id="tab-8"]') !== null`,
			)) === true,
		await idsOf(page, GROUP_NAMES),
	);
	const isMenuOpen = await waitUntil(
		async () => (await page.ask(`document.querySelector("[data-tabs-group-menu]") !== null`)) === true,
		1500,
		50,
	);
	check(
		"the group made with a tab opens its menu",
		isMenuOpen,
		await page.ask(`document.activeElement?.outerHTML.slice(0, 80)`),
	);
	await timed(page, "close a group's tabs", () => pressOn(page, "[data-tabs-group-action=close]"));
	check(
		"Close 1 tab closes the tab and drops the group",
		!(await idsOf(page, LIST_IDS)).includes("tab-8") &&
			(await idsOf(page, GROUP_NAMES)).filter((name) => name === "New group").length === 1,
		await idsOf(page, GROUP_NAMES),
	);
	await timed(page, "fold a group", () => pressOn(page, '[data-tabs-item=group][data-tabs-id="group-12"]'));
	check(
		"pressing a group head folds it",
		!(await idsOf(page, LIST_IDS)).includes("tab-3"),
		await idsOf(page, LIST_IDS),
	);
	await pressOn(page, '[data-tabs-item=group][data-tabs-id="group-12"]');
	await waited(SETTLED_MS);
	await page.ask(pointedAt('[data-tabs-item=group][data-tabs-id="group-13"]'));
	await waited(300);
	await timed(page, "ungroup", () => pressOn(page, "[data-tabs-group-action=ungroup]"));
	check(
		"Ungroup spills the group's tabs into the list where it stood",
		!JSON.stringify(await idsOf(page, GROUP_NAMES)).includes("Research") &&
			(await page.ask(`document.querySelector('[data-tabs-list] > [data-tabs-id="tab-5"]') !== null`)) === true,
		await idsOf(page, GROUP_NAMES),
	);
}

async function checksRename(page: AskedPage): Promise<void> {
	await page.ask(pointedAt('[data-tabs-id="tab-5"]'));
	await waited(250);
	await menuPick(page, "Rename");
	await waited(300);
	await page.ask(
		`(() => { const field = document.querySelector("[data-host-tab-rename]"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(field, "Material notes"); field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); return true; })()`,
	);
	await waited(SETTLED_MS);
	check(
		"Rename edits the row in place",
		(await page.ask(`document.querySelector('[data-tabs-id="tab-5"] [data-tabs-words]')?.textContent`)) ===
			"Material notes",
		null,
	);
}

async function checksWobblyPress(page: AskedPage): Promise<void> {
	const tiles = await idsOf(page, TILE_IDS);
	const listed = await idsOf(page, LIST_IDS);
	const bottom = await page.ask(
		`(() => { const box = document.querySelector('[data-tabs-item=essential]:last-child').getBoundingClientRect(); return [box.left + box.width / 2, box.bottom - 3]; })()`,
	);
	const from = Array.isArray(bottom) ? ([Number(bottom[0]), Number(bottom[1])] as const) : ([0, 0] as const);
	const to = [from[0], from[1] + 9] as const;
	await (await lifted(page, from, to, 3)).drop(to);
	await waited(SETTLED_MS);
	check(
		"a press on an Essential that wobbles below it keeps it an Essential and adds no row",
		JSON.stringify(await idsOf(page, TILE_IDS)) === JSON.stringify(tiles) &&
			JSON.stringify(await idsOf(page, LIST_IDS)) === JSON.stringify(listed),
		[await idsOf(page, TILE_IDS), await idsOf(page, LIST_IDS)],
	);
}

async function dragged(page: AskedPage, action: string, from: string, to: readonly [number, number]): Promise<void> {
	const start = await centreOf(page, from);
	await timed(page, action, async () => {
		const drag = await lifted(page, start, to);
		await waited(260);
		await drag.drop(to);
	});
}

async function checksDrag(page: AskedPage, folder: string): Promise<void> {
	const order = await idsOf(page, LIST_IDS);
	const target = await centreOf(page, '[data-tabs-list] > [data-tabs-id="tab-6"]');
	await dragged(page, "drag a row up the list", '[data-tabs-list] > [data-tabs-id="tab-7"]', [
		target[0],
		target[1] - 10,
	]);
	const reordered = await idsOf(page, LIST_IDS);
	check(
		"dragging a row above another reorders the list",
		reordered.indexOf("tab-7") === reordered.indexOf("tab-6") - 1 && reordered.length === order.length,
		reordered,
	);
	const intoGroup = await centreOf(page, '[data-tabs-box="group-12"] [data-tabs-id="tab-3"]');
	await dragged(page, "drag a row into a group", '[data-tabs-list] > [data-tabs-id="tab-7"]', [
		intoGroup[0],
		intoGroup[1] - 8,
	]);
	check(
		"dragging a row onto a group's row puts it in the group",
		(await page.ask(`document.querySelector('[data-tabs-box="group-12"] [data-tabs-id="tab-7"]') !== null`)) === true,
		await idsOf(page, LIST_IDS),
	);
	const tile = await centreOf(page, '[data-tabs-item=essential][data-tabs-id="essential-3"]');
	const start = await centreOf(page, '[data-tabs-id="tab-5"]');
	await page.ask(`window.__arm()`);
	const drag = await lifted(page, start, tile, 16);
	await waited(300);
	const room = await page.ask(
		`(() => { const row = document.querySelector('[data-tabs-id="tab-5"]'); const shifted = [...document.querySelectorAll("[data-tabs-item=essential]")].filter((one) => one.style.transform !== "").length; return { shifted, rowHidden: getComputedStyle(row).visibility === "hidden" }; })()`,
	);
	writeFileSync(path.join(folder, "drag-into-essentials.png"), await page.shoot());
	check(
		"over Essentials the tiles make room and the dragged row leaves its place in the list",
		typeof room === "object" &&
			room !== null &&
			Number(Reflect.get(room, "shifted")) > 0 &&
			Reflect.get(room, "rowHidden") === true,
		room,
	);
	await drag.drop(tile);
	await waited(SETTLED_MS);
	const into = (await page.ask(`window.__result()`)) as Measured;
	recordTiming("drag a row into Essentials", into);
	check(
		"dropping it on Essentials makes it an Essential",
		(await idsOf(page, TILE_IDS)).length === 9 && !(await idsOf(page, LIST_IDS)).includes("tab-5"),
		await idsOf(page, TILE_IDS),
	);
	check(`dragging keeps every frame under 50 ms`, into.worstFrame < 50, into);
	const listEnd = await centreOf(page, "[data-host-column-add]");
	await dragged(
		page,
		"drag an Essential out to the list",
		`[data-tabs-item=essential][data-tabs-id="${(await idsOf(page, TILE_IDS))[2] ?? ""}"]`,
		[listEnd[0], listEnd[1] - 60],
	);
	check(
		"dragging an Essential out makes it a row at the end of the list",
		(await idsOf(page, TILE_IDS)).length === 8 && (await idsOf(page, LIST_IDS)).at(-1) === "tab-5",
		await idsOf(page, LIST_IDS),
	);
	check(
		"no transform is left behind after a drop",
		(await page.ask(
			`[...document.querySelectorAll("[data-tabs-sidebar] [style*=transform]")].filter((one) => one.style.transform !== "").length`,
		)) === 0,
		null,
	);
}

async function checksSections(page: AskedPage, folder: string): Promise<void> {
	const target = await centreOf(page, '[data-tabs-list="workspace"] > [data-tabs-item=tab]');
	const moved = (await idsOf(page, CHAT_TOP_IDS)).find((id) => id !== "tab-5") ?? "";
	await dragged(page, "drag a row into another section", `[data-tabs-list] > [data-tabs-id="${moved}"]`, [
		target[0],
		target[1] - 10,
	]);
	check(
		"dragging a chat's row onto Tabs in workspace moves it there, first",
		(await idsOf(page, WORKSPACE_IDS))[0] === moved && !(await idsOf(page, CHAT_IDS)).includes(moved),
		[await idsOf(page, WORKSPACE_IDS), await idsOf(page, CHAT_IDS)],
	);
	await page.ask(pointedAt(`[data-tabs-id="${moved}"]`));
	await waited(250);
	await menuPick(page, "Move to section");
	await waited(250);
	await timed(page, "move to the chat's section", () =>
		pressOn(page, '[data-tabs-move-to-list]:not([data-tabs-move-to-list="workspace"])'),
	);
	check(
		"Move to section → the chat puts a workspace tab at the end of the chat's tabs",
		(await idsOf(page, CHAT_IDS)).at(-1) === moved && !(await idsOf(page, WORKSPACE_IDS)).includes(moved),
		await idsOf(page, CHAT_IDS),
	);
	await page.hover(5, 5);
	await waited(300);
	writeFileSync(path.join(folder, "tabs-sections.png"), await page.shoot());
	await page.ask(pointedAt(`[data-tabs-id="${moved}"]`));
	await waited(250);
	const isOpen = (await page.ask(`document.querySelector("[data-tabs-pointer-menu]") !== null`)) === true;
	const empty = await centreOf(page, "[data-host-column-add]");
	await page.press(empty[0], empty[1] - 40);
	await waited(300);
	check(
		"a press on empty sidebar space closes the tab menu",
		isOpen && (await page.ask(`document.querySelector("[data-tabs-pointer-menu]") === null`)) === true,
		isOpen,
	);
	await page.hover(...(await centreOf(page, '[data-tabs-section="workspace"]')));
	await waited(300);
	await timed(page, "fold Tabs in workspace", () => pressOn(page, '[data-tabs-section="workspace"] [data-tabs-fold]'));
	check(
		"folding Tabs in workspace hides only its rows",
		(await idsOf(page, WORKSPACE_IDS)).length === 0 && (await idsOf(page, CHAT_IDS)).length > 0,
		await idsOf(page, CHAT_IDS),
	);
	await pressOn(page, '[data-tabs-section="workspace"] [data-tabs-fold]');
	await waited(SETTLED_MS);
	check(
		"no transform is left behind after a drop between sections",
		(await page.ask(
			`[...document.querySelectorAll("[data-tabs-sidebar] [style*=transform]")].filter((one) => one.style.transform !== "").length`,
		)) === 0,
		null,
	);
}
