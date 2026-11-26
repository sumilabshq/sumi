import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";
import { doubleClickOn, hoverOn, openedSidebar, pressOn, rowOf } from "./flows-sidebar-harness.ts";
import { boxOf, closeOf, dialogFitOf, IDLE_SESSION, RUNNING_SESSION, SESSION_ROW } from "./close-session-probe.ts";

const INBOX = "section[aria-label=Inbox] .sumi-flows-row";
const FLOWS = "section[aria-label=General] .sumi-flows-row";
const FOLDERS = ".sumi-flows-row[data-kind=folder]";
const SETTLE_MS = 600;

const namesOf = (selector: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(selector)})].map((one) => one.querySelector(".sumi-flows-name")?.textContent)`;

const count = (selector: string): string => `document.querySelectorAll(${JSON.stringify(selector)}).length`;

const MARK_ALL_READ = "section[aria-label=Inbox] button[aria-label='Mark all as read']";
const CLEAR_INBOX = `document.querySelector(${JSON.stringify(MARK_ALL_READ)}).click()`;
const ALIGN_TOLERANCE_PX = 0.5;
const markAllReadDrift = `(() => { const centreX = (box) => box.left + box.width / 2; const button = centreX(document.querySelector(${JSON.stringify(MARK_ALL_READ)}).getBoundingClientRect()); const marks = [...document.querySelectorAll("section[aria-label=Inbox] .sumi-flows-status")].map((mark) => centreX(mark.getBoundingClientRect())); return marks.length === 0 ? null : Math.max(...marks.map((mark) => Math.abs(mark - button))); })()`;

const clickText = (selector: string, text: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(selector)})].find((one) => one.textContent === ${JSON.stringify(text)}).click()`;

const folderFlowsOf = (folder: string): string =>
	`(() => { const group = [...document.querySelectorAll(".sumi-flows-folder")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(folder)}); return [...group.querySelectorAll(".sumi-flows-row[data-kind=flow] .sumi-flows-name")].map((one) => one.textContent); })()`;

const dragged = (source: string, folder: string): string =>
	`(() => {
		const transfer = new DataTransfer();
		const send = (el, type) => { const box = el.getBoundingClientRect(); return el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: box.top + box.height / 2 })); };
		const row = [...document.querySelectorAll(".sumi-flows-folder .sumi-flows-row[data-kind=flow]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(source)});
		const target = [...document.querySelectorAll(".sumi-flows-row[data-kind=folder]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(folder)});
		send(row, "dragstart");
		send(target, "dragover");
		send(target, "drop");
		send(row, "dragend");
	})()`;

const bundled = await bundleOf("tools/flows-sidebar-page.tsx");

async function pressKeyOn(page: AskedPage, name: string, key: string): Promise<void> {
	await page.ask(
		`${rowOf(".sumi-flows-row-main", name)}.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true }))`,
	);
}

type Case = (page: AskedPage) => Promise<void>;

async function inInbox(theme: string, scene: string, run: Case): Promise<void> {
	const opened = await openedSidebar(bundled, theme, scene);

	try {
		await run(opened.page);
	} finally {
		opened.stop();
	}
}

async function inboxRows(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		check("Inbox shows three rows then Show more", await page.ask(namesOf(INBOX)), [
			"Composer redesign",
			"Design system",
			"Sprint board",
		]);
		check(
			"Inbox title row is the label and the Mark all as read eye, no count",
			await page.ask(
				`[document.querySelector("section[aria-label=Inbox] .sumi-flows-label").textContent, document.querySelectorAll(${JSON.stringify(MARK_ALL_READ)}).length]`,
			),
			["Inbox", 1],
		);
		check("Show more is offered", await page.ask(count(".sumi-flows-more")), 1);
		await page.ask(`document.querySelector(".sumi-flows-more").click()`);
		await waited(SETTLE_MS);
		check("Show more lists the rest", await page.ask(namesOf(INBOX)), [
			"Composer redesign",
			"Design system",
			"Sprint board",
			"Plugin layout",
		]);
		check(
			"a running Flow stays out of Inbox",
			((await page.ask(namesOf(INBOX))) as string[]).includes("Summarize papers"),
			false,
		);
	});
}

async function inboxOpening(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await pressOn(page, INBOX, "Sprint board");
		check("opening an Inbox row removes it from Inbox", (await page.ask(namesOf(INBOX))) as string[], [
			"Composer redesign",
			"Design system",
			"Plugin layout",
		]);
		check(
			"the opened Flow is the current row",
			await page.ask(`document.querySelector(".sumi-flows-row[data-current] .sumi-flows-name").textContent`),
			"Sprint board",
		);
		await pressOn(page, FLOWS, "Plugin layout");
		check(
			"opening a Flow clears its done tick, and an asking Flow returns once it is not open",
			(await page.ask(namesOf(INBOX))) as string[],
			["Composer redesign", "Design system", "Sprint board"],
		);
	});
	await inInbox("light", "opened", async (page) => {
		check("an asking Flow is hidden from Inbox while open", await page.ask(namesOf(INBOX)), [
			"Composer redesign",
			"Sprint board",
			"Plugin layout",
		]);
	});
}

async function inboxClearing(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const drift = (await page.ask(markAllReadDrift)) as number | null;
		check(
			`the Mark all as read eye centres on the rows' status column (drift ${drift}px)`,
			drift !== null && drift <= ALIGN_TOLERANCE_PX,
			true,
		);
		await page.ask(CLEAR_INBOX);
		await waited(SETTLE_MS);
		check("Clear leaves only Flows that wait for an answer", await page.ask(namesOf(INBOX)), [
			"Design system",
			"Sprint board",
		]);
		check(
			"Clear turns into a short Undo",
			await page.ask(`document.querySelector("section[aria-label=Inbox] .sumi-flows-label").textContent`),
			"InboxUndo",
		);
		await page.ask(clickText(".sumi-flows-label-action", "Undo"));
		await waited(SETTLE_MS);
		check("Undo brings the rows back", await page.ask(namesOf(INBOX)), [
			"Composer redesign",
			"Design system",
			"Sprint board",
		]);
	});
	await inInbox("light", "inbox", async (page) => {
		const label = `document.querySelector("section[aria-label=Inbox] .sumi-flows-label").textContent`;
		await page.ask(CLEAR_INBOX);
		await waited(SETTLE_MS);
		await page.ask(`document.querySelector("[aria-label='Hide sidebar']").click()`);
		await waited(SETTLE_MS);
		await page.ask(`document.querySelector("[aria-label='Show sidebar']").click()`);
		await waited(SETTLE_MS);
		check("the Undo offer survives hiding and docking the sidebar", await page.ask(label), "InboxUndo");
		await page.ask(clickText(".sumi-flows-label-action", "Undo"));
		await waited(SETTLE_MS);
		check("and still undoes after it", await page.ask(namesOf(INBOX)), [
			"Composer redesign",
			"Design system",
			"Sprint board",
		]);
	});
	await inInbox("light", "inbox", async (page) => {
		await page.ask(CLEAR_INBOX);
		await waited(SETTLE_MS);
		await page.ask(`window.__spoilUndo()`);
		await page.ask(clickText(".sumi-flows-label-action", "Undo"));
		await waited(SETTLE_MS);
		check(
			"a refused Undo says so and keeps the offer",
			await page.ask(`document.querySelector("section[aria-label=Inbox] .sumi-flows-label").textContent`),
			"Could not undoUndo",
		);
		check(
			"a refused Undo is logged with its reason",
			page.failures().some((failure) => failure.includes("inbox undo refused: nothing to undo")),
			true,
		);
	});
	await inInbox("light", "finished", async (page) => {
		await page.ask(CLEAR_INBOX);
		await waited(SETTLE_MS);
		check(
			"Clear on a finished-only Inbox hides the whole section",
			await page.ask(count("section[aria-label=Inbox]")),
			0,
		);
		check(
			"and offers Undo in its place",
			await page.ask(`document.querySelector("[role=status]")?.textContent`),
			"Inbox clearedUndo",
		);
		await page.ask(clickText(".sumi-flows-label-action", "Undo"));
		await waited(SETTLE_MS);
		check("Undo restores the section", await page.ask(count("section[aria-label=Inbox]")), 1);
	});
	await inInbox("light", "quiet", async (page) => {
		check("an empty Inbox hides the section", await page.ask(count("section[aria-label=Inbox]")), 0);
		check("a closed folder shows its most urgent status", await page.ask(statusOf("Research")), "running");
		check("a closed folder with no status shows none", await page.ask(statusOf("Personal")), null);
	});
}

