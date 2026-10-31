import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { openedPage, sidebarPageFile } from "./tabs-sidebar-pages.ts";
import { bottomOf, centreOf } from "./tabs-sidebar-scenes.ts";

const OPEN_ROWS = '[data-tabs-list="workspace"] > [data-tabs-item=tab]';
const PLAIN_ROWS = "[data-tabs-sidebar] [data-tabs-item=tab]:not([data-tabs-chat])";
const MEMBERS =
	"[data-tabs-split] [data-tabs-item=tab]:is([data-split-members] > *, [data-split-members] > [data-tabs-card] > *)";
const SETTLED_MS = 700;
const ROW_SLACK_PX = 24;
const NO_TRANSFORM_LEFT = `[...document.querySelectorAll("[data-tabs-sidebar] [style*=transform]")].filter((one) => one.style.transform !== "").length === 0 && [...document.querySelectorAll("[data-tabs-sidebar] [style*=clip-path]")].filter((one) => one.style.clipPath !== "").length === 0 && [...document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item]")].every((one) => one.style.visibility === "")`;
const FRAMES_WATCHED = `((id) => { window.__frames = []; const tick = () => { const ghost = document.querySelector("[data-drag-ghost]"); const row = document.querySelector('[data-tabs-sidebar] [data-tabs-item][data-tabs-id="' + id + '"]'); const box = ghost?.getBoundingClientRect(); const rows = {}; for (const one of document.querySelectorAll("[data-tabs-sidebar] [data-tabs-item=tab][data-tabs-id]")) { if (one.dataset.tabsId !== id && getComputedStyle(one).visibility !== "hidden" && one.offsetHeight > 0) rows[one.dataset.tabsId] = Math.round(one.getBoundingClientRect().top); } const words = ghost?.querySelector("[data-ghost-part=words]")?.getBoundingClientRect(); window.__frames.push({ ghostTop: box ? Math.round(box.top) : null, ghostLeft: box ? Math.round(box.left) : null, ghostWidth: box ? Math.round(box.width) : null, ghostWordsLeft: words ? Math.round(words.left) : null, isRowShown: row !== null && row.isConnected && getComputedStyle(row).visibility !== "hidden", rows }); if (window.__frames.length < 90) requestAnimationFrame(() => setTimeout(tick, 0)); }; requestAnimationFrame(() => setTimeout(tick, 0)); return true; })`;
const MARKER = `(() => { const one = document.querySelector("[data-tabs-drop-marker]"); if (one === null) return null; const box = one.getBoundingClientRect(); return { opacity: Number(getComputedStyle(one).opacity), top: Math.round(box.top), left: Math.round(box.left), width: Math.round(box.width) }; })()`;
const RECT_OF = `((selector) => { const box = document.querySelector(selector)?.getBoundingClientRect(); return box ? { top: Math.round(box.top), left: Math.round(box.left), width: Math.round(box.width), bottom: Math.round(box.bottom) } : null; })`;
const JUMP_MOST_PX = 20;
const FrameSchema = z.object({
	ghostTop: z.number().nullable(),
	ghostLeft: z.number().nullable(),
	ghostWidth: z.number().nullable(),
	ghostWordsLeft: z.number().nullable(),
	isRowShown: z.boolean(),
	rows: z.record(z.string(), z.number()),
});
const BoxSchema = z.object({
	top: z.number(),
	left: z.number(),
	width: z.number(),
});
const MarkerSchema = BoxSchema.extend({ opacity: z.number() });
const SPLIT_TOPS = `((dragged) => [...document.querySelectorAll("[data-tabs-split] [data-tabs-id]")].filter((one) => one.dataset.tabsId !== dragged).map((one) => Math.round(one.getBoundingClientRect().top)).join(" "))`;
const SCROLLER = "[data-tabs-sidebar] [data-host-column-scroll]";

let failures = 0;

function check(name: string, isTrue: boolean, seen: unknown): void {
	if (!isTrue) {
		failures += 1;
	}

	console.log(`${isTrue ? "ok  " : "FAIL"} ${name}${isTrue ? "" : ` — saw ${JSON.stringify(seen)}`}`);
}

async function idsOf(page: AskedPage, selector: string): Promise<readonly string[]> {
	const ids = await page.ask(
		`[...document.querySelectorAll(${JSON.stringify(selector)})].map((one) => one.dataset.tabsId)`,
	);
	return Array.isArray(ids) ? ids.map(String) : [];
}

