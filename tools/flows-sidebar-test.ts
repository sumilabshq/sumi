import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";
import { doubleClickOn, hoverOn, openedSidebar, pressOn, rowOf } from "./flows-sidebar-harness.ts";

const INBOX = "section[aria-label=Inbox] .sumi-flows-row";
const FLOWS = "section[aria-label=Flows] .sumi-flows-row";
const FOLDERS = ".sumi-flows-row[data-kind=folder]";
const SETTLE_MS = 600;

const namesOf = (selector: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(selector)})].map((one) => one.querySelector(".sumi-flows-name")?.textContent)`;

const count = (selector: string): string => `document.querySelectorAll(${JSON.stringify(selector)}).length`;

const clickText = (selector: string, text: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(selector)})].find((one) => one.textContent === ${JSON.stringify(text)}).click()`;

const folderFlowsOf = (folder: string): string =>
	`(() => { const group = [...document.querySelectorAll(".sumi-flows-folder")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(folder)}); return [...group.querySelectorAll(".sumi-flows-row[data-kind=flow] .sumi-flows-name")].map((one) => one.textContent); })()`;

const dragged = (source: string, folder: string): string =>
	`(() => {
		const transfer = new DataTransfer();
		const send = (el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
		const row = [...document.querySelectorAll(".sumi-flows-folder .sumi-flows-row[data-kind=flow]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(source)});
		const target = [...document.querySelectorAll(".sumi-flows-row[data-kind=folder]")].find((one) => one.querySelector(".sumi-flows-name")?.textContent === ${JSON.stringify(folder)});
		send(row, "dragstart");
		send(target, "dragover");
		send(target, "drop");
		send(row, "dragend");
	})()`;

const bundled = await bundleOf("tools/flows-sidebar-page.tsx");

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
			"Inbox title row is the label and Clear, no count",
			await page.ask(`document.querySelector("section[aria-label=Inbox] .sumi-flows-label").textContent`),
			"InboxClear",
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
		await page.ask(clickText(".sumi-flows-label-action", "Clear"));
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
		await page.ask(clickText(".sumi-flows-label-action", "Clear"));
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
		await page.ask(clickText(".sumi-flows-label-action", "Clear"));
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
		await page.ask(clickText(".sumi-flows-label-action", "Clear"));
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
			((await page.ask(folderFlowsOf("Personal"))) as string[]).includes("New flow"),
			true,
		);
	});
}

async function renaming(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await doubleClickOn(page, ".sumi-flows-row-main", "Client project");
		await waited(300);
		check("double click turns the row into a field", await page.ask(count(".sumi-flows-field-input")), 1);
		await page.typeText("Customer work");
		await page.pressEnter();
		await waited(SETTLE_MS);
		check("Enter renames the folder", await page.ask(namesOf(FOLDERS)), [
			"Sumi",
			"Customer work",
			"Personal",
			"Research",
		]);
		await doubleClickOn(page, ".sumi-flows-row-main", "Customer work");
		await waited(300);
		const [x, y] = (await page.ask(
			`(() => { const box = document.querySelector(".sumi-flows-field-icon").getBoundingClientRect(); return [box.left + 10, box.top + 10]; })()`,
		)) as [number, number];
		await page.press(x, y);
		await waited(300);
		check(
			"the field icon opens a picker with Remove icon",
			await page.ask(`document.querySelector(".sumi-flows-picker-remove")?.textContent`),
			"Remove icon",
		);
	});
}

async function hoverPanel(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		const folderFlow = ".sumi-flows-folder .sumi-flows-row[data-kind=flow]";
		await hoverOn(page, folderFlow, "Composer redesign", 100);
		check("the chats panel waits 300 ms", await page.ask(count(".sumi-flows-chats")), 0);
		await waited(800);
		check("a Flow with several chats lists them on hover", await page.ask(namesOf(".sumi-flows-chats-item")), [
			"Refactor",
			"Run tests",
			"Update docs",
		]);
		await page.hover(900, 400);
		await waited(900);
		await hoverOn(page, folderFlow, "Design system", 1000);
		check("a Flow with one chat has no panel", await page.ask(count(".sumi-flows-chats")), 0);
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
		await doubleClickOn(page, "section[aria-label=Flows] .sumi-flows-row-main", "Sprint board");
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
		check("the chats card opens", await page.ask(count(".sumi-flows-chats")), 1);
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

async function deleting(): Promise<void> {
	await inInbox("light", "inbox", async (page) => {
		await page.ask(
			`${rowOf(FLOWS, "Plugin layout")}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 200 }))`,
		);
		await waited(300);
		check(
			"a Flow row menu offers Rename and Delete flow",
			await page.ask(`[...document.querySelectorAll("[role=menuitem]")].map((item) => item.textContent)`),
			["Rename", "Delete flow"],
		);
		await page.ask(clickText("[role=menuitem]", "Delete flow"));
		await waited(SETTLE_MS * 2);
		check(
			"Delete flow takes the Flow out of the sidebar",
			((await page.ask(namesOf(FLOWS))) as string[]).includes("Plugin layout"),
			false,
		);
		check("and out of Inbox", ((await page.ask(namesOf(INBOX))) as string[]).includes("Plugin layout"), false);
	});
}

await inboxRows();
await inboxOpening();
await inboxClearing();
await rowsAndFolders();
await renaming();
await hoverPanel();
await hiding();
await peekHolds();
await dragging();
await deleting();

if (tally.failed > 0) {
	console.log(`${tally.failed} failed`);
	process.exit(1);
}

console.log("flows sidebar: all checks passed");
