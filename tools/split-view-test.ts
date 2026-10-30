import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited, waitUntil } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [1440, 900];
const GATE = "test:split-view";
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-split-view"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/shell-frame-page.tsx");
const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function pageFileOf(theme: Theme): string {
	const html = `<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();history.replaceState(null, "", "?seeded");</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const file = path.join(shotsAt, `split-view-${theme}.html`);
	writeFileSync(file, html);
	return file;
}

const SIDEBAR_DRAWN = `new Promise((done) => {
	const seen = () => {
		if (document.querySelector('[data-ws-column] [data-tabs-chat="release"]') && document.querySelector("[data-pane-id]")) {
			done(true);
			return;
		}
		requestAnimationFrame(seen);
	};
	seen();
	setTimeout(() => done("never drawn: " + document.getElementById("boom").textContent), 15000);
})`;

const BOARD = `(() => [...document.querySelectorAll("[data-pane-id]")].map((pane) => {
	const box = pane.getBoundingClientRect();
	return { id: pane.dataset.paneId, view: pane.dataset.paneView, x: Math.round(box.left), y: Math.round(box.top), w: Math.round(box.width), h: Math.round(box.height) };
}))()`;

const PaneSchema = z.object({
	id: z.string(),
	view: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
});

const BLOCK = `(() => {
	const block = document.querySelector("[data-tabs-split]");
	if (block === null) return null;
	const box = block.getBoundingClientRect();
	const shownFold = (selector) => block.querySelector(selector)?.closest("[data-split-fold]")?.hasAttribute("data-open") ?? false;
	const head = block.querySelector("[data-split-head] [data-split-map]");
	return {
		isOpen: block.hasAttribute("data-open"),
		height: Math.round(box.height),
		fill: getComputedStyle(block).backgroundColor,
		headShown: shownFold("[data-split-head]"),
		rowShown: shownFold("[data-split-row]"),
		title: block.querySelector("[data-split-title]")?.textContent ?? null,
		members: [...block.querySelectorAll("[data-split-members] [data-tabs-place='top']")].map((row) => [row.dataset.tabsId, row.hasAttribute("data-shown")]),
		focusFill: (() => { const row = block.querySelector("[data-split-members] [data-shown]"); return row === null ? null : getComputedStyle(row).backgroundColor; })(),
		pins: [...block.querySelectorAll("[data-split-members] [data-split-pinned]")].map((pin) => pin.closest("[data-tabs-id]")?.dataset.tabsId ?? null),
		cells: head === null ? [] : [...head.querySelectorAll("rect")].map((cell) => ({ tabId: cell.dataset.splitCell, x: +cell.getAttribute("x"), y: +cell.getAttribute("y"), w: +cell.getAttribute("width"), h: +cell.getAttribute("height"), marked: cell.hasAttribute("data-marked"), fill: getComputedStyle(cell).fill })),
	};
})()`;

const CellSchema = z.object({
	tabId: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
	marked: z.boolean(),
	fill: z.string(),
});

const BlockSchema = z
	.object({
		isOpen: z.boolean(),
		height: z.number(),
		fill: z.string(),
		headShown: z.boolean(),
		rowShown: z.boolean(),
		title: z.string().nullable(),
		members: z.array(z.tuple([z.string(), z.boolean()])),
		focusFill: z.string().nullable(),
		pins: z.array(z.string().nullable()),
		cells: z.array(CellSchema),
	})
	.nullable();

type Block = z.infer<typeof BlockSchema>;
type Pane = z.infer<typeof PaneSchema>;

const carryAt = (kind: string, id: string, phase: string, [x, y]: PagePoint): string =>
	`(() => { const detail = { phase: ${JSON.stringify(phase)}, item: { kind: ${JSON.stringify(kind)}, id: ${JSON.stringify(id)}, title: ${JSON.stringify(id)} }, x: ${x}, y: ${y}, isTaken: false }; document.dispatchEvent(new CustomEvent("wg-carry", { detail })); return detail.isTaken; })()`;

const clickOn = (selector: string): string =>
	`(() => { const one = document.querySelector(${JSON.stringify(selector)}); if (one === null) return false; one.click(); return true; })()`;

const contextMenuAt = (selector: string): string => `(() => {
	const row = document.querySelector(${JSON.stringify(selector)});
	const box = row.getBoundingClientRect();
	row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + 20, clientY: box.top + box.height / 2 }));
	return true;
})()`;

async function boardOf(page: AskedPage): Promise<readonly Pane[]> {
	return z.array(PaneSchema).parse(await page.ask(BOARD));
}

async function blockOf(page: AskedPage): Promise<Block> {
	return BlockSchema.parse(await page.ask(BLOCK));
}

async function dropped(page: AskedPage, item: readonly [string, string], at: PagePoint): Promise<void> {
	await page.ask(carryAt(item[0], item[1], "over", at));
	await waited(80);
	await page.ask(carryAt(item[0], item[1], "drop", at));
	await waited(700);
}

function paneOf(board: readonly Pane[], id: string): Pane | undefined {
	return board.find((pane) => pane.id === id);
}

function rightEdgeOf(pane: Pane): PagePoint {
	return [pane.x + pane.w - 12, pane.y + pane.h / 2];
}

function bottomEdgeOf(pane: Pane): PagePoint {
	return [pane.x + pane.w / 2, pane.y + pane.h - 12];
}

async function settled(page: AskedPage, isMet: (board: readonly Pane[]) => boolean): Promise<readonly Pane[]> {
	await waitUntil(async () => isMet(await boardOf(page)), 3000, 60);
	await waited(350);
	return boardOf(page);
}

function cellsMatchPanes(block: Block, board: readonly Pane[]): boolean {
	if (block === null || block.cells.length === 0) {
		return false;
	}

	const area = boxAround(board);
	return block.cells.every((cell) => {
		const pane = paneOf(board, `pane-split-${cell.tabId}`) ?? board.find((one) => one.view === "chat");
		return (
			pane !== undefined &&
			Math.abs(cell.w / 16 - pane.w / area.w) < 0.15 &&
			Math.abs(cell.h / 11 - pane.h / area.h) < 0.2
		);
	});
}

function boxAround(board: readonly Pane[]): { readonly w: number; readonly h: number } {
	const left = Math.min(...board.map((pane) => pane.x));
	const top = Math.min(...board.map((pane) => pane.y));
	return {
		w: Math.max(...board.map((pane) => pane.x + pane.w)) - left,
		h: Math.max(...board.map((pane) => pane.y + pane.h)) - top,
	};
}

async function checksSplitMade(page: AskedPage): Promise<void> {
	await page.ask(clickOn('[data-tabs-id="tab-1"]'));
	const lone = await settled(page, (board) => board.some((pane) => pane.view === "app"));
	const shown = lone.find((pane) => pane.view === "app");
	check("a tab shown alone stands in the board", shown !== undefined, lone);

	if (shown === undefined) {
		return;
	}

	await dropped(page, ["tab", "tab-2"], rightEdgeOf(shown));
	const board = await settled(page, (now) => paneOf(now, "pane-split-tab-2") !== undefined);
	const left = paneOf(board, "pane-split-tab-1");
	const right = paneOf(board, "pane-split-tab-2");
	check(
		"a tab dropped on the content's right edge splits the view: both drawn side by side, nothing else",
		left !== undefined && right !== undefined && left.x < right.x && board.length === 2,
		board,
	);
	checksOpenBlock(await blockOf(page), board);
}

function checksOpenBlock(block: Block, board: readonly Pane[]): void {
	check(
		"the sidebar holds one open split block: the map, two member rows, the dropped one focused",
		block !== null &&
			block.isOpen &&
			block.headShown &&
			!block.rowShown &&
			JSON.stringify(block.members) ===
				JSON.stringify([
					["tab-1", false],
					["tab-2", true],
				]),
		block,
	);
	checksBlockLook(block, board);
}

function checksBlockLook(block: Block, board: readonly Pane[]): void {
	check(
		"the block is a plate of its own and the focused row inside it is shaded, not white",
		block !== null && block.fill !== "rgba(0, 0, 0, 0)" && block.focusFill !== null && block.focusFill !== block.fill,
		[block?.fill, block?.focusFill],
	);
	check(
		"the map's cells match the panes' proportions and the focused cell alone is dark",
		cellsMatchPanes(block, board) &&
			block?.cells
				.filter((cell) => cell.marked)
				.map((cell) => cell.tabId)
				.join() === "tab-2",
		block?.cells,
	);
}

async function checksChatJoins(page: AskedPage): Promise<void> {
	const before = await boardOf(page);
	const right = paneOf(before, "pane-split-tab-2");

	if (right === undefined) {
		check("the split stands before a chat joins it", false, before);
		return;
	}

	await dropped(page, ["chat", "release"], bottomEdgeOf(right));
	const board = await settled(page, (now) => now.some((pane) => pane.view === "chat"));
	const chat = board.find((pane) => pane.view === "chat");
	const stage = board.filter((pane) => pane.view === "app" && !pane.id.startsWith("pane-split-"));
	check(
		"a chat dropped below a member joins the split with its own stage: the chat and its sub-tab beside it",
		chat !== undefined && board.length >= 3 && stage.length >= 1,
		board,
	);
	const block = await blockOf(page);
	check("the block now counts three members", block?.members.length === 3, block?.members);
}

async function checksSwap(page: AskedPage): Promise<void> {
	await page.ask(clickOn('[data-tabs-chat="checks"]'));
	const board = await settled(page, (now) => !now.some((pane) => pane.id.startsWith("pane-split-")));
	check(
		"a tab outside the split swaps the whole view: no member stays on the board",
		!board.some((pane) => pane.id.startsWith("pane-split-")) && board.some((pane) => pane.view === "chat"),
		board,
	);
	await waited(400);
	const block = await blockOf(page);
	check(
		'the block collapses to one row "A + B + C" with the overlapped icons and the map',
		block !== null &&
			!block.isOpen &&
			block.rowShown &&
			!block.headShown &&
			block.height <= 40 &&
			(block.title ?? "").split(" + ").length === 3,
		block,
	);
}

async function checksReturn(page: AskedPage): Promise<void> {
	await page.ask(clickOn("[data-split-row]"));
	const board = await settled(page, (now) => paneOf(now, "pane-split-tab-1") !== undefined);
	const block = await blockOf(page);
	check(
		"the collapsed row brings the whole split back, focused on the member it focused",
		paneOf(board, "pane-split-tab-1") !== undefined &&
			paneOf(board, "pane-split-tab-2") !== undefined &&
			block?.isOpen === true,
		{ board, block },
	);
	await page.ask(clickOn('[data-split-members] [data-tabs-id="tab-1"]'));
	await waited(700);
	const focused = await blockOf(page);
	check(
		"pressing a member focuses it, and its map cell turns dark",
		focused?.cells.find((cell) => cell.marked)?.tabId === "tab-1",
		focused?.cells,
	);
}

async function checksPinned(page: AskedPage): Promise<void> {
	await page.ask(contextMenuAt('[data-split-members] [data-tabs-id="tab-1"]'));
	await waited(250);
	await page.ask(clickOn('[data-tabs-pointer-menu] [data-tabs-menu-item="Pin"]'));
	await waited(700);
	const pinnedRow = await page.ask(
		`(() => { const row = document.querySelector('[data-tabs-list="pinned"] [data-tabs-id="tab-1"]'); return row === null ? null : { inBlock: row.closest("[data-tabs-split]") !== null, marked: [...row.querySelectorAll("[data-split-badge] rect")].filter((cell) => cell.hasAttribute("data-marked")).map((cell) => cell.dataset.splitCell) }; })()`,
	);
	check(
		"a pinned member stays in Pinned with the map, its own cell dark",
		JSON.stringify(pinnedRow) === JSON.stringify({ inBlock: false, marked: ["tab-1"] }),
		pinnedRow,
	);
	const block = await blockOf(page);
	check(
		"inside the block every pinned member wears a pin, the pinned chat too",
		JSON.stringify(block?.pins) === '["tab-1","release"]',
		block?.pins,
	);
}

async function checksDissolve(page: AskedPage): Promise<void> {
	const closeOf = (id: string): string =>
		`(() => { const row = document.querySelector('[data-split-members] [data-tabs-id="${id}"]'); row?.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 1 })); return row !== null; })()`;
	await page.ask(closeOf("tab-2"));
	await waited(800);
	const two = await blockOf(page);
	check("closing a member of three leaves a split of two", two?.members.length === 2, two?.members);
	await page.ask(closeOf("tab-1"));
	const board = await settled(page, (now) => !now.some((pane) => pane.id.startsWith("pane-split-")));
	const block = await blockOf(page);
	check(
		"closing a member of a split of two dissolves it and the other stands alone",
		block === null &&
			board.some((pane) => pane.view === "chat") &&
			!board.some((pane) => pane.id.startsWith("pane-split-")),
		{ block, board },
	);
}

async function shotOf(page: AskedPage, name: string): Promise<void> {
	const shot = path.join(shotsAt, `split-${name}.png`);
	writeFileSync(shot, await page.shoot());
	console.log(`shot ${shot}`);
}

async function walk(theme: Theme): Promise<void> {
	const page = await paged(pageFileOf(theme), GATE, { size: VIEW });
	try {
		const drawn = await page.ask(SIDEBAR_DRAWN);

		if (drawn !== true) {
			throw new Error(String(drawn));
		}

		await waited(500);
		await checksSplitMade(page);
		await checksChatJoins(page);
		await shotOf(page, `expanded-${theme}`);
		await checksSwap(page);
		await shotOf(page, `collapsed-${theme}`);

		if (theme === "light") {
			await checksReturn(page);
			await checksPinned(page);
			await checksDissolve(page);
		}

		const bad = await page.ask(`document.getElementById("boom").textContent`);
		check(`${theme}: nothing failed on the page`, bad === "", bad);
	} finally {
		page.close();
	}
}

await walk("light");
await walk("dark");
console.log(`\nsplit view: ${failed === 0 ? "clean" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