const statusOf = (folder: string): string =>
	`(() => { const row = [...document.querySelectorAll(".sumi-flows-row[data-kind=folder]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(folder)}); return row.querySelector(".sumi-flows-status")?.dataset.status ?? null; })()`;

async function rowsAndFolders(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const geometry = (await page.ask(
			`(() => { const [a, b] = [...document.querySelectorAll(".sumi-flows-row")].slice(0, 2).map((one) => one.getBoundingClientRect()); return [a.height, b.top - a.bottom]; })()`,
		)) as number[];
		check("rows are 28px high with a 1px gap", geometry, [28, 1]);
		await hoverOn(page, FOLDERS, "Personal", 200);
		const hovered = await page.ask(
			`(() => { const row = ${`[...document.querySelectorAll(".sumi-flows-row[data-kind=folder]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === "Personal")`}; const shown = (el) => getComputedStyle(el).display !== "none"; return [shown(row.querySelector(".sumi-flows-glyph")), shown(row.querySelector(".sumi-flows-chevron")), shown(row.querySelector(".sumi-flows-add"))]; })()`,
		);
		check("a hovered folder swaps its icon for a chevron and shows plus", hovered, [false, true, true]);
		await page.ask(
			`[...document.querySelectorAll(".sumi-flows-row[data-kind=folder]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === "Personal").querySelector(".sumi-flows-add").click()`,
		);
		await waited(SETTLE_MS * 2);
		check(
			"plus creates a Flow in its folder",
			((await page.ask(folderFlowsOf("Personal"))) as string[]).includes("New session"),
			true,
		);
	});
}

async function renaming(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await pressKeyOn(page, "Client project", "F2");
		await waited(300);
		check("F2 turns the folder row into a field", await page.ask(count(".sumi-flows-field-input")), 1);
		await page.typeText("Customer work");
		await page.pressEnter();
		await waited(SETTLE_MS);
		check("Enter renames the folder", await page.ask(namesOf(FOLDERS)), [
			"Sumi",
			"Customer work",
			"Personal",
			"Research",
		]);
		await pressKeyOn(page, "Customer work", "Enter");
		await waited(300);
		const [x, y] = (await page.ask(
			`(() => { const box = document.querySelector(".sumi-flows-field-icon").getBoundingClientRect(); return [box.left + 10, box.top + 10]; })()`,
		)) as [number, number];
		await page.press(x, y);
		await waited(300);
		check(
			"the field icon opens a picker with Remove icon",
			await page.ask(`document.querySelector(".sumi-flows-picker-remove")?.getAttribute("aria-label")`),
			"Remove icon",
		);
		check(
			"the picker switch and search field share one fill",
			await page.ask(
				`(() => { const fill = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor; return fill(".sumi-flows-picker-tabs") === fill(".sumi-flows-picker-field"); })()`,
			),
			true,
		);
		check(
			"the picker uses kit tooltips, no native title",
			await page.ask(
				`[document.querySelectorAll(".sumi-flows-picker [title]").length, document.querySelector(".sumi-flows-picker-remove").dataset.tipSaid]`,
			),
			[0, "Remove icon"],
		);
		check(
			"nothing is selected or highlighted before a key is pressed",
			await page.ask(
				`document.querySelectorAll(".sumi-flows-picker-choice[data-active], .sumi-flows-picker-choice[aria-selected=true]").length`,
			),
			0,
		);
		await page.typeText("zzzzqqqq");
		await waited(300);
		check(
			"an empty search shows only the centred text",
			await page.ask(
				`[document.querySelector(".sumi-flows-picker-none")?.textContent, document.querySelectorAll(".sumi-flows-picker-choice").length, document.querySelector(".sumi-flows-picker-none")?.children.length]`,
			),
			["Nothing matches", 0, 0],
		);
		const coloured = `(() => { const row = [...document.querySelectorAll(".sumi-flows-row[data-kind=folder]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent !== "Customer work" && !one.querySelector("img")); row.dataset.color = "red"; const svg = row.querySelector(".sumi-flows-glyph svg.wg-kit-filled-icon"); return svg !== null && getComputedStyle(svg).color === getComputedStyle(row.querySelector(".sumi-flows-name")).color && getComputedStyle(svg).color !== getComputedStyle(document.body).color; })()`;
		check("a coloured folder row draws the filled folder in its colour", await page.ask(coloured), true);
	});
}

async function hoverPanel(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const folderFlow = ".sumi-flows-folder .sumi-flows-row[data-kind=flow]";
		await hoverOn(page, folderFlow, "Composer redesign", 100);
		check("the chats panel waits 300 ms", await page.ask(count(".sumi-flows-chats.is-open")), 0);
		await waited(800);
		check("a Flow with several chats lists them on hover", await page.ask(namesOf(".sumi-flows-chats-item")), [
			"Refactor",
			"Run tests",
			"Update docs",
		]);
		await page.hover(900, 400);
		await waited(900);
		await hoverOn(page, folderFlow, "Design system", 1000);
		check("a Flow with one chat has no panel", await page.ask(count(".sumi-flows-chats.is-open")), 0);
	});
}

async function hiding(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(`document.querySelector("[aria-label='Hide sidebar']").click()`);
		await waited(SETTLE_MS);
		check(
			"hiding removes the column and leaves the toggle",
			await page.ask(
				`[${count(".sumi-flows-sidebar")}, ${count(".sumi-flows-hidden")}, !!document.querySelector("[aria-label='Show sidebar']")]`,
			),
			[0, 1, true],
		);
		check(
			"the title bar floats over the content when hidden",
			await page.ask(`document.querySelector(".sumi-flows-title").dataset.titleFloats`),
			"covering",
		);
		await page.hover(2, 300);
		await waited(SETTLE_MS);
		check("the left edge reveals the sidebar", await page.ask(count(".sumi-flows-float")), 1);
		await page.hover(700, 300);
		await waited(SETTLE_MS);
		check("leaving it hides it again", await page.ask(count(".sumi-flows-float")), 0);
		await page.ask(`document.querySelector("[aria-label='Show sidebar']").click()`);
		await waited(SETTLE_MS);
		check(
			"showing docks the column",
			await page.ask(
				`[${count(".sumi-flows-sidebar")}, document.querySelector(".sumi-flows-title").dataset.titleFloats]`,
			),
			[1, "beside"],
		);
	});
}

const FLOAT = ".sumi-flows-float";
const AWAY = [700, 300] as const;
const PEEK_SETTLE_MS = 700;
const CARD_STILL_OPEN_MS = 400;

async function peeked(page: AskedPage): Promise<void> {
	await page.hover(2, 300);
	await waited(SETTLE_MS);
	check("the left edge reveals the sidebar", await page.ask(count(FLOAT)), 1);
}

