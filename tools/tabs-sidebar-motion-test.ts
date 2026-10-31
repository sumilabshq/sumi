import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage, HeldDrag, PagePoint } from "./chrome-ask.ts";
import { openedPage, sidebarPageFile } from "./tabs-sidebar-pages.ts";
import { bottomOf, centreOf } from "./tabs-sidebar-scenes.ts";

const ROW_STEP_MOST_PX = 8;
const TILE_STEP_MOST_PX = 16;
const OVERLAP_SLACK_PX = 1;
const SETTLED_MS = 1300;
const GLIDE_STEPS = 14;
const STEP_MS = 16;
const PLAIN_ROWS = "[data-tabs-sidebar] [data-tabs-item=tab]:not([data-tabs-chat])";
const MEMBERS =
	"[data-tabs-split] [data-tabs-item=tab]:is([data-split-members] > *, [data-split-members] > [data-tabs-card] > *)";
const FRAMES_WATCHED = `(() => {
	const scroller = document.querySelector("[data-tabs-sidebar] [data-host-column-scroll]");
	window.__motion = { frames: [], isOn: true };
	const visibleOf = (element) => {
		let box = element.getBoundingClientRect();
		let top = box.top;
		let bottom = box.bottom;
		for (let fold = element.closest("[data-fold-box]"); fold !== null; fold = fold.parentElement?.closest("[data-fold-box]") ?? null) {
			const clip = fold.getBoundingClientRect();
			top = Math.max(top, clip.top);
			bottom = Math.min(bottom, clip.bottom);
		}
		return { left: box.left, right: box.right, top, bottom };
	};
	const sample = () => {
		if (!window.__motion.isOn) {
			return;
		}
		const scrolled = scroller.scrollTop;
		const seen = {};
		const items = [];
		const drawn = [...document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item][data-tabs-id]")];
		const copies = {};
		for (const one of drawn) {
			const named = one.dataset.tabsItem + ":" + one.dataset.tabsId;
			copies[named] = (copies[named] ?? 0) + 1;
		}
		for (const element of drawn) {
			const look = getComputedStyle(element);
			if (element.closest("[data-tabs-lifted]") !== null || look.visibility === "hidden" || Number(look.opacity) < 0.5) {
				continue;
			}
			const box = visibleOf(element);
			if (box.bottom - box.top < 1 || box.right - box.left < 1) {
				continue;
			}
			const shift = scroller.contains(element) ? scrolled : 0;
			const named = element.dataset.tabsItem + ":" + element.dataset.tabsId;
			const place = copies[named] > 1 ? (element.parentElement.closest("[data-tabs-split]")?.dataset.tabsSplit ?? "list") + ">" : "";
			const key = place + named;
			seen[key] = (seen[key] ?? 0) + 1;
			items.push({ key: key + "#" + seen[key], kind: element.dataset.tabsItem === "essential" ? "tile" : "row", left: box.left, right: box.right, top: box.top + shift, bottom: box.bottom + shift, seenTop: box.top });
		}
		window.__motion.frames.push(items);
		requestAnimationFrame(() => setTimeout(sample, 0));
	};
	requestAnimationFrame(() => setTimeout(sample, 0));
	return true;
})()`;
const ORDER_SHOWN = `(() => {
	const rows = [];
	let tiles = 0;
	for (const one of document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item][data-tabs-id]")) {
		if (one.dataset.tabsItem === "essential") {
			tiles += 1;
		} else if (!rows.includes(one.dataset.tabsId)) {
			rows.push(one.dataset.tabsId);
		}
	}
	return { rows, tiles };
})()`;
const SLOT_SHOWN = `(() => {
	const rows = [...document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item=tab]")];
	const lifted = rows.find((row) => row.closest("[data-tabs-lifted]") !== null);
	return { at: rows.indexOf(lifted), group: lifted?.closest("[data-tabs-box]")?.dataset.tabsBox ?? null };
})()`;
const FRAMES_TAKEN = `(() => { window.__motion.isOn = false; return window.__motion.frames; })()`;
const ItemSchema = z.object({
	key: z.string(),
	kind: z.enum(["row", "tile"]),
	left: z.number(),
	right: z.number(),
	top: z.number(),
	bottom: z.number(),
	seenTop: z.number(),
});
const FramesSchema = z.array(z.array(ItemSchema));
const OrderSchema = z.object({
	rows: z.array(z.string()),
	tiles: z.number(),
});

