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
	PINNED_IDS,
	SETTLED_MS,
	SHOWN_ID,
	TILE_IDS,
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
import { checksPointerDrag } from "./tabs-sidebar-drag-checks.ts";
import { checksSidebarLook } from "./tabs-sidebar-look-checks.ts";
import { checksArtCutOut } from "./tabs-sidebar-view-checks.ts";
import { bottomOf, centreOf, pointedAt } from "./tabs-sidebar-scenes.ts";

export async function checksSidebar(page: AskedPage, folder: string): Promise<number> {
	await checksPressing(page);
	await checksChats(page);
	await checksEssentialsMenu(page);
	await checksGroups(page);
	await checksRename(page);
	await checksDrag(page, folder);
	await checksSections(page, folder);
	addFailures(await checksPointerDrag(page, folder));
	await checksArtCutOut(page);
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
		"pressing an essential shows it alone: the tab pressed before is no longer marked shown",
		(await page.ask(`document.querySelector('[data-tabs-id="essential-2"]').hasAttribute("data-shown")`)) === true &&
			(await page.ask(SHOWN_ID)) !== "tab-3",
		await page.ask(SHOWN_ID),
	);
	check(
		"an Essential's tab never shows a second time in the chat's list",
		JSON.stringify(await idsOf(page, LIST_IDS)) === JSON.stringify(listed),
		await idsOf(page, LIST_IDS),
	);
	await checksWobblyPress(page);
	check(
		"Open with no tab of its own still shows its heading, and New tab stands above the sections",
		(await idsOf(page, WORKSPACE_IDS)).length === 0 &&
			(await page.ask(
				`document.querySelector('[data-tabs-section="workspace"]') !== null && document.querySelector("[data-host-column-add]") !== null`,
			)) === true,
		await idsOf(page, WORKSPACE_IDS),
	);
	const intoEmpty = (await idsOf(page, CHAT_TOP_IDS))[0] ?? "";
	const emptyHead = await centreOf(page, '[data-tabs-section="workspace"]');
	await dragged(page, "drag a row into an empty section", `[data-tabs-list] > [data-tabs-id="${intoEmpty}"]`, [
		emptyHead[0],
		emptyHead[1] + 12,
	]);
	check(
		"dragging a chat's sub-tab to the top of Open moves it there",
		JSON.stringify(await idsOf(page, WORKSPACE_IDS)) === JSON.stringify([intoEmpty]) &&
			!(await idsOf(page, CHAT_IDS)).includes(intoEmpty),
		[await idsOf(page, WORKSPACE_IDS), await idsOf(page, CHAT_IDS)],
	);
	const addsTo = await page.ask(`document.querySelector("[data-host-column-add]").dataset.hostColumnAdd`);
	const listedBefore = new Set(await idsOf(page, LIST_IDS));
	await pressOn(page, "[data-host-column-add]");
	await waited(SETTLED_MS);
	const mode = await page.ask(`document.querySelector("[data-cm-field-icon]")?.dataset.cmFieldIcon ?? null`);
	check("New tab opens the command menu in New, with no empty page", mode === "new", mode);
	await timed(page, "new tab from the menu", () => pressOn(page, '[data-cm-tile="app"]'));
	const opened = (await idsOf(page, LIST_IDS)).find((id) => !listedBefore.has(id)) ?? "";
	const landed = await page.ask(
		`document.querySelector('[data-tabs-id="${opened}"][data-shown]')?.closest("[data-tabs-list]")?.dataset.tabsList ?? null`,
	);
	check("a tab picked from New tab is shown in the list New tab names", landed === addsTo, [landed, addsTo]);
}

const FOLDED_AWAY = (id: string): string =>
	`(() => { const row = document.querySelector('[data-tabs-list] [data-tabs-id="${id}"]'); return row === null || row.closest("[data-fold-box]:not([data-open])") !== null; })()`;