async function peekHolds(): Promise<void> {
	await inInbox("light", "hidden", async (page) => {
		await peeked(page);
		await page.ask(
			`${rowOf(FLOWS, "Plugin layout")}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`,
		);
		await waited(300);
		await page.hover(...AWAY);
		await waited(PEEK_SETTLE_MS);
		check("an open row menu holds the peek", await page.ask(count(FLOAT)), 1);
		await page.press(...AWAY);
		await waited(PEEK_SETTLE_MS);
		check("closing the menu lets the peek conceal", await page.ask(count(FLOAT)), 0);
	});
	await inInbox("light", "hidden", async (page) => {
		await peeked(page);
		await doubleClickOn(page, "section[aria-label=General] .sumi-flows-row-main", "Sprint board");
		await waited(300);
		await page.hover(...AWAY);
		await waited(PEEK_SETTLE_MS);
		check("a rename in progress holds the peek", await page.ask(count(FLOAT)), 1);
		await page.pressEnter();
		await waited(PEEK_SETTLE_MS);
		check("ending the rename lets the peek conceal", await page.ask(count(FLOAT)), 0);
	});
	await inInbox("light", "hidden", async (page) => {
		await peeked(page);
		const folderFlow = ".sumi-flows-folder .sumi-flows-row[data-kind=flow]";
		await hoverOn(page, folderFlow, "Composer redesign", 800);
		check("the chats card opens", await page.ask(count(".sumi-flows-chats.is-open")), 1);
		const [x, y] = (await page.ask(
			`(() => { const box = document.querySelector(".sumi-flows-chats").getBoundingClientRect(); return [box.left + 10, box.top + 10]; })()`,
		)) as [number, number];
		await page.hover(x, y);
		await waited(200);
		await page.hover(...AWAY);
		await waited(CARD_STILL_OPEN_MS);
		check("an open chats card holds the peek past the conceal delay", await page.ask(count(FLOAT)), 1);
		await waited(PEEK_SETTLE_MS);
		check("closing the card lets the peek conceal", await page.ask(count(FLOAT)), 0);
	});
	await inInbox("light", "hidden", async (page) => {
		await peeked(page);
		const dragEvent = (type: string): string =>
			`${rowOf(".sumi-flows-folder .sumi-flows-row[data-kind=flow]", "Plugin layout")}.dispatchEvent(new DragEvent("${type}", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }))`;
		await page.ask(dragEvent("dragstart"));
		await page.hover(...AWAY);
		await waited(PEEK_SETTLE_MS);
		check("a Flow drag holds the peek", await page.ask(count(FLOAT)), 1);
		await page.ask(dragEvent("dragend"));
		await waited(PEEK_SETTLE_MS);
		check("ending the drag lets the peek conceal", await page.ask(count(FLOAT)), 0);
	});
}

async function dragging(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(dragged("Plugin layout", "Client project"));
		await waited(SETTLE_MS * 2);
		check("dropping a Flow on a folder moves it there", await page.ask(folderFlowsOf("Client project")), [
			"Sprint board",
			"Plugin layout",
		]);
		check("and takes it out of the old folder", await page.ask(folderFlowsOf("Sumi")), [
			"Composer redesign",
			"Design system",
		]);
	});
}

async function emptySpaceMenu(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(
			`document.querySelector("section[aria-label=General]").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 400 }))`,
		);
		await waited(300);
		check(
			"right-clicking empty space offers New session, New folder and New project",
			await page.ask(
				`[...document.querySelectorAll("[role=menuitem] .wg-kit-pop-label")].map((item) => item.textContent)`,
			),
			["New session", "New folder", "New project"],
		);
		await page.ask(clickText("[role=menuitem]", "New folder"));
		await waited(SETTLE_MS * 2);
		check(
			"New folder starts renaming with the name selected",
			await page.ask(
				`(() => { const input = document.querySelector(".sumi-flows-field-input"); return [input?.value, document.activeElement === input, input?.selectionStart, input?.selectionEnd]; })()`,
			),
			["New folder", true, 0, 10],
		);
	});
}

async function editingIcon(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(
			`document.querySelector(${JSON.stringify(FLOWS)}).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`,
		);
		await waited(300);
		await page.ask(clickText("[role=menuitem]", "Edit icon"));
		await waited(300);
		check(
			"Edit icon opens the picker in the row field",
			await page.ask(`[${count(".sumi-flows-field")}, ${count(".sumi-flows-picker")}]`),
			[1, 1],
		);
	});
}

async function deleting(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(
			`${rowOf(FLOWS, "Plugin layout")}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`,
		);
		await waited(300);
		check(
			"a Flow row menu offers Rename, Edit icon, Duplicate, Archive and Delete flow",
			await page.ask(
				`[...document.querySelectorAll("[role=menuitem] .wg-kit-pop-label")].map((item) => item.textContent)`,
			),
			["Rename", "Edit icon", "Duplicate", "Archive", "Move to", "Delete flow"],
		);
		await page.ask(clickText("[role=menuitem]", "Delete flow"));
		await waited(300);
		check(
			"Delete flow asks first, naming the Flow and its chats",
			await page.ask(
				`(document.querySelector("[role=alertdialog]")?.textContent ?? "").includes(${JSON.stringify('Delete "Plugin layout"?')})`,
			),
			true,
		);
		await page.ask(`document.querySelector("[role=alertdialog] [data-slot=alert-dialog-action]").click()`);
		await waited(SETTLE_MS * 2);
		check(
			"Delete flow takes the Flow out of the sidebar",
			((await page.ask(namesOf(FLOWS))) as string[]).includes("Plugin layout"),
			false,
		);
		check("and out of Inbox", ((await page.ask(namesOf(INBOX))) as string[]).includes("Plugin layout"), false);
	});
}

const KEY_HINT_TOLERANCE_PX = 0.5;
const KEY_HINT_PX = 18;
const KEY_HINT_INSET_PX = 5;
const ALERT_WIDTH_PX = 340;

const near = (got: number, want: number): boolean => Math.abs(got - want) <= KEY_HINT_TOLERANCE_PX;

const lookOf = (expression: string): string =>
	`(() => { const one = ${expression}; return one === null ? null : [getComputedStyle(one).display, getComputedStyle(one).color]; })()`;

async function pressClose(page: AskedPage, name: string): Promise<void> {
	await hoverOn(page, SESSION_ROW, name, 300);
	const close = await boxOf(page, closeOf(name));
	await page.press(close.x + close.width / 2, close.y + close.height / 2);
	await waited(SETTLE_MS);
}

const MENU_LOOK = `[...document.querySelectorAll("[role=menu]")].map((menu) => { const look = getComputedStyle(menu); return [look.visibility, look.opacity, look.pointerEvents]; })`;

async function rowMenuReopens(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const openMenu = (): Promise<unknown> =>
			page.ask(
				`${rowOf(FLOWS, "Plugin layout")}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 60, clientY: 200 }))`,
			);
		const closers: readonly (() => Promise<unknown>)[] = [
			() => page.pressKey("Escape"),
			() => page.press(900, 600),
			() => page.ask(clickText("[role=menuitem]", "Duplicate")),
		];
		const seen: unknown[] = [];

		for (const close of closers) {
			await openMenu();
			await waited(SETTLE_MS);
			seen.push(await page.ask(MENU_LOOK));
			await close();
			await waited(SETTLE_MS);
		}

		check(
			"THE ROW MENU REOPENS VISIBLE, OPAQUE AND PRESSABLE after Escape, an outside press and an item press",
			seen,
			closers.map(() => [["visible", "1", "auto"]]),
		);
	});
}