const SlotSchema = z.object({
	at: z.number(),
	group: z.string().nullable(),
});

type Slot = z.infer<typeof SlotSchema>;

type Order = z.infer<typeof OrderSchema>;

type Item = z.infer<typeof ItemSchema>;

interface Motion {
	readonly frames: number;
	readonly moved: number;
	readonly rowStep: number;
	readonly tileStep: number;
	readonly overlaps: readonly string[];
	readonly jumps: readonly string[];
}

let failures = 0;

function check(name: string, isTrue: boolean, seen: unknown): void {
	if (!isTrue) {
		failures += 1;
	}

	console.log(`${isTrue ? "ok  " : "FAIL"} ${name}${isTrue ? "" : ` — saw ${JSON.stringify(seen)}`}`);
}

function overlapsOf(items: readonly Item[]): readonly string[] {
	return items.flatMap((one, at) =>
		items.slice(at + 1).flatMap((other) => {
			if (one.kind !== other.kind) {
				return [];
			}

			const across = Math.min(one.right, other.right) - Math.max(one.left, other.left);
			const down = Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top);
			return across > OVERLAP_SLACK_PX && down > OVERLAP_SLACK_PX
				? [`${one.key}×${other.key}:${Math.round(down)}`]
				: [];
		}),
	);
}

function stepDownOf(was: Item, now: Item): number {
	return Math.min(Math.abs(now.top - was.top), Math.abs(now.seenTop - was.seenTop));
}

function motionOf(frames: readonly (readonly Item[])[]): Motion {
	const steps = frames.slice(1).flatMap((frame, at) => {
		const before = new Map((frames[at] ?? []).map((item) => [item.key, item]));
		return frame.flatMap((item) => {
			const was = before.get(item.key);
			return was === undefined
				? []
				: [{ item, at, step: Math.max(stepDownOf(was, item), Math.abs(item.left - was.left)) }];
		});
	});
	const stepOf = (kind: Item["kind"]): number =>
		steps.filter((one) => one.item.kind === kind).reduce((most, one) => Math.max(most, one.step), 0);
	const most = (kind: Item["kind"]): number => (kind === "row" ? ROW_STEP_MOST_PX : TILE_STEP_MOST_PX);
	return {
		frames: frames.length,
		moved: steps.filter((one) => one.step >= 0.5).length,
		rowStep: Math.round(stepOf("row") * 10) / 10,
		tileStep: Math.round(stepOf("tile") * 10) / 10,
		overlaps: frames.flatMap((frame, at) => overlapsOf(frame).map((said) => `${at}:${said}`)).slice(0, 6),
		jumps: steps
			.filter((one) => one.step > most(one.item.kind))
			.map((one) => `${one.at}:${one.item.key}:${Math.round(one.step)}`)
			.slice(0, 6),
	};
}

async function glide(drag: HeldDrag, from: PagePoint, to: PagePoint): Promise<void> {
	for (let step = 1; step <= GLIDE_STEPS; step += 1) {
		const share = step / GLIDE_STEPS;
		await drag.over([from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share]);
		await waited(STEP_MS);
	}
}

async function orderOf(page: AskedPage): Promise<Order> {
	return OrderSchema.parse(await page.ask(ORDER_SHOWN));
}

function comparableOf(order: Order, other: Order): string {
	const rows = order.rows.map((id) => (other.rows.includes(id) ? id : "*"));
	return `${rows.join(",")}|tiles:${order.tiles}`;
}

async function watched(page: AskedPage, kind: string, act: () => Promise<Order>): Promise<void> {
	await page.ask(FRAMES_WATCHED);
	const shown = await act();
	await waited(SETTLED_MS);
	const settled = await orderOf(page);
	check(
		`${kind}: the order shown just before release is the order the sidebar settles on`,
		comparableOf(shown, settled) === comparableOf(settled, shown),
		{
			shown: comparableOf(shown, settled),
			settled: comparableOf(settled, shown),
		},
	);
	const motion = motionOf(FramesSchema.parse(await page.ask(FRAMES_TAKEN)));
	check(`${kind}: rows move while it is carried and dropped`, motion.frames > 30 && motion.moved > 0, motion);
	check(`${kind}: no row overlaps another in any painted frame`, motion.overlaps.length === 0, motion);
	check(
		`${kind}: no row moves more than ${ROW_STEP_MOST_PX}px and no tile more than ${TILE_STEP_MOST_PX}px in one painted frame`,
		motion.jumps.length === 0,
		motion,
	);
}

