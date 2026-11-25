import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";
import { doubleClickOn, hoverOn, openedSidebar, pressOn, rowOf } from "./flows-sidebar-harness.ts";

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
		const send = (el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
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
			["Rename", "Edit icon", "Duplicate", "Archive", "New project…", "Delete flow"],
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
		await page.ask(clickText("[role=alertdialog] button", "Delete flow"));
		await waited(SETTLE_MS * 2);
		check(
			"Delete flow takes the Flow out of the sidebar",
			((await page.ask(namesOf(FLOWS))) as string[]).includes("Plugin layout"),
			false,
		);
		check("and out of Inbox", ((await page.ask(namesOf(INBOX))) as string[]).includes("Plugin layout"), false);
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

const sectionNames = `[...document.querySelectorAll("section[aria-label]")].map((one) => one.getAttribute("aria-label"))`;
const sectionRows = (section: string): string =>
	`[...document.querySelectorAll(${JSON.stringify(`section[aria-label=${JSON.stringify(section)}] .sumi-flows-row`)})].map((one) => [one.dataset.kind, one.querySelector(".sumi-flows-name")?.textContent])`;
const projectIdOf = (name: string): string =>
	`(async () => (await window.__flowsSidebar()).projects.find((one) => one.name === ${JSON.stringify(name)}).id)()`;
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
const projectDragState = `(() => [[...document.querySelectorAll("section[data-line]")].map((one) => [one.getAttribute("aria-label"), one.dataset.line]), [...document.querySelectorAll("section[data-dragging]")].map((one) => one.getAttribute("aria-label"))])()`;
const projectDrop = `(() => { const { send, heading, section, y } = window.__held; send(section, "drop", y); send(heading, "dragend", 0); })()`;

const droppedOnProject = (rowSelector: string, name: string, project: string): string =>
	`(() => {
		const transfer = new DataTransfer();
		const send = (el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
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
		await page.ask(projectDragOver("Alpha", "General", false));
		await waited(300);
		const dragged = await page.ask(projectDragState);
		await page.ask(projectDrop);
		await waited(SETTLE_MS);
		check("dragging a heading shows a line before the target and fades the dragged section", dragged, [
			[["General", "before"]],
			["Alpha"],
		]);
		check("dropping a project heading reorders the sections", await page.ask(sectionNames), [
			"Inbox",
			"Alpha",
			"General",
		]);
		await page.ask(projectDragOver("Alpha", "General", true));
		await waited(300);
		check("a line after the last section shows where it lands", await page.ask(projectDragState), [
			[["General", "after"]],
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
		check("New project opens a field at the end", await page.ask(count(".sumi-flows-field-input")), 1);
		await page.typeText("Beta");
		await page.pressEnter();
		await waited(SETTLE_MS);
		check("Enter creates the project", await page.ask(sectionNames), ["Inbox", "General", "Beta"]);
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
await editingIcon();
await deleting();
await folderMenuAndArchive();
await projects();

if (tally.failed > 0) {
	console.log(`${tally.failed} failed`);
	process.exit(1);
}

console.log("flows sidebar: all checks passed");
