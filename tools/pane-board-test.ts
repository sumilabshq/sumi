import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { PaneTreeStore } from "../packages/shell/shared/lib/pane-tree-store.ts";
import { leavesOf } from "../packages/shell/shared/lib/pane-tree.ts";
import { paneRectsOf, sideAt } from "../packages/shell/shared/lib/pane-layout.ts";
import { FIRST_PANES } from "../packages/shell/gateways/shell-parts/shell-parts.gateway.ts";
import { HostTabs } from "../packages/app-host/shared/lib/host-tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../packages/app-host/shared/lib/host-tabs/tab-lists.ts";
import { sidebarOf } from "../packages/app-host/features/tabs/lib/tab-rows.ts";

let failed = 0;
const quiet = console.info;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — ${JSON.stringify(got)}`}`);
}

function shapeOf(store: PaneTreeStore): readonly string[] {
	return leavesOf(store.now().root).map((leaf) => (leaf.view.kind === "chat" ? "chat" : (leaf.view.tabId ?? "shown")));
}

function checksTree(): void {
	console.info = () => undefined;
	const store = new PaneTreeStore(FIRST_PANES);
	store.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-app", side: "right" });
	check(
		"a tab dropped on the right of the app pane stands after it",
		JSON.stringify(shapeOf(store)) === '["chat","shown","tab-3"]',
		shapeOf(store),
	);
	store.place({ kind: "app", tabId: "tab-3" }, { targetId: "pane-chat", side: "left" });
	check(
		"placing a tab that already stands moves it, never copies it",
		JSON.stringify(shapeOf(store)) === '["tab-3","chat","shown"]',
		shapeOf(store),
	);
	store.place({ kind: "app", tabId: "tab-4" }, { targetId: "pane-app", side: "bottom" });
	const root = store.now().root;
	check(
		"a drop on the bottom edge wraps the pane in a column",
		root?.kind === "split" && JSON.stringify(root.children.map((child) => child.kind)) === '["pane","pane","split"]',
		root,
	);
	const leafIds = leavesOf(store.now().root).map((leaf) => leaf.id);
	leafIds.forEach((id) => store.close(id));
	check("closing every pane leaves an empty board", store.now().root === null, store.now().root);
	store.place({ kind: "chat" }, { targetId: null, side: "right" });
	check("a pane placed on an empty board is the whole board", store.now().root?.kind === "pane", store.now().root);
	const tabs = new HostTabs(null, "chat-1");
	tabs.open({ app: "browser", pageId: null }, { chatId: WORKSPACE_LIST, groupId: null, before: null });
	tabs.open({ app: "browser", pageId: null }, { chatId: WORKSPACE_LIST, groupId: null, before: null });
	const sidebar = sidebarOf({
		moment: tabs.now(),
		essentials: [],
		pages: [],
		shownApp: null,
		chat: { id: "chat-1", title: "Chat" },
		shutLists: [],
		inPanes: ["tab-1"],
	});
	const rows =
		sidebar.sections[0]?.entries.flatMap((entry) =>
			entry.kind === "tab" ? [[entry.tab.id, entry.tab.isShown]] : [],
		) ?? [];
	check(
		"a tab standing in a pane is marked shown in the sidebar",
		JSON.stringify(rows) === '[["tab-1",true],["tab-2",false]]',
		rows,
	);
	console.info = quiet;
	const rects = paneRectsOf(FIRST_PANES.root, { left: 0, top: 0, width: 1000, height: 800 }, { gap: 8, chatPx: 560 });
	check(
		"the chat keeps its width and the app takes the rest",
		rects.get("pane-chat")?.width === 560 && rects.get("pane-app")?.width === 432,
		[...rects],
	);
	const narrow = paneRectsOf(FIRST_PANES.root, { left: 0, top: 0, width: 700, height: 800 }, { gap: 8, chatPx: 560 });
	check("a narrow board gives the chat up so the app keeps 320", narrow.get("pane-app")?.width === 320, [...narrow]);
	const pane = { left: 0, top: 0, width: 400, height: 400 };
	check(
		"the pointer's nearest edge picks the side, the middle replaces",
		JSON.stringify([
			sideAt(pane, 20, 200),
			sideAt(pane, 390, 200),
			sideAt(pane, 200, 10),
			sideAt(pane, 200, 395),
			sideAt(pane, 200, 200),
		]) === '["left","right","top","bottom","center"]',
		null,
	);
}