async function closingSessions(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const status = `${rowOf(SESSION_ROW, RUNNING_SESSION)}.querySelector(".sumi-flows-status")`;
		check(
			"at rest a session row shows its status and no ×",
			[
				((await page.ask(lookOf(status))) as string[] | null)?.[0],
				((await page.ask(lookOf(closeOf(RUNNING_SESSION)))) as string[] | null)?.[0],
			],
			["grid", "none"],
		);
		await hoverOn(page, SESSION_ROW, RUNNING_SESSION, 300);
		check(
			"HOVER SWAPS THE STATUS FOR AN ARCHIVE ×, 20 PX",
			[
				((await page.ask(lookOf(status))) as string[] | null)?.[0],
				await page.ask(`${closeOf(RUNNING_SESSION)}.getAttribute("aria-label")`),
				(await boxOf(page, closeOf(RUNNING_SESSION))).width,
			],
			["none", "Archive session", 20],
		);
		const restInk = ((await page.ask(lookOf(closeOf(RUNNING_SESSION)))) as string[])[1];
		const close = await boxOf(page, closeOf(RUNNING_SESSION));
		await page.hover(close.x + close.width / 2, close.y + close.height / 2);
		await waited(300);
		const hoverInk = ((await page.ask(lookOf(closeOf(RUNNING_SESSION)))) as string[])[1];
		check("the × reads muted at rest and darker under the pointer", restInk !== hoverInk, true);
		const opened = await page.ask(
			`document.querySelector("[aria-current=true] .sumi-flows-name")?.textContent ?? null`,
		);
		await page.press(close.x + close.width / 2, close.y + close.height / 2);
		await waited(SETTLE_MS);
		check(
			"A RUNNING SESSION ASKS FIRST, and the press does not open its row",
			[
				await page.ask(`document.querySelector("[role=alertdialog] h2")?.textContent ?? null`),
				await page.ask(`document.querySelector("[aria-current=true] .sumi-flows-name")?.textContent ?? null`),
			],
			["Stop and archive this session?", opened],
		);
		const fit = await dialogFitOf(page);
		check("the confirm is 340 px wide with no border", [fit.width, fit.border], [ALERT_WIDTH_PX, "0px"]);
		check(
			"KEY HINTS: Esc and ↵, 18 px tall, text centred with equal space left and right, nothing cut",
			fit.hints.map((hint) => [
				hint.text,
				hint.height,
				near(hint.padStart, hint.padEnd) ? "centred" : `${hint.padStart}|${hint.padEnd}`,
				hint.textInside,
			]),
			[
				["Esc", KEY_HINT_PX, "centred", true],
				["↵", KEY_HINT_PX, "centred", true],
			],
		);
		check(
			"each key hint sits 5 px from its button's right, top and bottom edges",
			fit.hints.map((hint) =>
				[hint.fromButtonEnd, hint.fromButtonTop, hint.fromButtonBottom].every((gap) => near(gap, KEY_HINT_INSET_PX)),
			),
			[true, true],
		);
		await page.ask(`document.querySelector("[data-slot=alert-dialog-cancel]").click()`);
		await waited(SETTLE_MS);
		check(
			"Cancel keeps the session and stops nothing",
			[
				((await page.ask(namesOf(SESSION_ROW))) as string[]).includes(RUNNING_SESSION),
				await page.ask("window.__stoppedTurns.length"),
			],
			[true, 0],
		);
		await pressClose(page, RUNNING_SESSION);
		await page.pressEnter();
		await waited(SETTLE_MS * 2);
		check(
			"ENTER CONFIRMS: the running chat is stopped and the session leaves the sidebar",
			[
				await page.ask("window.__stoppedTurns.length"),
				((await page.ask(namesOf(SESSION_ROW))) as string[]).includes(RUNNING_SESSION),
			],
			[1, false],
		);
		await pressClose(page, IDLE_SESSION);
		check(
			"AN IDLE SESSION ARCHIVES AT ONCE, no dialog",
			[
				await page.ask(`document.querySelectorAll("[role=alertdialog][data-state=open]").length`),
				((await page.ask(namesOf(SESSION_ROW))) as string[]).includes(IDLE_SESSION),
			],
			[0, false],
		);
	});
}

async function folderMenuAndArchive(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(
			`${rowOf(FOLDERS, "Client project")}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`,
		);
		await waited(300);
		check(
			"a folder row menu offers Rename, Edit icon, Ungroup and Delete folder and its Flows",
			await page.ask(
				`[...document.querySelectorAll("[role=menuitem] .wg-kit-pop-label")].map((item) => item.textContent)`,
			),
			["Rename", "Edit icon", "Ungroup", "Delete folder and its Flows"],
		);
		await page.ask(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
		await waited(300);
		await page.ask(
			`${rowOf(FLOWS, "Reading list")}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`,
		);
		await waited(300);
		await page.ask(clickText("[role=menuitem]", "Archive"));
		await waited(SETTLE_MS * 2);
		check(
			"Archive takes the Flow out of the sidebar",
			((await page.ask(namesOf(FLOWS))) as string[]).includes("Reading list"),
			false,
		);
	});
}

const DROP_LINE = ".sumi-flows-drop-line";
const FOLDER_FLOWS = ".sumi-flows-folder .sumi-flows-row[data-kind=flow]";
const FOLDER_ROWS = ".sumi-flows-folder .sumi-flows-row";
const LINE_TOLERANCE_PX = 1;
const AFTER_TAP_MS = 60;
const DRAG_SHOTS = "/tmp/drag-shots";

const heldFlowDrag = (name: string): string => heldDragFrom(FOLDER_FLOWS, name);
const heldDragFrom = (selector: string, name: string): string =>
	`(() => {
		const transfer = new DataTransfer();
		const send = (el, type, y) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: y ?? 0 }));
		const row = ${rowOf(selector, name)};
		send(row, "dragstart");
		window.__drag = { send, row };
	})()`;
const EDGE_Y: Readonly<Record<"upper" | "middle" | "lower", string>> = {
	upper: "box.top + 2",
	middle: "box.top + box.height / 2",
	lower: "box.bottom - 2",
};
const dragOverOf = (selector: string, name: string, half: "upper" | "middle" | "lower"): string =>
	`(() => {
		const target = ${rowOf(selector, name)};
		const box = target.getBoundingClientRect();
		const y = ${EDGE_Y[half]};
		window.__drag.send(target, "dragover", y);
		Object.assign(window.__drag, { target, y });
	})()`;
const rowTops = `[...document.querySelectorAll(".sumi-flows-row:not(.sumi-flows-lifted)")].map((row) => row.getBoundingClientRect().top)`;
const heldDrop = `(() => { const { send, row, target, y } = window.__drag; send(target, "drop", y); send(row, "dragend"); })()`;
const heldEnd = `window.__drag.send(window.__drag.row, "dragend")`;
const lineLook = `(() => {
	const lines = [...document.querySelectorAll(${JSON.stringify(DROP_LINE)})];
	if (lines.length !== 1) return { count: lines.length };
	const box = lines[0].getBoundingClientRect();
	const ring = getComputedStyle(lines[0], "::after");
	const stroke = getComputedStyle(lines[0], "::before");
	return { count: 1, y: box.top + box.height / 2, circleX: box.left + parseFloat(ring.width) / 2, circle: [ring.width, parseFloat(ring.borderTopWidth) >= 1, ring.borderTopColor === stroke.backgroundColor], stroke: stroke.height, right: box.right };
})()`;
const gapYOf = (upper: string, lower: string): string =>
	`(${rowOf(FOLDER_ROWS, upper)}.getBoundingClientRect().bottom + ${rowOf(FOLDER_ROWS, lower)}.getBoundingClientRect().top) / 2`;
const glyphXOf = (name: string): string =>
	`(() => { const box = ${rowOf(FOLDER_FLOWS, name)}.querySelector(".sumi-flows-glyph").getBoundingClientRect(); return box.left + box.width / 2; })()`;

interface LineLook {
	readonly count: number;
	readonly y?: number;
	readonly circleX?: number;
	readonly circle?: readonly [string, boolean, boolean];
	readonly stroke?: string;
}

const isNear = (got: number | undefined, want: number): boolean =>
	got !== undefined && Math.abs(got - want) <= LINE_TOLERANCE_PX;