async function carried(page: AskedPage, path: readonly PagePoint[]): Promise<Order> {
	const [from, first] = path;

	if (from === undefined || first === undefined) {
		throw new Error("a carry needs a start and a first step");
	}

	const drag = await page.lift({ from, to: first, steps: 6, stepMs: STEP_MS });
	let at = first;

	for (const next of path.slice(2)) {
		await glide(drag, at, next);
		at = next;
	}

	await waited(200);
	const shown = await orderOf(page);
	await drag.drop(at);
	return shown;
}

async function idsOf(page: AskedPage, selector: string): Promise<readonly string[]> {
	const ids = await page.ask(
		`[...document.querySelectorAll(${JSON.stringify(selector)})].map((one) => one.dataset.tabsId)`,
	);
	return Array.isArray(ids) ? ids.map(String) : [];
}

function below([x, y]: PagePoint, by: number): PagePoint {
	return [x, y + by];
}

function rowOf(id: string): string {
	return `[data-tabs-sidebar] [data-tabs-item][data-tabs-id="${id}"]`;
}

function isSkipped(was: Slot, now: Slot): boolean {
	const moved = Math.abs(now.at - was.at);
	return moved > 1 || (moved === 1 && now.group !== was.group);
}

async function checksWalkPastGroups(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-2"));
	const end = await centreOf(page, rowOf("tab-8"));
	const drag = await page.lift({ from, to: below(from, 4), steps: 4, stepMs: STEP_MS });
	const skips: string[] = [];
	let was = SlotSchema.parse(await page.ask(SLOT_SHOWN));

	for (let y = from[1] + 4; y <= end[1]; y += 1) {
		await drag.over([from[0], y]);
		await waited(STEP_MS);
		const now = SlotSchema.parse(await page.ask(SLOT_SHOWN));

		if (isSkipped(was, now)) {
			skips.push(`y=${y}: ${was.at}<${was.group}> → ${now.at}<${now.group}>`);
		}

		was = now;
	}

	await drag.drop(from);
	await waited(SETTLED_MS);
	check("a tab walked down a pixel at a time past two groups never skips a slot", skips.length === 0, skips);
}

async function checksRecents(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("chat-translator"));
	const top = await centreOf(page, rowOf("chat-release"));
	await watched(page, "a chat carried up Recents and back down", () =>
		carried(page, [from, below(from, -6), below(top, -10), below(top, 60)]),
	);
}

async function checksChildToRecents(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-7"));
	const top = await centreOf(page, rowOf("chat-release"));
	await watched(page, "a chat's tab carried out to the top of Recents", () =>
		carried(page, [from, below(from, -6), below(top, -10)]),
	);
}

async function checksIntoGroup(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-9"));
	const row = await centreOf(page, rowOf("tab-3"));
	await watched(page, "a tab carried into a group", () => carried(page, [from, below(from, -6), below(row, -8)]));
}

async function checksChatChild(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-8"));
	const head = await centreOf(page, '[data-tabs-box="group-13"] > [data-tabs-item=group]');
	await watched(page, "a chat's tab carried up inside its chat", () =>
		carried(page, [from, below(from, -6), below(head, -8)]),
	);
}

async function checksPinned(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-10"));
	const pinned = await bottomOf(page, '[data-tabs-section="pinned"]');
	await watched(page, "a tab carried up into Pinned", () => carried(page, [from, below(from, -6), below(pinned, 6)]));
}

async function checksTiles(page: AskedPage): Promise<void> {
	const from = await centreOf(page, "[data-tabs-item=essential]");
	const third = await centreOf(page, "[data-tabs-item=essential]:nth-child(3)");
	await watched(page, "an Essential carried along the grid", () =>
		carried(page, [from, [from[0] + 6, from[1]], third]),
	);
}

async function checksIntoEssentials(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-11"));
	const tile = await centreOf(page, "[data-tabs-item=essential]:nth-child(2)");
	await watched(page, "a tab carried into Essentials", () => carried(page, [from, below(from, -6), tile]));
}

async function checksOutOfEssentials(page: AskedPage): Promise<void> {
	const from = await centreOf(page, "[data-tabs-item=essential]:nth-child(2)");
	const end = await bottomOf(page, "[data-host-column-add]");
	await watched(page, "an Essential carried out to the list", () =>
		carried(page, [from, below(from, 6), below(end, -50)]),
	);
}