async function topOf(page: AskedPage, id: string): Promise<number> {
	return Number(
		await page.ask(
			`document.querySelector('[data-tabs-sidebar] [data-tabs-id="${id}"]')?.getBoundingClientRect().top ?? -1`,
		),
	);
}

async function splitOfThree(page: AskedPage): Promise<readonly string[]> {
	const plain = [...new Set(await idsOf(page, PLAIN_ROWS))];
	const [first, second, third] = plain;

	if (first === undefined || second === undefined || third === undefined) {
		throw new Error(`the sidebar holds too few tabs for a split of three: ${plain.join(", ")}`);
	}

	await page.ask(`window.__SIDEBAR__.splitTabs("${second}", "${first}")`);
	await page.ask(`window.__SIDEBAR__.splitTabs("${third}", "${second}")`);
	await waited(SETTLED_MS);
	return idsOf(page, MEMBERS);
}

async function checksDragOutOfSplit(page: AskedPage, folder: string): Promise<void> {
	const members = await splitOfThree(page);
	check("three tabs placed side by side stand as one split of three", members.length === 3, members);
	writeFileSync(path.join(folder, "split-before.png"), await page.shoot());
	const dragged = members.at(-1) ?? "";
	const from = await centreOf(page, `[data-tabs-id="${dragged}"]`);
	const [x, splitBottom] = await bottomOf(page, "[data-tabs-split]");
	const to: readonly [number, number] = [x, splitBottom + 8];
	const topsBefore = await page.ask(`${SPLIT_TOPS}("${dragged}")`);
	const drag = await page.lift({ from, to, steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	const topsDuring = await page.ask(`${SPLIT_TOPS}("${dragged}")`);
	check(
		"carrying the last member out moves nothing above it in the split, nested chat rows included",
		topsBefore === topsDuring,
		{ topsBefore, topsDuring },
	);
	const during = await idsOf(page, MEMBERS);
	check(
		"while a member is carried out, its split shows the others only",
		during.length === members.length - 1 && !during.includes(dragged),
		during,
	);
	writeFileSync(path.join(folder, "split-dragging.png"), await page.shoot());
	await page.ask(`${FRAMES_WATCHED}("${dragged}")`);
	await drag.drop(to);
	await waited(SETTLED_MS * 2);
	await checksLanding(page, dragged);
	const left = await idsOf(page, MEMBERS);
	check(
		"the member dropped below leaves the split, which keeps the other two",
		left.length === 2 && !left.includes(dragged),
		left,
	);
	check(
		"the dropped member stands in Open right under the split",
		(await idsOf(page, OPEN_ROWS)).includes(dragged) &&
			Math.abs((await topOf(page, dragged)) - (await bottomOf(page, "[data-tabs-split]"))[1]) <= 8,
		await idsOf(page, OPEN_ROWS),
	);
	check("the drop leaves no shift, clip or hidden row", (await page.ask(NO_TRANSFORM_LEFT)) === true, null);
	writeFileSync(path.join(folder, "split-after.png"), await page.shoot());
}

async function boxOf(page: AskedPage, selector: string): Promise<z.infer<typeof BoxSchema>> {
	return BoxSchema.parse(await page.ask(`${RECT_OF}(${JSON.stringify(selector)})`));
}

async function markerOf(page: AskedPage): Promise<z.infer<typeof MarkerSchema>> {
	return MarkerSchema.parse(await page.ask(MARKER));
}

function biggestJumpOf(frames: readonly z.infer<typeof FrameSchema>[]): number {
	return frames.slice(1).reduce((most, frame, at) => {
		const before = frames[at]?.rows ?? {};
		const jumps = Object.entries(frame.rows).map(([id, top]) => Math.abs(top - (before[id] ?? top)));
		return Math.max(most, ...jumps);
	}, 0);
}

async function checksLanding(page: AskedPage, dragged: string): Promise<void> {
	const seen = z.array(FrameSchema).parse(await page.ask("window.__frames"));
	const jump = biggestJumpOf(seen);
	check(`no row jumps more than ${JUMP_MOST_PX}px in one frame while the drop settles`, jump <= JUMP_MOST_PX, {
		jump,
		at: seen.flatMap((frame, index) =>
			Object.entries(frame.rows).flatMap(([id, top]) => {
				const was = seen[index - 1]?.rows[id];
				return was !== undefined && Math.abs(top - was) > JUMP_MOST_PX ? [`${index}:${id}:${was}→${top}`] : [];
			}),
		),
	});
	const blank = seen.filter((frame) => frame.ghostTop === null && frame.isRowShown === false);
	check("from the release on, every frame shows the ghost or the row, never neither", blank.length === 0, blank.length);
	const ghostTops = seen.flatMap((frame) => (frame.ghostTop === null ? [] : [frame.ghostTop]));
	const landedTop = await topOf(page, dragged);
	const landed = await boxOf(page, `[data-tabs-sidebar] [data-tabs-item][data-tabs-id="${dragged}"]`);
	const landedWords = await boxOf(
		page,
		`[data-tabs-sidebar] [data-tabs-item][data-tabs-id="${dragged}"] [data-tabs-words]`,
	);
	const lastGhost = seen.filter((frame) => frame.ghostLeft !== null).at(-1);
	check(
		"the ghost lands on the real row's box, its left edge and width",
		lastGhost !== undefined &&
			Math.abs((lastGhost.ghostLeft ?? 0) - landed.left) <= 3 &&
			Math.abs((lastGhost.ghostWidth ?? 0) - landed.width) <= 3,
		{ lastGhost, landed },
	);
	check(
		"the ghost's title stands where the row's title stands",
		lastGhost !== undefined && Math.abs((lastGhost.ghostWordsLeft ?? 0) - landedWords.left) <= 3,
		{ lastGhost, landedWords },
	);
	check(
		"the ghost glides across several frames and ends on the row's place",
		new Set(ghostTops).size > 2 && Math.abs((ghostTops.at(-1) ?? 0) - landedTop) <= 3,
		{ ghostTops, landedTop },
	);
}

async function checksScrolledDrop(page: AskedPage, folder: string): Promise<void> {
	await page.ask(
		`(() => { const left = document.querySelector("[data-test-left]"); left.style.height = "420px"; left.style.alignSelf = "flex-start"; return true; })()`,
	);
	await waited(SETTLED_MS);
	const scroll = await page.ask(
		`(() => { const box = document.querySelector(${JSON.stringify(SCROLLER)}); box.scrollTop = box.scrollHeight; const rect = box.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, scrolled: box.scrollTop, overflow: box.scrollHeight - box.clientHeight }; })()`,
	);
	const box = typeof scroll === "object" && scroll !== null ? scroll : {};
	const scrollerTop = Number(Reflect.get(box, "top"));
	const scrollerBottom = Number(Reflect.get(box, "bottom"));
	check("the shortened sidebar list scrolls", Number(Reflect.get(box, "overflow")) > 80, box);
	await waited(SETTLED_MS);
	const lowest = String(
		await page.ask(
			`(() => { const box = document.querySelector(${JSON.stringify(SCROLLER)}).getBoundingClientRect(); const rows = [...document.querySelectorAll(${JSON.stringify(PLAIN_ROWS)})].filter((one) => { const at = one.getBoundingClientRect(); return at.height > 0 && at.top >= box.top && at.bottom <= box.bottom; }); return rows.at(-1)?.dataset.tabsId ?? ""; })()`,
		),
	);
	const from = await centreOf(page, `[data-tabs-sidebar] [data-tabs-item=tab][data-tabs-id="${lowest}"]`);
	check("the dragged row starts near the bottom of the list", from[1] > scrollerBottom - 120, { from, scrollerBottom });
	const drag = await page.lift({ from, to: [from[0], scrollerTop + 6], steps: 14, stepMs: 16 });
	await waited(900);
	const scrolledUp = Number(await page.ask(`document.querySelector(${JSON.stringify(SCROLLER)}).scrollTop`));
	check(
		"held at the top edge, the list scrolls up under the carried row",
		scrolledUp < Number(Reflect.get(box, "scrolled")),
		{ scrolledUp, was: Reflect.get(box, "scrolled") },
	);
	const aim: readonly [number, number] = [from[0], scrollerTop + 90];
	await drag.over(aim);
	await waited(SETTLED_MS);
	writeFileSync(path.join(folder, "scrolled-dragging.png"), await page.shoot());
	await drag.drop(aim);
	await waited(SETTLED_MS * 2);
	const landedTop = await topOf(page, lowest);
	check(
		"after the list scrolled, the row lands where the pointer let go, not where the rows stood before",
		Math.abs(landedTop - aim[1]) <= ROW_SLACK_PX,
		{ landedTop, pointer: aim[1] },
	);
	writeFileSync(path.join(folder, "scrolled-after.png"), await page.shoot());
}

async function checksOwnSpot(page: AskedPage): Promise<void> {
	const id = (await idsOf(page, PLAIN_ROWS))[0] ?? "";
	const row = `[data-tabs-sidebar] [data-tabs-item=tab][data-tabs-id="${id}"]`;
	const home = await boxOf(page, row);
	const from = await centreOf(page, row);
	const drag = await page.lift({ from, to: [from[0] + 40, from[1] + 10], steps: 8, stepMs: 16 });
	await drag.over([from[0], from[1] + 3]);
	await waited(SETTLED_MS);
	const marker = await markerOf(page);
	check(
		"a row held over its own place shows the marker exactly there",
		marker.opacity === 1 && Math.abs(marker.top - home.top) <= 3 && Math.abs(marker.left - home.left) <= 3,
		{ marker, home },
	);
	await drag.drop([from[0], from[1] + 3]);
	await waited(SETTLED_MS);
}

async function shownSplit(page: AskedPage): Promise<void> {
	if ((await page.ask(`document.querySelector("[data-tabs-split][data-open]") !== null`)) === true) {
		return;
	}

	await page.press(...(await centreOf(page, "[data-split-row]")));
	await waited(SETTLED_MS);
}

async function checksReorderInSplit(page: AskedPage, folder: string): Promise<void> {
	await shownSplit(page);
	const members = await idsOf(page, MEMBERS);
	const [first] = members;
	const last = members.at(-1) ?? "";
	const target = await boxOf(page, `${MEMBERS}[data-tabs-id="${first ?? ""}"]`);
	const from = await centreOf(page, `${MEMBERS}[data-tabs-id="${last}"]`);
	const to: readonly [number, number] = [from[0], target.top + 4];
	const drag = await page.lift({ from, to, steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	const marker = await markerOf(page);
	const split = await boxOf(page, "[data-tabs-split]");
	check(
		"held above the first member inside its own split, the marker stands inside the split",
		marker.opacity === 1 && marker.top >= split.top && Math.abs(marker.top - target.top) <= 4,
		{ marker, split, target },
	);
	writeFileSync(path.join(folder, "split-reorder.png"), await page.shoot());
	await page.ask(`${FRAMES_WATCHED}("${last}")`);
	await drag.drop(to);
	await waited(SETTLED_MS * 2);
	const after = await idsOf(page, MEMBERS);
	check(
		"the member dropped above the first one moves to the top of its split, which keeps every member",
		after.length === members.length && after[0] === last,
		after,
	);
	await checksLanding(page, last);
}

async function checksDissolve(page: AskedPage, folder: string): Promise<void> {
	await shownSplit(page);
	const members = await idsOf(page, MEMBERS);
	const dragged = members.at(-1) ?? "";
	const from = await centreOf(page, `${MEMBERS}[data-tabs-id="${dragged}"]`);
	const [x, splitBottom] = await bottomOf(page, "[data-tabs-split]");
	const drag = await page.lift({ from, to: [x, splitBottom + 8], steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	writeFileSync(path.join(folder, "split-dissolving.png"), await page.shoot());
	await page.ask(`${FRAMES_WATCHED}("${dragged}")`);
	await drag.drop([x, splitBottom + 8]);
	await waited(SETTLED_MS * 2);
	check(
		"a member carried out of a split of two dissolves it",
		(await page.ask(`document.querySelector("[data-tabs-split]") === null`)) === true,
		await idsOf(page, MEMBERS),
	);
	await checksLanding(page, dragged);
	writeFileSync(path.join(folder, "split-dissolved.png"), await page.shoot());
}

async function checksRefusedChat(page: AskedPage, folder: string): Promise<void> {
	const chats = await idsOf(page, "[data-tabs-sidebar] [data-tabs-item=tab][data-tabs-chat]");
	const [held, target] = [chats.at(-1) ?? "", chats[0] ?? ""];
	const targetBox = await boxOf(page, `[data-tabs-item=tab][data-tabs-id="${target}"]`);
	const from = await centreOf(page, `[data-tabs-item=tab][data-tabs-id="${held}"]`);
	const to: readonly [number, number] = [from[0], targetBox.top + 26];
	const drag = await page.lift({ from, to, steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	const hint = await page.ask(`Number(getComputedStyle(document.querySelector("[data-tabs-refusal-hint]")).opacity)`);
	const marker = await markerOf(page);
	const targetNow = await boxOf(page, `[data-tabs-item=tab][data-tabs-id="${target}"]`);
	check(
		"a chat held over another chat says it cannot go there and opens a place just above it",
		hint === 1 && marker.opacity === 1 && marker.top < targetNow.top,
		{ hint, marker, targetNow },
	);
	writeFileSync(path.join(folder, "chat-refused.png"), await page.shoot());
	await drag.drop(to);
	await waited(SETTLED_MS * 2);
	const landed = await idsOf(page, "[data-tabs-sidebar] [data-tabs-item=tab][data-tabs-chat]");
	check(
		"released there, the chat lands just above the chat it was refused by",
		landed.indexOf(held) === landed.indexOf(target) - 1,
		landed,
	);
}

async function checksChildWidth(page: AskedPage, folder: string): Promise<void> {
	const child = "[data-tabs-nested] > [data-tabs-item=tab]";
	const childBox = await boxOf(page, `${child} [data-tabs-words]`);
	const id = (await idsOf(page, OPEN_ROWS))[0] ?? "";
	const from = await centreOf(page, `${OPEN_ROWS}[data-tabs-id="${id}"]`);
	const to: readonly [number, number] = [from[0], childBox.top + 4];
	const drag = await page.lift({ from, to, steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	const marker = await markerOf(page);
	check(
		"held among a chat's tabs, the marker starts at a child row's indent, not at the list's edge",
		marker.opacity === 1 && childBox.left - marker.left >= 20 && childBox.left - marker.left <= 40,
		{ marker, childBox },
	);
	writeFileSync(path.join(folder, "child-marker.png"), await page.shoot());
	await page.ask(`${FRAMES_WATCHED}("${id}")`);
	await drag.drop(to);
	await waited(SETTLED_MS * 2);
	await checksLanding(page, id);
}

async function checksEssentialsRow(page: AskedPage, folder: string): Promise<void> {
	const grid = await boxOf(page, "[data-tabs-essentials]");
	const gridBottom = Number(
		await page.ask(`document.querySelector("[data-tabs-essentials]").getBoundingClientRect().bottom`),
	);
	const id = (await idsOf(page, OPEN_ROWS))[0] ?? (await idsOf(page, PLAIN_ROWS))[0] ?? "";
	const from = await centreOf(page, `[data-tabs-sidebar] [data-tabs-item=tab][data-tabs-id="${id}"]`);
	const drag = await page.lift({ from, to: [grid.left + 20, gridBottom - 10], steps: 14, stepMs: 16 });
	await waited(SETTLED_MS);
	await drag.over([grid.left + 20, gridBottom + 24]);
	await waited(SETTLED_MS);
	const marker = await markerOf(page);
	writeFileSync(path.join(folder, "essentials-new-row.png"), await page.shoot());
	check(
		"a tab carried into Essentials and down into the row it opens stays an Essentials drop",
		marker.opacity === 1 && marker.top >= gridBottom - 2 && marker.width < 120,
		{ marker, gridBottom },
	);
	await drag.over(from);
	await waited(SETTLED_MS);
	await drag.drop(from);
	await waited(SETTLED_MS);
}

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tabs-split-drag"));
mkdirSync(folder, { recursive: true });
const page = await openedPage(await sidebarPageFile(folder), [1440, 1000]);
await waitUntil(async () => (await idsOf(page, PLAIN_ROWS)).length >= 3, 15000, 100);
await checksOwnSpot(page);
await checksDragOutOfSplit(page, folder);
await checksReorderInSplit(page, folder);
await checksDissolve(page, folder);
await checksRefusedChat(page, folder);
await checksChildWidth(page, folder);
await checksEssentialsRow(page, folder);
await checksScrolledDrop(page, folder);
console.log(`shots in ${folder}`);
page.close();
process.exit(failures > 0 ? 1 : 0);