async function dropIndicator(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const rowsBefore = await page.ask(rowTops);
		await page.ask(heldFlowDrag("Composer redesign"));
		const rowsLifted = await page.ask(rowTops);
		await page.ask(dragOverOf(FOLDER_FLOWS, "Plugin layout", "upper"));
		await waited(AFTER_TAP_MS);
		check(
			"rows do not shift while dragging, the lifted copy included",
			[rowsLifted, await page.ask(rowTops)],
			[rowsBefore, rowsBefore],
		);
		const between = (await page.ask(lineLook)) as LineLook;
		const gapY = (await page.ask(gapYOf("Design system", "Plugin layout"))) as number;
		const glyphX = (await page.ask(glyphXOf("Plugin layout"))) as number;
		check(
			"DRAGGING A SESSION BETWEEN TWO ROWS SHOWS ONE LINE AT THE GAP, ITS 6px HOLLOW CIRCLE ON THE GLYPH COLUMN",
			[between.count, isNear(between.y, gapY), isNear(between.circleX, glyphX), between.circle, between.stroke],
			[1, true, true, ["6px", true, true], "2px"],
		);
		check(
			"the dragged session fades",
			await page.ask(`${rowOf(FOLDER_FLOWS, "Composer redesign")}.hasAttribute("data-dragging")`),
			true,
		);
		check("the first gap fires one alignment haptic", await page.ask("window.__taps"), [{ pattern: "alignment" }]);
		await page.ask(dragOverOf(FOLDER_FLOWS, "Plugin layout", "upper"));
		await page.ask(dragOverOf(FOLDER_FLOWS, "Plugin layout", "lower"));
		await waited(AFTER_TAP_MS);
		const below = (await page.ask(lineLook)) as LineLook;
		const lowerGapY = (await page.ask(gapYOf("Plugin layout", "Client project"))) as number;
		check(
			"moving to the next gap moves the one line and fires one more haptic, staying in a gap fires none",
			[below.count, isNear(below.y, lowerGapY), await page.ask("window.__taps.length")],
			[1, true, 2],
		);
		await page.ask(dragOverOf(".sumi-flows-row[data-kind=folder]", "Client project", "middle"));
		await waited(AFTER_TAP_MS);
		check(
			"hovering a folder outlines it and shows no line",
			[
				((await page.ask(lineLook)) as LineLook).count,
				await page.ask(`${rowOf(".sumi-flows-row[data-kind=folder]", "Client project")}.closest(".sumi-flows-folder").hasAttribute("data-drop")`),
				await page.ask("window.__taps.length"),
			],
			[0, true, 3],
		);
		await page.ask(dragOverOf(FOLDER_FLOWS, "Design system", "lower"));
		await page.ask(heldDrop);
		await waited(SETTLE_MS * 2);
		check("dropping lands the session at the indicated gap", await page.ask(folderFlowsOf("Sumi")), [
			"Design system",
			"Composer redesign",
			"Plugin layout",
		]);
		check(
			"the drop clears the line and the fade",
			await page.ask(`[${count(DROP_LINE)}, ${count("[data-dragging]")}]`),
			[0, 0],
		);
	});
}

async function dragShots(): Promise<void> {
	mkdirSync(DRAG_SHOTS, { recursive: true });

	for (const theme of ["light", "dark"]) {
		const opened = await openedSidebar(bundled, theme, "inbox", undefined, 2);

		try {
			const { page } = opened;
			await page.ask(heldFlowDrag("Composer redesign"));
			await page.ask(dragOverOf(FOLDER_FLOWS, "Plugin layout", "upper"));
			await waited(SETTLE_MS);
			writeFileSync(path.join(DRAG_SHOTS, `session-between-rows-${theme}.png`), await page.shoot());
			await page.ask(dragOverOf(".sumi-flows-row[data-kind=folder]", "Client project", "middle"));
			await waited(SETTLE_MS);
			writeFileSync(path.join(DRAG_SHOTS, `hovering-folder-${theme}.png`), await page.shoot());
			await page.ask(heldEnd);
			await page.ask(`window.__projects("create", { name: "Alpha" })`);
			await waited(SETTLE_MS);
			await page.ask(projectDragOver("Alpha", "General", false));
			await waited(SETTLE_MS);
			writeFileSync(path.join(DRAG_SHOTS, `project-between-sections-${theme}.png`), await page.shoot());
		} finally {
			opened.stop();
		}
	}
}

const TOP_FLOWS = (section: string): string =>
	`section[aria-label=${section}] .sumi-flows-row[data-kind=flow]:not(.sumi-flows-folder .sumi-flows-row)`;
const TOP_FOLDERS = (section: string): string => `section[aria-label=${section}] .sumi-flows-row[data-kind=folder]`;
const topOrderOf = (project: string): string =>
	`(async () => { const sidebar = (await window.__flowsSidebar()).output; const one = sidebar.projects.find((item) => item.name === ${JSON.stringify(project)}); return one.items.map((item) => (item.kind === "flow" ? sidebar.looseFlows : sidebar.folders).find((row) => row.id === item.id).name); })()`;
const glyphLeftOf = (selector: string, name: string): string =>
	`${rowOf(selector, name)}.querySelector(".sumi-flows-glyph").getBoundingClientRect().left`;
const newSessionIn = (name: string, project: string): string =>
	`window.__flows("create", { name: ${JSON.stringify(name)}, place: { folderId: null, before: null, projectId: ${project} } })`;

async function folderBetweenSessions(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(newSessionIn("Second note", JSON.stringify("general")));
		await waited(SETTLE_MS);
		const folderLeft = (await page.ask(glyphLeftOf(TOP_FOLDERS("General"), "Personal"))) as number;
		const sessionLeft = (await page.ask(glyphLeftOf(TOP_FLOWS("General"), "Second note"))) as number;
		check(
			"a folder row's glyph stands where a session row's glyph stands",
			Math.abs(folderLeft - sessionLeft) < LINE_TOLERANCE_PX / 2,
			true,
		);
		check(
			"a session inside a folder stays one step right of the folder glyph",
			((await page.ask(glyphLeftOf(FOLDER_FLOWS, "Composer redesign"))) as number) >
				((await page.ask(glyphLeftOf(TOP_FOLDERS("General"), "Sumi"))) as number),
			true,
		);
		check(
			"a folder row is as high as a session row",
			await page.ask(`${rowOf(TOP_FOLDERS("General"), "Sumi")}.getBoundingClientRect().height`),
			28,
		);
		check(
			"no extra space above a folder row, the 1px row gap only",
			await page.ask(
				`${rowOf(TOP_FOLDERS("General"), "Sumi")}.getBoundingClientRect().top - ${rowOf(TOP_FLOWS("General"), "Second note")}.getBoundingClientRect().bottom`,
			),
			1,
		);
		const tapsBefore = (await page.ask("window.__taps.length")) as number;
		await page.ask(heldDragFrom(TOP_FOLDERS("General"), "Personal"));
		await page.ask(dragOverOf(TOP_FLOWS("General"), "Second note", "upper"));
		await waited(AFTER_TAP_MS);
		const between = (await page.ask(lineLook)) as LineLook;
		const gapY = (await page.ask(
			`(${rowOf(TOP_FLOWS("General"), "Reading list")}.getBoundingClientRect().bottom + ${rowOf(TOP_FLOWS("General"), "Second note")}.getBoundingClientRect().top) / 2`,
		)) as number;
		check(
			"dragging a folder between two sessions shows one line at the gap and taps once",
			[between.count, isNear(between.y, gapY), ((await page.ask("window.__taps.length")) as number) - tapsBefore],
			[1, true, 1],
		);
		mkdirSync(DRAG_SHOTS, { recursive: true });
		writeFileSync(path.join(DRAG_SHOTS, "folder-between-sessions-light.png"), await page.shoot());
		await page.ask(heldDrop);
		await waited(SETTLE_MS * 2);
		check("dropping lands the folder exactly there", await page.ask(topOrderOf("General")), [
			"Reading list",
			"Personal",
			"Second note",
			"Sumi",
			"Client project",
			"Research",
		]);
		await page.ask(`window.__projects("create", { name: "Alpha" })`);
		await waited(SETTLE_MS);
		const alpha = JSON.stringify(await page.ask(projectIdOf("Alpha")));
		await page.ask(newSessionIn("Alpha one", alpha));
		await waited(SETTLE_MS);
		await page.ask(newSessionIn("Alpha two", alpha));
		await waited(SETTLE_MS);
		await page.ask(heldDragFrom(TOP_FOLDERS("General"), "Research"));
		await page.ask(dragOverOf(TOP_FLOWS("Alpha"), "Alpha two", "upper"));
		await waited(AFTER_TAP_MS);
		check(
			"a folder dragged over another project shows its line there",
			((await page.ask(lineLook)) as LineLook).count,
			1,
		);
		await page.ask(heldDrop);
		await waited(SETTLE_MS * 2);
		check("dropping lands the folder in the other project's gap", await page.ask(topOrderOf("Alpha")), [
			"Alpha one",
			"Research",
			"Alpha two",
		]);
		check(
			"and takes it out of the old project",
			((await page.ask(topOrderOf("General"))) as string[]).includes("Research"),
			false,
		);
		await page.ask(heldDragFrom(TOP_FLOWS("General"), "Reading list"));
		await page.ask(dragOverOf(TOP_FOLDERS("General"), "Sumi", "upper"));
		await waited(AFTER_TAP_MS);
		check(
			"a session over a folder's upper edge shows a line, not an outline",
			[
				((await page.ask(lineLook)) as LineLook).count,
				await page.ask(`${rowOf(TOP_FOLDERS("General"), "Sumi")}.closest(".sumi-flows-folder").hasAttribute("data-drop")`),
			],
			[1, false],
		);
		await page.ask(heldDrop);
		await waited(SETTLE_MS * 2);
		check("dropping lands the session before the folder", await page.ask(topOrderOf("General")), [
			"Personal",
			"Second note",
			"Reading list",
			"Sumi",
			"Client project",
		]);
	});
}