async function checksGroup(page: AskedPage): Promise<void> {
	const from = await centreOf(page, '[data-tabs-box="group-13"] > [data-tabs-item=group]');
	const end = await bottomOf(page, "[data-host-column-add]");
	await watched(page, "a group carried out of its chat to the end of Recents", () =>
		carried(page, [from, below(from, 6), below(end, -30)]),
	);
}

async function checksGroupIntoChat(page: AskedPage): Promise<void> {
	const from = await centreOf(page, '[data-tabs-box="group-12"] > [data-tabs-item=group]');
	const chat = await centreOf(page, rowOf("chat-translator"));
	await watched(page, "a group carried into a chat", () => carried(page, [from, below(from, 6), below(chat, 8)]));
	const isInChat = await page.ask(
		`document.querySelector('[data-tabs-list="chat-translator"] [data-tabs-box="group-12"]') !== null`,
	);
	check("a group dropped on a chat's lower half stands inside that chat", isInChat === true, isInChat);
}

async function splitOfThree(page: AskedPage): Promise<readonly string[]> {
	const [first, second, third] = [...new Set(await idsOf(page, PLAIN_ROWS))];
	await page.ask(`window.__SIDEBAR__.splitTabs("${second ?? ""}", "${first ?? ""}")`);
	await page.ask(`window.__SIDEBAR__.splitTabs("${third ?? ""}", "${second ?? ""}")`);
	await waited(SETTLED_MS);
	return idsOf(page, MEMBERS);
}

async function shownSplit(page: AskedPage): Promise<void> {
	if ((await page.ask(`document.querySelector("[data-tabs-split][data-open]") !== null`)) === true) {
		return;
	}

	await page.press(...(await centreOf(page, "[data-split-row]")));
	await waited(SETTLED_MS);
}

async function checksSplits(page: AskedPage): Promise<void> {
	const members = await splitOfThree(page);
	const last = `${MEMBERS}[data-tabs-id="${members.at(-1) ?? ""}"]`;
	const out = await centreOf(page, last);
	const splitTop = z
		.number()
		.parse(await page.ask(`document.querySelector("[data-tabs-split]").getBoundingClientRect().top`));
	await watched(page, "a member carried out of its split", () =>
		carried(page, [out, below(out, -6), [out[0], splitTop - 3]]),
	);
	await shownSplit(page);
	const inside = await idsOf(page, MEMBERS);
	const top = await centreOf(page, `${MEMBERS}[data-tabs-id="${inside[0] ?? ""}"]`);
	const lower = await centreOf(page, `${MEMBERS}[data-tabs-id="${inside.at(-1) ?? ""}"]`);
	await watched(page, "a member carried up inside its split", () =>
		carried(page, [lower, below(lower, -6), below(top, -10)]),
	);
	await shownSplit(page);
	const two = await idsOf(page, MEMBERS);
	const leaving = await centreOf(page, `${MEMBERS}[data-tabs-id="${two.at(-1) ?? ""}"]`);
	const end = await bottomOf(page, "[data-tabs-split]");
	await watched(page, "a member carried out of a split of two, which dissolves", () =>
		carried(page, [leaving, below(leaving, 6), below(end, 8)]),
	);
}

async function checksRefusedChat(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("chat-release"));
	const target = await centreOf(page, rowOf("chat-translator"));
	await watched(page, "a chat held over another chat", () => carried(page, [from, below(from, -6), below(target, 8)]));
}

async function checksAway(page: AskedPage): Promise<void> {
	const from = await centreOf(page, rowOf("tab-6"));
	const plate = await centreOf(page, "[data-exact-plate]");
	const back = await centreOf(page, rowOf("chat-translator"));
	await watched(page, "a tab carried off the sidebar and back", () =>
		carried(page, [from, below(from, 6), plate, below(back, -10)]),
	);
}
const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tabs-motion"));
mkdirSync(folder, { recursive: true });
const page = await openedPage(await sidebarPageFile(folder), [1440, 1000]);
await waitUntil(async () => (await idsOf(page, PLAIN_ROWS)).length >= 3, 15000, 100);
await checksWalkPastGroups(page);
await checksRecents(page);
await checksChildToRecents(page);
await checksIntoGroup(page);
await checksChatChild(page);
await checksPinned(page);
await checksTiles(page);
await checksIntoEssentials(page);
await checksOutOfEssentials(page);
await checksGroup(page);
await checksGroupIntoChat(page);
await checksRefusedChat(page);
await checksAway(page);
await checksSplits(page);
page.close();
process.exit(failures > 0 ? 1 : 0);