const CARRY = `((phase, x, y) => { const detail = { phase, item: { kind: "tab", id: "tab-9", title: "Docs" }, x, y, isTaken: false }; document.dispatchEvent(new CustomEvent("wg-carry", { detail })); return detail.isTaken; })`;
const PANES = `[...document.querySelectorAll("[data-pane-id]")].map((pane) => [pane.dataset.paneId, Math.round(pane.getBoundingClientRect().width)])`;

async function pageOf(folder: string): Promise<AskedPage> {
	const bundle = await bundleOf("tools/shell-frame-page.tsx");
	const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
		.map((at) => readFileSync(at, "utf8"))
		.join("\n");
	const file = path.join(folder, "pane-board.html");
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style><style>html,body,#root{height:100%;margin:0}</style></head><body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();</script><script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`,
	);
	const page = await paged(file, "test:pane-board", { size: [1440, 900] });
	await waited(1500);
	return page;
}

async function centreRightOf(page: AskedPage, paneId: string): Promise<readonly [number, number]> {
	const point = await page.ask(
		`(() => { const box = document.querySelector('[data-pane-id="${paneId}"]').getBoundingClientRect(); return [box.right - 20, box.top + box.height / 2]; })()`,
	);
	return Array.isArray(point) ? [Number(point[0]), Number(point[1])] : [0, 0];
}

async function checksBoard(folder: string): Promise<void> {
	const page = await pageOf(folder);
	const before = await page.ask(PANES);
	const [x, y] = await centreRightOf(page, "pane-app");
	const taken = await page.ask(`${CARRY}("over", ${x}, ${y})`);
	await waited(400);
	const during = await page.ask(PANES);
	const preview = await page.ask(`document.querySelector(".wg-pane-preview") !== null`);
	writeFileSync(path.join(folder, "pane-preview.png"), await page.shoot());
	check(
		"a tab carried over the right edge of the app pane is taken and previewed",
		taken === true && preview === true,
		{ taken, preview },
	);
	check("the app pane shrinks to make room before the drop", JSON.stringify(during) !== JSON.stringify(before), [
		before,
		during,
	]);
	await page.ask(`${CARRY}("drop", ${x}, ${y})`);
	await waited(400);
	const after = (await page.ask(PANES)) as unknown[];
	check(
		"the drop makes a third pane and the preview leaves",
		after.length === 3 && (await page.ask(`document.querySelector(".wg-pane-preview") === null`)) === true,
		after,
	);
	const keptAsPreviewed = after.filter((pane) => JSON.stringify(during).includes(JSON.stringify(pane)));
	check(
		"the preview shows the panes exactly as the drop leaves them",
		JSON.stringify(keptAsPreviewed) === JSON.stringify(during),
		{ during, after },
	);
	writeFileSync(path.join(folder, "pane-dropped.png"), await page.shoot());
	const outside = await page.ask(`${CARRY}("over", 5, 5)`);
	check("a carry outside the board is not taken", outside === false, outside);
	await page.ask(`${CARRY}("leave", 5, 5)`);

	for (const id of ["pane-1", "pane-app", "pane-chat"]) {
		await page.ask(`document.querySelector('[data-pane-close="${id}"]').click(); true`);
		await waited(250);
	}

	check(
		"closing every pane shows the empty board",
		(await page.ask(`document.querySelector("[data-pane-empty]") !== null`)) === true,
		await page.ask(PANES),
	);
	await page.ask(`document.querySelector('[data-pane-open="chat"]').click(); true`);
	await waited(300);
	check(
		"Open chat brings the chat back as the whole board",
		JSON.stringify(
			await page.ask(`[...document.querySelectorAll("[data-pane-id]")].map((pane) => pane.dataset.paneView)`),
		) === '["chat"]',
		await page.ask(PANES),
	);
	page.close();
}

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-pane-board"));
mkdirSync(folder, { recursive: true });
checksTree();
await checksBoard(folder);
console.log(failed === 0 ? "pane board: all checks pass" : `pane board: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