const TRANSLATOR_TILE_SHOWN = `document.querySelector('[data-tabs-id="chat-translator"][data-shown], [data-tabs-in="chat-translator"] [data-shown]') !== null`;

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
	const chatTabIds = new Set(await idsOf(page, CHAT_IDS));
	check(
		"switching chats marks the other chat's tile shown and keeps every chat's tabs listed under its chat",
		(await page.ask(TRANSLATOR_TILE_SHOWN)) === true &&
			["tab-9", "tab-10", "tab-11", "tab-2"].every((id) => chatTabIds.has(id)),
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
		"Remove from Essentials puts the live tab back at the end of Open",
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
	check("pressing a group head folds it", (await page.ask(FOLDED_AWAY("tab-3"))) === true, await idsOf(page, LIST_IDS));
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
		`(() => { const held = document.querySelectorAll('[data-tabs-essentials] [data-tabs-item=essential][data-tabs-lifted][data-tabs-id="tab-5"]'); return { held: held.length, isHeldHidden: held.length === 1 && getComputedStyle(held[0]).visibility === "hidden", isLeftList: document.querySelector('[data-tabs-list] [data-tabs-id="tab-5"]') === null }; })()`,
	);
	writeFileSync(path.join(folder, "drag-into-essentials.png"), await page.shoot());
	check(
		"over Essentials the tiles make room for the held tab and the dragged row leaves its place in the list",
		JSON.stringify(room) === JSON.stringify({ held: 1, isHeldHidden: true, isLeftList: true }),
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
	const listEnd = await bottomOf(page, "[data-host-column-scroll]");
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
	const squeezed = await page.ask(
		`(() => { const heads = [...document.querySelectorAll("[data-tabs-section]")]; heads.forEach((head) => { head.style.setProperty("width", "130px", "important"); }); const lines = heads.map((head) => { const lead = head.querySelector(":scope > span"); return Math.round(lead.getBoundingClientRect().height / parseFloat(getComputedStyle(lead).lineHeight)); }); heads.forEach((head) => { head.style.removeProperty("width"); }); return lines; })()`,
	);
	check(
		"a squeezed sidebar keeps every section head on one line",
		Array.isArray(squeezed) && squeezed.length > 0 && squeezed.every((lines) => lines === 1),
		squeezed,
	);
	const target = await centreOf(page, '[data-tabs-section="workspace"]');
	const moved = (await idsOf(page, CHAT_TOP_IDS)).find((id) => id !== "tab-5") ?? "";
	await dragged(page, "drag a row into another section", `[data-tabs-list] > [data-tabs-id="${moved}"]`, [
		target[0],
		target[1] + 12,
	]);
	check(
		"dragging a chat's sub-tab onto Open moves it there, first",
		(await idsOf(page, WORKSPACE_IDS))[0] === moved && !(await idsOf(page, CHAT_IDS)).includes(moved),
		[await idsOf(page, WORKSPACE_IDS), await idsOf(page, CHAT_IDS)],
	);
	await page.ask(pointedAt(`[data-tabs-id="${moved}"]`));
	await waited(250);
	await timed(page, "pin a tab", () => menuPick(page, "Pin"));
	check(
		"Pin moves a tab out of Open to the end of Pinned",
		(await idsOf(page, PINNED_IDS)).at(-1) === moved && !(await idsOf(page, WORKSPACE_IDS)).includes(moved),
		await idsOf(page, PINNED_IDS),
	);
	await page.ask(pointedAt(`[data-tabs-id="${moved}"]`));
	await waited(250);
	await timed(page, "unpin a tab", () => menuPick(page, "Unpin"));
	check(
		"Unpin puts it back at the top of Open",
		(await idsOf(page, WORKSPACE_IDS))[0] === moved && !(await idsOf(page, PINNED_IDS)).includes(moved),
		await idsOf(page, WORKSPACE_IDS),
	);
	await page.hover(5, 5);
	await waited(300);
	writeFileSync(path.join(folder, "tabs-sections.png"), await page.shoot());
	await page.ask(pointedAt(`[data-tabs-id="${moved}"]`));
	await waited(250);
	const isOpen = (await page.ask(`document.querySelector("[data-tabs-pointer-menu]") !== null`)) === true;
	const empty = await bottomOf(page, "[data-host-column-scroll]");
	await page.press(empty[0], empty[1] - 40);
	await waited(300);
	check(
		"a press on empty sidebar space closes the tab menu",
		isOpen && (await page.ask(`document.querySelector("[data-tabs-pointer-menu]") === null`)) === true,
		isOpen,
	);
	await page.hover(...(await centreOf(page, '[data-tabs-section="workspace"]')));
	await waited(300);
	await timed(page, "fold Open", () => pressOn(page, '[data-tabs-section="workspace"] [data-tabs-fold]'));
	check(
		"folding Open hides only its rows",
		(await page.ask(
			`document.querySelector('[data-tabs-list="workspace"]').hidden && !document.querySelector('[data-tabs-list="pinned"]').hidden`,
		)) === true,
		null,
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