const dropFlags = `(() => [...document.querySelectorAll("[data-drop]")].map((one) => one.classList.contains("sumi-flows-folder") ? "folder:" + one.querySelector(".sumi-flows-name").textContent : "project:" + one.getAttribute("aria-label")))()`;
const lineInSection = (section: string): string =>
	`(() => {
		const line = document.querySelector(${JSON.stringify(DROP_LINE)});
		if (!line) return null;
		const mark = line.getBoundingClientRect();
		const box = document.querySelector(${JSON.stringify(`section[aria-label=${section}]`)}).getBoundingClientRect();
		return mark.left >= box.left - 0.5 && mark.right <= box.right + 0.5 && mark.top >= box.top - 0.5 && mark.bottom <= box.bottom + 0.5;
	})()`;
async function dragContainers(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(heldFlowDrag("Composer redesign"));
		await page.ask(dragOverOf(FOLDER_FLOWS, "Plugin layout", "upper"));
		await waited(AFTER_TAP_MS);
		check(
			"a line between two sessions of a folder keeps that folder outlined, and only it",
			[((await page.ask(lineLook)) as LineLook).count, await page.ask(dropFlags), await page.ask(lineInSection("General"))],
			[1, ["folder:Sumi"], true],
		);
		await page.ask(dragOverOf(TOP_FLOWS("General"), "Reading list", "lower"));
		await waited(AFTER_TAP_MS);
		check(
			"a line in a top-level gap outlines the project",
			[((await page.ask(lineLook)) as LineLook).count, await page.ask(dropFlags), await page.ask(lineInSection("General"))],
			[1, ["project:General"], true],
		);
		await page.ask(dragOverOf(FOLDER_FLOWS, "Design system", "middle"));
		await waited(AFTER_TAP_MS);
		check(
			"the middle of a folder's session keeps the folder outlined",
			[((await page.ask(lineLook)) as LineLook).count, await page.ask(dropFlags)],
			[1, ["folder:Sumi"]],
		);
		await page.ask(dragOverOf(TOP_FOLDERS("General"), "Sumi", "middle"));
		await waited(AFTER_TAP_MS);
		check(
			"the folder row outlines the folder with no line",
			[((await page.ask(lineLook)) as LineLook).count, await page.ask(dropFlags)],
			[0, ["folder:Sumi"]],
		);
		await page.ask(dragOverOf(TOP_FOLDERS("General"), "Research", "lower"));
		await waited(AFTER_TAP_MS);
		check(
			"the line below the last row of a project stays inside the project box",
			[((await page.ask(lineLook)) as LineLook).count, await page.ask(lineInSection("General")), await page.ask(dropFlags)],
			[1, true, ["project:General"]],
		);
		await page.ask(heldDrop);
		await waited(SETTLE_MS);
		check("a drop clears every outline", await page.ask(dropFlags), []);
	});
}

const sectionNames = `[...document.querySelectorAll("section[aria-label]")].map((one) => one.getAttribute("aria-label"))`;
const sectionRows = (section: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(`section[aria-label=${JSON.stringify(section)}] .sumi-flows-row`)})].map((one) => [one.dataset.kind, one.querySelector(".sumi-flows-name")?.textContent])`;
const projectIdOf = (name: string): string =>
	`(async () => (await window.__flowsSidebar()).output.projects.find((one) => one.name === ${JSON.stringify(name)}).id)()`;
const contextOn = (target: string): string =>
	`${target}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`;
const projectDragOver = (source: string, target: string, isLowerHalf: boolean): string =>
	`(() => {
		const transfer = new DataTransfer();
		const send = (el, type, y) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: y }));
		const heading = document.querySelector(${JSON.stringify(`section[aria-label=${JSON.stringify(source)}] .sumi-flows-label`)});
		const section = document.querySelector(${JSON.stringify(`section[aria-label=${JSON.stringify(target)}]`)});
		const box = section.getBoundingClientRect();
		const y = ${isLowerHalf ? "box.bottom - 2" : "box.top + 2"};
		send(heading, "dragstart", 0);
		send(section, "dragover", y);
		window.__held = { send, heading, section, y };
	})()`;
const projectDragState = `(() => {
	const lines = [...document.querySelectorAll(".sumi-flows-drop-line")];
	const general = document.querySelector("section[aria-label=General]").getBoundingClientRect();
	const box = lines[0]?.getBoundingClientRect();
	const y = box === undefined ? null : box.top + box.height / 2;
	const side = y === null ? null : y < general.top ? "above General" : y > general.bottom ? "below General" : "inside General";
	return [lines.length, side, [...document.querySelectorAll("section[data-dragging]")].map((one) => one.getAttribute("aria-label"))];
})()`;
const projectDrop = `(() => { const { send, heading, section, y } = window.__held; send(section, "drop", y); send(heading, "dragend", 0); })()`;

const droppedOnProject = (rowSelector: string, name: string, project: string): string =>
	`(() => {
		const transfer = new DataTransfer();
		const send = (el, type) => { const box = el.getBoundingClientRect(); return el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: box.top + box.height / 2 })); };
		const row = [...document.querySelectorAll(${JSON.stringify(rowSelector)})].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(name)});
		const section = document.querySelector(${JSON.stringify(`section[aria-label=${JSON.stringify(project)}]`)});
		send(row, "dragstart");
		send(section, "dragover");
		send(section, "drop");
		send(row, "dragend");
	})()`;

async function projects(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		check("General is the only project section at first", await page.ask(sectionNames), ["Inbox", "General"]);
		await page.ask(`window.__projects("create", { name: "Alpha" })`);
		await waited(SETTLE_MS);
		check("a created project is a section after General", await page.ask(sectionNames), ["Inbox", "General", "Alpha"]);
		check("an empty project shows one New session row", await page.ask(sectionRows("Alpha")), [["new", "New session"]]);
		await pressOn(page, "section[aria-label=Alpha] .sumi-flows-row", "New session");
		await waited(SETTLE_MS * 2);
		check("pressing it creates a session in that project", await page.ask(sectionRows("Alpha")), [
			["flow", "New session"],
		]);
		await page.ask(contextOn(rowOf(FLOWS, "Plugin layout")));
		await waited(300);
		check(
			"the row menu has one Move to item and no project rows until it opens",
			await page.ask(
				`[[...document.querySelectorAll("[role=menuitem]")].filter((one) => one.textContent === "Move to").length, document.querySelectorAll("[role=menuitemradio]").length]`,
			),
			[1, 0],
		);
		const projectRows = `document.querySelectorAll("[role=menuitemradio]").length`;
		await page.ask(
			`[...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === "Move to").focus()`,
		);
		await page.pressKey("ArrowRight");
		await waited(600);
		check("ArrowRight on Move to opens the project submenu", await page.ask(projectRows), 2);
		await page.pressKey("ArrowLeft");
		await waited(700);
		check(
			"ArrowLeft closes the submenu and keeps the menu",
			await page.ask(`[${projectRows}, document.querySelectorAll("[role=menuitem]").length > 0]`),
			[0, true],
		);
		await page.ask(clickText("[role=menuitem]", "Move to"));
		await waited(500);
		await page.ask(clickText("[role=menuitemradio]", "Alpha"));
		await waited(SETTLE_MS);
		check(
			"Move to puts the session in the chosen project",
			[
				((await page.ask(namesOf(FLOWS))) as string[]).includes("Plugin layout"),
				((await page.ask(namesOf("section[aria-label=Alpha] .sumi-flows-row"))) as string[]).includes("Plugin layout"),
			],
			[false, true],
		);
		await page.ask(contextOn(rowOf("section[aria-label=Alpha] .sumi-flows-row", "Plugin layout")));
		await waited(300);
		await page.ask(clickText("[role=menuitem]", "Move to"));
		await waited(500);
		check(
			"Move to ticks the current project only",
			await page.ask(
				`[...document.querySelectorAll("[role=menuitemradio]")].map((one) => [one.textContent, one.getAttribute("aria-checked")])`,
			),
			[
				["General", "false"],
				["Alpha", "true"],
			],
		);
		await page.pressKey("Escape");
		await waited(300);
		await page.pressKey("Escape");
		await waited(300);
		await page.ask(projectDragOver("Alpha", "General", false));
		await waited(300);
		const dragged = await page.ask(projectDragState);
		await page.ask(projectDrop);
		await waited(SETTLE_MS);
		check("dragging a heading shows one line above the target section and fades the dragged section", dragged, [
			1,
			"above General",
			["Alpha"],
		]);
		check("dropping a project heading reorders the sections", await page.ask(sectionNames), [
			"Inbox",
			"Alpha",
			"General",
		]);
		await page.ask(projectDragOver("Alpha", "General", true));
		await waited(300);
		check("one line below the last section shows where it lands", await page.ask(projectDragState), [
			1,
			"below General",
			["Alpha"],
		]);
		await page.ask(projectDrop);
		await waited(SETTLE_MS);
		check("dropping below the last section puts the project last", await page.ask(sectionNames), [
			"Inbox",
			"General",
			"Alpha",
		]);
		await page.ask(`document.querySelector("section[aria-label=Alpha] button[aria-label='Alpha menu']").click()`);
		await waited(300);
		check(
			"the project menu offers Rename, Base folder with its path, Delete project",
			await page.ask(`[...document.querySelectorAll("[role=menuitem]")].map((one) => one.textContent)`),
			["RenameF2", "Base folder~/Sumi/Alpha", "Delete project"],
		);
		await page.ask(clickText("[role=menuitem]", "Delete project"));
		await waited(SETTLE_MS);
		check("deleting a project removes its section", await page.ask(sectionNames), ["Inbox", "General"]);
		check(
			"and moves its sessions to General",
			((await page.ask(namesOf(FLOWS))) as string[]).includes("Plugin layout"),
			true,
		);
		await page.ask(`document.querySelector("section[aria-label=General] button[aria-label='General menu']").click()`);
		await waited(300);
		check(
			"General has no Delete project",
			await page.ask(`[...document.querySelectorAll("[role=menuitem]")].map((one) => one.textContent)`),
			["RenameF2", "Base folder~/Sumi/General"],
		);
		await page.pressKey("Escape");
		const refused = await page.ask(
			`window.__projects("remove", { id: "general" }).then((answer) => JSON.stringify(answer))`,
		);
		check("deleting General is an error, not a silent write", String(refused).includes("cannot be deleted"), true);
		await page.ask(contextOn(`document.querySelector("section[aria-label=General]")`));
		await waited(300);
		await page.ask(clickText("[role=menuitem]", "New project"));
		await waited(SETTLE_MS);
		const renameField = `(() => { const input = document.querySelector(".sumi-flows-field-input"); return [input?.value, document.activeElement === input, input?.selectionStart, input?.selectionEnd]; })()`;
		check("New project creates Untitled project at once", await page.ask(sectionNames), [
			"Inbox",
			"General",
			"Untitled project",
		]);
		check("its heading is in rename with the name selected", await page.ask(renameField), [
			"Untitled project",
			true,
			0,
			16,
		]);
		await page.ask(
			`document.querySelector(".sumi-flows-field-input").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))`,
		);
		await waited(SETTLE_MS);
		check(
			"Escape keeps the name and closes the field",
			[await page.ask(sectionNames), await page.ask(count(".sumi-flows-field-input"))],
			[["Inbox", "General", "Untitled project"], 0],
		);
		await page.ask(contextOn(`document.querySelector("section[aria-label=General]")`));
		await waited(300);
		await page.ask(clickText("[role=menuitem]", "New project"));
		await waited(SETTLE_MS);
		check("a second press makes Untitled project 2", await page.ask(sectionNames), [
			"Inbox",
			"General",
			"Untitled project",
			"Untitled project 2",
		]);
		check("and renames it with the text selected", await page.ask(renameField), ["Untitled project 2", true, 0, 18]);
		await page.typeText("Beta");
		await page.pressEnter();
		await waited(SETTLE_MS);
		check("typing then Enter renames the project", await page.ask(sectionNames), [
			"Inbox",
			"General",
			"Untitled project",
			"Beta",
		]);
		await page.ask(droppedOnProject(`${FLOWS}[data-kind=flow]`, "Plugin layout", "Beta"));
		await waited(SETTLE_MS);
		check("dropping a session on a project section moves it there", await page.ask(sectionRows("Beta")), [
			["flow", "Plugin layout"],
		]);
		await page.ask(droppedOnProject(".sumi-flows-row[data-kind=folder]", "Personal", "Beta"));
		await waited(SETTLE_MS);
		check("dropping a folder on a project section moves it there", await page.ask(sectionRows("Beta")), [
			["flow", "Plugin layout"],
			["folder", "Personal"],
		]);
	});
}

const headingOf = (project: string): string =>
	`document.querySelector(${JSON.stringify(`section[aria-label=${JSON.stringify(project)}] .sumi-flows-label-main`)})`;
const headingCentre = (project: string): string =>
	`(() => { const box = ${headingOf(project)}.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`;
const chevronName = (project: string): string =>
	`(() => { const chevron = ${headingOf(project)}.querySelector(".sumi-flows-chevron"); return getComputedStyle(chevron).display === "none" ? "hidden" : chevron.querySelector("path").getAttribute("d").startsWith("M18") ? "down" : "right"; })()`;
const isCollapsedInData = (name: string): string =>
	`(async () => (await window.__flowsSidebar()).output.projects.find((one) => one.name === ${JSON.stringify(name)}).isCollapsed)()`;

async function collapsing(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(`window.__projects("create", { name: "Gamma" })`);
		await waited(SETTLE_MS);
		await pressOn(page, "section[aria-label=Gamma] .sumi-flows-row", "New session");
		await waited(SETTLE_MS * 2);
		const [awayX, awayY] = [900, 600];
		await page.hover(awayX, awayY);
		await waited(300);
		check("an expanded project shows no chevron at rest", await page.ask(chevronName("Gamma")), "hidden");
		const [x, y] = (await page.ask(headingCentre("Gamma"))) as [number, number];
		await page.hover(x, y);
		await waited(300);
		check("hovering an expanded heading shows chevron-down", await page.ask(chevronName("Gamma")), "down");
		await page.press(x, y);
		await waited(SETTLE_MS);
		check("pressing the heading hides the project rows", await page.ask(sectionRows("Gamma")), []);
		await page.hover(awayX, awayY);
		await waited(300);
		check("a collapsed project keeps chevron-right visible at rest", await page.ask(chevronName("Gamma")), "right");
		check("the collapsed state is stored in the data", await page.ask(isCollapsedInData("Gamma")), true);
		await page.press(x, y);
		await waited(SETTLE_MS);
		check("pressing again shows the rows", (await page.ask(sectionRows("Gamma"))) as unknown[][], [
			["flow", "New session"],
		]);
		check("the expanded state is stored in the data", await page.ask(isCollapsedInData("Gamma")), false);
	});
}

const FRAMES_RECORDED = 5;
const FIRST_FRAME_DRIFT_PX = 1;

const menuFrames = (target: string, atEdge = false): string => `new Promise((done) => {
	const row = ${target};
	const box = row.getBoundingClientRect();
	row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: ${atEdge} ? innerWidth - 12 : box.left + 40, clientY: ${atEdge} ? innerHeight - 12 : box.top + 10 }));
	const frames = [];
	const read = () => {
		const panel = document.querySelector("[role=menu]")?.closest(".wg-kit-pop, .wg-kit-float");
		if (!panel) return null;
		const rect = panel.getBoundingClientRect();
		const look = getComputedStyle(panel);
		const [originX, originY] = look.transformOrigin.split(" ").map(parseFloat);
		return { left: parseFloat(panel.style.left), top: parseFloat(panel.style.top), x: rect.left, y: rect.top, animation: look.animationName + " " + look.animationDuration, border: look.borderTopWidth, originX, originY };
	};
	const step = (count) => {
		frames.push(read());
		if (count < ${FRAMES_RECORDED}) requestAnimationFrame(() => step(count + 1));
		else setTimeout(() => {
			const settled = read();
			const click = { x: ${atEdge} ? innerWidth - 12 : box.left + 40, y: ${atEdge} ? innerHeight - 12 : box.top + 10 };
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
			requestAnimationFrame(() => {
				const closing = read();
				setTimeout(() => done({ frames, settled, click, closing, gone: read() === null }), 600);
			});
		}, 900);
	};
	requestAnimationFrame(() => step(1));
})`;

interface MenuFrame {
	readonly left: number;
	readonly top: number;
	readonly x: number;
	readonly y: number;
	readonly animation: string;
	readonly border: string;
	readonly originX: number;
	readonly originY: number;
}

async function menusPlacedOnFirstFrame(atEdge: boolean): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const { frames, settled, click, closing, gone } = (await page.ask(
			menuFrames(rowOf(FLOWS, "Plugin layout"), atEdge),
		)) as {
			readonly frames: readonly (MenuFrame | null)[];
			readonly settled: MenuFrame;
			readonly click: { readonly x: number; readonly y: number };
			readonly closing: MenuFrame | null;
			readonly gone: boolean;
		};
		check(
			"a row menu is in the DOM on the first frame",
			frames.every((frame) => frame !== null),
			true,
		);
		check(
			"a row menu's laid position never moves from the first frame on",
			frames.map(
				(frame) =>
					frame !== null &&
					Math.abs(frame.left - settled.left) <= FIRST_FRAME_DRIFT_PX &&
					Math.abs(frame.top - settled.top) <= FIRST_FRAME_DRIFT_PX,
			),
			frames.map(() => true),
		);
		console.log(
			`   ${atEdge ? "edge" : "corner"} menu frame 1: ${frames[0]?.animation}, border ${frames[0]?.border}, origin ${frames[0]?.originX},${frames[0]?.originY} for a click at ${click.x - settled.left},${click.y - settled.top}; closing: ${closing?.animation}`,
		);
		check(
			"a row menu opens with a 120ms scale-and-fade from the first frame",
			frames[0]?.animation,
			"wg-kit-pop-in 0.12s",
		);
		check("and closes with the same 120ms in reverse", closing?.animation, "wg-kit-pop-out 0.12s");
		check("and is unmounted once the close animation ends", gone, true);
		check("a row menu has no border", settled.border, "0px");
		check(
			"a row menu scales from the click point, in its own coordinates (within 2px)",
			[
				Math.abs(settled.originX - (click.x - settled.left)) <= 2,
				Math.abs(settled.originY - (click.y - settled.top)) <= 2,
			],
			[true, true],
		);
	});
}

const SHOTS = "/tmp/close-shots";
const FALLBACK_PAGE = String.raw`"Open (chat|tab)"|wg-pane-empty|data-pane-empty|data-pane-open|EmptyPanes`;
const FALLBACK_HOMES = ["apps/studio/src", "plugins/tabs", "plugins/sumi-host"];

interface SidebarRows {
	readonly looseFlows: readonly { readonly id: string }[];
	readonly folders: readonly { readonly flows: readonly { readonly id: string }[] }[];
}

async function lastSessionReplaced(): Promise<void> {
	await inInbox("light", "quiet+board", async (page) => {
		const rows = (await page.ask("window.__flowsSidebar().then((answer) => answer.output)")) as SidebarRows;

		for (const { id } of [...rows.looseFlows, ...rows.folders.flatMap(({ flows }) => flows)]) {
			await page.ask(`window.__archive(${JSON.stringify(id)}).then(() => true)`);
		}

		await waited(SETTLE_MS);
		mkdirSync(SHOTS, { recursive: true });
		writeFileSync(path.join(SHOTS, "last-session-replaced.png"), await page.shoot());
		check(
			"ARCHIVING THE LAST SESSION SHOWS A NEW ONE: General holds one current New session, its Home tab on the board",
			[
				await page.ask(namesOf(`${FLOWS}[data-kind=flow]`)),
				await page.ask(`document.querySelector("[aria-current=true] .sumi-flows-name")?.textContent ?? null`),
				await page.ask(count(".sumi-pane-tab")),
				await page.ask(count("[data-pane-open], [data-pane-empty]")),
			],
			[["New session"], "New session", 1, 0],
		);
	});
	const found = spawnSync("grep", ["-rlE", FALLBACK_PAGE, ...FALLBACK_HOMES], { encoding: "utf8" }).stdout.trim();
	check("no code path renders the Open chat / Open tab fallback page", found, "");
}

await menusPlacedOnFirstFrame(false);
await menusPlacedOnFirstFrame(true);
await inboxRows();
await inboxOpening();
await inboxClearing();
await rowsAndFolders();
await emptySpaceMenu();
await renaming();
await hoverPanel();
await hiding();
await peekHolds();
await dragging();
await dropIndicator();
await folderBetweenSessions();
await dragContainers();
await dragShots();
await editingIcon();
await deleting();
await closingSessions();
await rowMenuReopens();
await folderMenuAndArchive();
await projects();
await collapsing();
await lastSessionReplaced();

if (tally.failed > 0) {
	console.log(`${tally.failed} failed`);
	process.exit(1);
}

console.log("flows sidebar: all checks passed");
