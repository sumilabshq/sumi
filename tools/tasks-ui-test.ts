import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage, PageSize } from "./chrome-ask.ts";
import { canvasSheet } from "./canvas-sheet.mts";
import { bundleOf } from "./harness.ts";

const GATE = "test:tasks-ui";
const WIDE: PageSize = [1440, 900];
const TALL: PageSize = [1440, 1700];
const NARROW: PageSize = [400, 900];
const SETTLE_MS = 400;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tasks-ui"));
mkdirSync(shotsAt, { recursive: true });

const [bundle, sheet] = await Promise.all([bundleOf("tools/tasks-page.tsx"), canvasSheet(process.cwd())]);
const kit = readFileSync("apps/host-obsidian/styles.css", "utf8");
const sumi = readFileSync("design-systems/sumi/sumi.css", "utf8");
const DEMO = `html, body, #root { height: 100%; margin: 0; }
body { background: var(--sumi-frame); font-family: var(--sumi-font-ui); padding: 8px; box-sizing: border-box; }
.wg-shell-plate { height: 100%; display: flex; flex-direction: column; border-radius: 14px; background: var(--sumi-plate); box-shadow: var(--sumi-shadow-plate); overflow: hidden; }
.wg-shell-plate-body { flex: 1; min-height: 0; }
.tasks-demo-crumb { color: var(--sumi-text-2); padding: 0 8px; white-space: nowrap; }
.tasks-demo-chat { display: flex; flex-direction: column; justify-content: flex-end; height: 100%; padding: 16px; border-radius: 14px; background: var(--sumi-plate); box-sizing: border-box; }
.tasks-demo-composer { height: 88px; border-radius: 16px; background: var(--sumi-soft); padding: 12px 14px; color: var(--sumi-text-3); }`;
const file = path.join(shotsAt, "tasks.html");
writeFileSync(
	file,
	`<!doctype html><html><head><meta charset="utf-8"><style>${kit}\n${sumi}\n${sheet}\n${DEMO}</style></head>
<body class="theme-light"><div id="root"></div><pre id="boom"></pre>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`,
);

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

async function settled(page: AskedPage, expression: string): Promise<unknown> {
	await waited(SETTLE_MS);
	return page.ask(expression);
}

async function boardDrawn(page: AskedPage): Promise<void> {
	await waitUntil(
		async () => (await page.ask(`document.querySelector("[data-tasks-column]") !== null`)) === true,
		10_000,
		100,
	);
}

async function shot(page: AskedPage, name: string): Promise<void> {
	const at = path.join(shotsAt, `${name}.png`);
	writeFileSync(at, await page.shoot());
	console.log(`shot ${at}`);
}

const BOARD = `(() => {
	const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;
	const columns = [...document.querySelectorAll(".wg-tasks-columns > *")].map((node) => node.dataset.tasksStrip ? "strip:" + node.dataset.tasksStrip : "col:" + node.querySelector("[data-tasks-column]")?.dataset.tasksColumn);
	const counts = Object.fromEntries([...document.querySelectorAll("[data-tasks-column]")].map((column) => [column.dataset.tasksColumn, column.querySelector("[data-tasks-count]")?.textContent]));
	const blocked = document.querySelector('[data-tasks-card="T-152"] .wg-tasks-note');
	const ready = document.querySelector('[data-tasks-column="ready_to_test"]');
	return {
		columns,
		counts,
		boom: text("#boom"),
		blockedTone: blocked?.dataset.tone ?? null,
		blockedFill: blocked === null ? null : getComputedStyle(blocked).backgroundColor,
		continueSaid: text('[data-tasks-card="T-152"] [data-tasks-continue]'),
		continueLater: text('[data-tasks-card="T-153"] [data-tasks-continue="later"]'),
		isLaterDisabled: document.querySelector('[data-tasks-card="T-153"] [data-tasks-continue="later"]')?.disabled ?? null,
		readyFill: ready === null ? null : getComputedStyle(ready).backgroundColor,
		waiting: text("[data-tasks-waiting-count]"),
		older: text("[data-tasks-older]"),
		cancelled: text('[data-tasks-strip="cancelled"]'),
	};
})()`;
const FOLD_OF_152 = `(() => {
	const fold = document.querySelector('[data-tasks-card="T-152"] [data-tasks-fold]');
	const panel = fold?.querySelector(".wg-kit-collapse");
	return fold === null || panel === null ? null : { state: fold.dataset.state, duration: getComputedStyle(panel).transitionDuration };
})()`;

const MENU_JUMP_MS = 300;
const MENU_SPRING_OVERSHOOT_PX = 4;
const MENU_EDGES = `(async () => {
	document.querySelector('[data-tasks-menu="Agents"]').click();
	const edges = [];
	const start = performance.now();
	while (performance.now() - start < ${MENU_JUMP_MS}) {
		await new Promise((frame) => requestAnimationFrame(frame));
		const menu = document.querySelector('[role="menu"]');
		const box = menu?.getBoundingClientRect();
		if (menu && box.width > 0 && Number(getComputedStyle(menu).opacity) > 0) {
			edges.push({ left: box.left, right: box.right, spot: menu.style.left });
		}
	}
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	return edges;
})()`;

interface MenuEdge {
	readonly left: number;
	readonly right: number;
	readonly spot: string;
}

function outsideLandingOf(edges: readonly MenuEdge[]): number {
	const landed = edges.at(-1);

	if (landed === undefined) {
		return Number.POSITIVE_INFINITY;
	}

	return Math.max(...edges.map((edge) => Math.max(landed.left - edge.left, edge.right - landed.right)));
}

const SIDE_CHATS = `(() => {
	const side = document.querySelector("[data-tasks-side]");
	const links = [...side.querySelectorAll("[data-tasks-chat-link]")];
	const activity = document.querySelector('[data-tasks-section="activity"]')?.textContent ?? "";
	const labels = [...side.querySelectorAll(".wg-tasks-prop > span:first-child")].map((label) => label.textContent);
	return { links: links.map((link) => link.textContent), tips: links.map((link) => link.dataset.tipSaid), showsIds: /chat-(panes|tasks-design)/.test(side.textContent), activityIds: /chat-[a-z-]+/.test(activity), touchedBy: labels.includes("Touched by"), workingChat: labels.includes("Working chat") };
})()`;
const NARROW_TASK = `(() => {
	const visible = (node) => node !== null && node.getClientRects().length > 0;
	const page = document.querySelector("[data-tasks-task]").getBoundingClientRect();
	const bar = document.querySelector("[data-tasks-action-bar]");
	const sections = [...document.querySelectorAll("[data-tasks-folds] [data-tasks-section]")];
	return {
		side: visible(document.querySelector("[data-tasks-side]")),
		chips: [...document.querySelectorAll("[data-tasks-chips] > *")].map((chip) => chip.textContent.trim()),
		folds: sections.map((section) => [section.dataset.tasksSection, section.dataset.state, section.querySelector("[data-tasks-fold-said]")?.textContent ?? null]),
		passedInk: getComputedStyle(document.querySelector('[data-tasks-section="tests"] [data-tasks-fold-said]')).color,
		bar: bar === null ? null : { buttons: [...bar.querySelectorAll("button")].map((button) => Math.round(button.getBoundingClientRect().width)), atBottom: Math.round(document.querySelector(".wg-tasks").getBoundingClientRect().bottom - bar.getBoundingClientRect().bottom) },
		crumb: document.querySelector("[data-tasks-crumb-id]")?.textContent ?? null,
		more: document.querySelector("[data-tasks-more]") !== null,
		pageWidth: Math.round(page.width),
	};
})()`;

const wide = await paged(file, GATE, { size: WIDE });

try {
	await boardDrawn(wide);
	const board = (await settled(wide, BOARD)) as Record<string, unknown>;
	check("the page draws without failures", board["boom"] === "" || board["boom"] === null, board["boom"]);
	check(
		"columns stand in the board's order, Backlog, Paused and Cancelled folded",
		JSON.stringify(board["columns"]) ===
			JSON.stringify([
				"strip:backlog",
				"col:todo",
				"col:in_progress",
				"strip:paused",
				"col:ready_to_test",
				"col:done",
				"strip:cancelled",
			]),
		board["columns"],
	);
	check(
		"column counts: 3 to do, 5 in progress with the blocked, 1 to test, 2 done today",
		JSON.stringify(board["counts"]) === JSON.stringify({ todo: "3", in_progress: "5", ready_to_test: "1", done: "2" }),
		board["counts"],
	);
	check(
		"a blocked card wears the red note plate",
		board["blockedTone"] === "blocked" && String(board["blockedFill"]).includes("0.85098 0.247059 0.180392 / 0.08"),
		[board["blockedTone"], board["blockedFill"]],
	);
	check("a host-blocked card ends in Continue →", board["continueSaid"] === "Continue →", board["continueSaid"]);
	check(
		"a usage limit says when it can continue, and cannot be pressed before",
		/^Continue at \d\d:\d\d$/.test(String(board["continueLater"])) && board["isLaterDisabled"] === true,
		[board["continueLater"], board["isLaterDisabled"]],
	);
	check(
		"Ready to test stands on a blue wash",
		String(board["readyFill"]).includes("0.231373 0.356863 0.992157 / 0.06"),
		board["readyFill"],
	);
	check("Waiting for you counts the person's turns", board["waiting"] === "4", board["waiting"]);
	check("older finished tasks point to the list", board["older"] === "3 older · in the list", board["older"]);
	check("Cancelled is a strip with its filter", board["cancelled"] === "Cancelled 1 · last day", board["cancelled"]);
	const fold = (await wide.ask(FOLD_OF_152)) as { state: string; duration: string } | null;
	check(
		"the blocker plate declares a transition",
		fold !== null && fold.duration.split(",").some((one) => parseFloat(one) > 0),
		fold,
	);
	await shot(wide, "tasks-board");
	const edges = (await wide.ask(MENU_EDGES)) as MenuEdge[];
	const drift = {
		frames: edges.length,
		outside: outsideLandingOf(edges),
		first: edges[0],
		landed: edges.at(-1),
		spots: [...new Set(edges.map((edge) => edge.spot))],
	};
	check(
		`the agents menu is placed once and never stands more than ${MENU_SPRING_OVERSHOOT_PX}px outside where it lands`,
		drift.frames > 0 && drift.outside <= MENU_SPRING_OVERSHOOT_PX && drift.spots.length === 1,
		drift,
	);
	await settled(wide, "null");
	const doneIds = `[...document.querySelectorAll('[data-tasks-column="done"] [data-tasks-card]')].map((card) => card.dataset.tasksCard)`;
	const pickInDoneMenu = (said: string): string =>
		`(() => { document.querySelector('[data-tasks-menu="Done column"]').click(); return new Promise((done) => setTimeout(() => { [...document.querySelectorAll('[role="menuitemradio"]')].find((row) => row.textContent.trim() === "${said}")?.click(); done(null); }, 100)); })()`;
	await wide.ask(pickInDoneMenu("Oldest first"));
	const oldest = (await settled(wide, doneIds)) as string[];
	await wide.ask(pickInDoneMenu("Newest first"));
	const newest = (await settled(wide, doneIds)) as string[];
	check(
		"Oldest first asks the board for the oldest finished tasks",
		JSON.stringify([oldest, newest]) ===
			JSON.stringify([
				["T-144", "T-145"],
				["T-145", "T-144"],
			]),
		[oldest, newest],
	);
	await wide.ask(`document.querySelector('[data-tasks-card="T-152"] [data-tasks-continue]').click()`);
	const continued = (await settled(
		wide,
		`({ fold: ${FOLD_OF_152}, delivered: window.__DELIVERED__, toast: document.querySelector("[data-sonner-toast]")?.textContent ?? null })`,
	)) as { fold: { state: string } | null; delivered: unknown[] };
	check("Continue folds the blocker plate away", continued.fold?.state === "closed", continued.fold);
	check("Continue hands its message to the task's chat", continued.delivered.length === 1, continued);
	await wide.ask(`location.hash = "T-147"`);
	const task = (await settled(
		wide,
		`({ banner: document.querySelector("[data-tasks-banner]")?.dataset.tasksBanner, turn: document.querySelector("[data-tasks-banner]")?.hasAttribute("data-your-turn"), accept: document.querySelector("[data-tasks-accept]") !== null, cases: document.querySelectorAll("[data-tasks-case]").length, tests: document.querySelector("[data-tasks-tests-said]")?.textContent, crumb: document.querySelector(".wg-plate-head")?.textContent })`,
	)) as Record<string, unknown>;
	check(
		"the task page washes the person's turn and offers Accept",
		task["banner"] === "ready_to_test" && task["turn"] === true && task["accept"] === true,
		task,
	);
	check("the test plan lists every case and the last run", task["cases"] === 4 && task["tests"] === "4 of 4 passed", [
		task["cases"],
		task["tests"],
	]);
	const side = (await wide.ask(SIDE_CHATS)) as Record<string, unknown>;
	check(
		"the side panel names chats Touched by with their titles and links, the id as the tooltip, and no Working chat once handed in",
		JSON.stringify(side) ===
			JSON.stringify({
				links: ["Panes and windows"],
				tips: ["chat-panes"],
				showsIds: false,
				activityIds: false,
				touchedBy: true,
				workingChat: false,
			}),
		side,
	);
	const chatLink = (await wide.ask(
		`(() => { const link = document.querySelector("[data-tasks-side] [data-tasks-chat-link]"); const box = link.getBoundingClientRect(); return { tag: link.tagName, href: link.getAttribute("href"), x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
	)) as { tag: string; href: string; x: number; y: number };
	check(
		"a chat link is an ordinary link carrying the chat's sumi address",
		chatLink.tag === "A" && chatLink.href === "sumi://chat/chat-panes",
		chatLink,
	);
	await wide.press(chatLink.x, chatLink.y);
	const pressed = (await settled(wide, `({ links: window.__LINKS__, at: location.href.endsWith("#T-147") })`)) as {
		links: string[];
		at: boolean;
	};
	check(
		"pressing a chat link opens the chat in place and leaves the page where it was",
		JSON.stringify(pressed) === JSON.stringify({ links: ['"sumi://chat/chat-panes" opened'], at: true }),
		pressed,
	);
	const SIDE_LINK = `document.querySelector("[data-tasks-side] [data-tasks-chat-link]")`;
	await wide.ask(
		`${SIDE_LINK}.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true }))`,
	);
	await waited(SETTLE_MS);
	await wide.ask(
		`${SIDE_LINK}.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }))`,
	);
	const newTabs = (await settled(wide, "window.__LINKS__")) as string[];
	check(
		"a ⌘-press and a middle press open the chat as a new tab",
		JSON.stringify(newTabs.slice(1)) ===
			JSON.stringify(['"sumi://chat/chat-panes" opened in a new tab', '"sumi://chat/chat-panes" opened in a new tab']),
		newTabs,
	);
	await wide.ask(`document.querySelector("[data-tasks-send-back-open]").click()`);
	check(
		"Send back asks for a note",
		(await settled(wide, `document.querySelector("[data-tasks-send-back] textarea") !== null`)) === true,
		null,
	);
	await wide.ask(`document.querySelector("[data-tasks-send-back-cancel]").click()`);
	await shot(wide, "tasks-page-top");
	await wide.ask(`document.querySelector("[data-tasks-accept]").click()`);
	check(
		"Accept moves the task to Done",
		String(await settled(wide, `document.querySelector("[data-tasks-side]")?.textContent ?? ""`)).includes("Done"),
		null,
	);
	await wide.ask(`location.hash = "T-999"`);
	const gone = (await settled(
		wide,
		`({ gone: document.querySelector("[data-tasks-gone]")?.textContent ?? null, back: document.querySelector("[data-tasks-gone-back]")?.textContent ?? null })`,
	)) as Record<string, unknown>;
	check(
		"a task that is gone says so and offers the way back",
		String(gone["gone"]).includes("This task is gone") && gone["back"] === "Back to the board",
		gone,
	);
	await wide.ask(`location.hash = "T-148"`);
	const working = (await settled(
		wide,
		`[...document.querySelectorAll("[data-tasks-side] .wg-tasks-prop > span:first-child")].map((label) => label.textContent)`,
	)) as string[];
	check(
		"a task in progress names its Working chat",
		working.includes("Working chat") && working.includes("Touched by"),
		working,
	);
	await wide.ask(`location.hash = ""`);
	const done = (await settled(
		wide,
		`[...document.querySelectorAll('[data-tasks-column="done"] [data-tasks-card]')].map((card) => card.dataset.tasksCard)`,
	)) as string[];
	check("the accepted task stands in Done on the board", done.includes("T-147"), done);
	await wide.reduceMotion();
	const reduced = (await settled(wide, FOLD_OF_152)) as { duration: string } | null;
	check(
		"reduced motion turns the transition off",
		reduced !== null && reduced.duration.split(",").every((one) => parseFloat(one) === 0),
		reduced,
	);
	await wide.ask(`location.replace(location.pathname + "?empty")`);
	await boardDrawn(wide);
	const empty = (await settled(
		wide,
		`(() => { const columns = document.querySelectorAll("[data-tasks-column]").length; const first = document.querySelector("[data-tasks-col-empty]"); return columns === 0 || first === null ? null : { columns, empties: document.querySelectorAll("[data-tasks-column] [data-tasks-col-empty]").length, said: first.textContent, style: getComputedStyle(first).borderTopStyle, waiting: document.querySelector("[data-tasks-waiting-toggle]") !== null }; })()`,
	)) as Record<string, unknown> | null;
	check(
		"every empty column shows a dashed Empty column card, and Waiting for you hides at 0",
		empty !== null &&
			empty["empties"] === empty["columns"] &&
			Number(empty["columns"]) > 0 &&
			empty["said"] === "Empty column" &&
			empty["style"] === "dashed" &&
			empty["waiting"] === false,
		empty,
	);
	await shot(wide, "tasks-empty");
} finally {
	wide.close();
}

const tall = await paged(file, GATE, { size: TALL });

try {
	await tall.ask(`location.hash = "T-147"`);
	await waited(SETTLE_MS * 2);
	await shot(tall, "tasks-page");
} finally {
	tall.close();
}

const HEAD = `(() => {
	const shown = [...document.querySelectorAll(".wg-tasks-mode, [data-tasks-waiting-toggle], .wg-tasks-head [data-tasks-menu], .wg-tasks-search")].filter((node) => node.getClientRects().length > 0);
	const boxes = shown.map((node) => node.getBoundingClientRect()).sort((a, b) => a.left - b.left);
	const head = document.querySelector(".wg-tasks-head").getBoundingClientRect();
	return { overlaps: boxes.slice(1).filter((box, at) => box.left < boxes[at].right - 0.5).length, spills: Math.round(Math.max(...boxes.map((box) => box.right)) - head.right), shown: shown.length };
})()`;

for (const width of [900, 720]) {
	const page = await paged(file, GATE, { size: [width, 900] });

	try {
		await boardDrawn(page);
		const head = (await settled(page, HEAD)) as { overlaps: number; spills: number; shown: number };
		check(`the header at ${width} lays its controls without overlap`, head.overlaps === 0 && head.spills <= 0, head);
	} finally {
		page.close();
	}
}

const TASK_AT_WIDTH = `(() => {
	const page = document.querySelector("[data-tasks-task]");
	const side = document.querySelector("[data-tasks-side]");
	const chips = [...document.querySelectorAll("[data-tasks-chips] > *")].map((chip) => Math.round(chip.getBoundingClientRect().height));
	const main = document.querySelector(".wg-tasks-main")?.getBoundingClientRect();
	return {
		layout: page?.dataset.tasksLayout ?? null,
		hasSide: side !== null,
		sideBeside: side === null || main === undefined ? null : side.getBoundingClientRect().top < main.bottom && side.getBoundingClientRect().left >= main.right,
		chipHeights: [...new Set(chips)],
		bannerStatus: document.querySelector("[data-tasks-banner] .wg-tasks-banner-status") !== null,
	};
})()`;

const PROP_ROWS = `(() => [...document.querySelectorAll("[data-tasks-side] .wg-tasks-prop")].slice(0, 3).map((row) => {
	const [label, value] = [...row.children].map((part) => part.getBoundingClientRect());
	return { rowHeight: Math.round(row.getBoundingClientRect().height), labelBottom: Math.round(label.bottom), valueBottom: Math.round(value.bottom) };
}))()`;

for (const [width, layout] of [
	[1000, "wide"],
	[840, "chips"],
] as const) {
	const page = await paged(file, GATE, { size: [width, 900] });

	try {
		await boardDrawn(page);
		await page.ask(`location.hash = "T-147"`);
		await waitUntil(
			async () => (await page.ask(`document.querySelector("[data-tasks-task]") !== null`)) === true,
			10_000,
			100,
		);
		const task = (await settled(page, TASK_AT_WIDTH)) as {
			layout: string;
			hasSide: boolean;
			sideBeside: boolean | null;
			chipHeights: number[];
			bannerStatus: boolean;
		};
		check(
			`the banner at ${width}px names the status only when no chip does`,
			task.bannerStatus === (layout === "wide"),
			task.bannerStatus,
		);
		const isRight =
			layout === "wide" ? task.hasSide && task.sideBeside === true : !task.hasSide && task.chipHeights.length === 1;
		check(
			`the task page at ${width}px is ${layout}: the side panel beside the text, or one row of equal chips`,
			task.layout === layout && isRight,
			task,
		);
		if (layout === "wide") {
			const rows = (await page.ask(PROP_ROWS)) as { rowHeight: number; labelBottom: number; valueBottom: number }[];
			check(
				"the Id, Status and Kind rows stand equally tall, the copy button adding no height",
				rows.length === 3 && new Set(rows.map((row) => row.rowHeight)).size === 1,
				rows,
			);
		}

		await shot(page, `tasks-page-${width}`);
		await page.ask(`location.hash = "T-149"`);
		const todoBanner = await settled(
			page,
			`document.querySelector("[data-tasks-task='T-149'] [data-tasks-banner]") === null && document.querySelector("[data-tasks-task='T-149']") !== null`,
		);
		check(`a To do task with nothing to press or say draws no banner at ${width}px`, todoBanner === true, todoBanner);
	} finally {
		page.close();
	}
}

const narrow = await paged(file, GATE, { size: NARROW });

try {
	await boardDrawn(narrow);
	const shown = (await settled(
		narrow,
		`({ waiting: document.querySelectorAll("[data-tasks-waiting] [data-tasks-card]").length, pills: getComputedStyle(document.querySelector(".wg-tasks-pills")).display, columns: [...document.querySelectorAll(".wg-tasks-col-place")].filter((place) => getComputedStyle(place).display !== "none").length })`,
	)) as Record<string, unknown>;
	check(
		"a narrow board puts your turn first and shows one status",
		(shown["waiting"] as number) > 0 && shown["pills"] === "flex" && shown["columns"] === 1,
		shown,
	);
	await shot(narrow, "tasks-board-narrow");
	await narrow.ask(`location.hash = "T-147"`);
	const narrowTask = (await settled(narrow, NARROW_TASK)) as Record<string, unknown>;
	const folds = narrowTask["folds"] as [string, string, string][];
	check(
		"a narrow task page draws no side plate, folds its properties into chips ending in +N",
		narrowTask["side"] === false &&
			JSON.stringify(narrowTask["chips"]) === JSON.stringify(["Ready to test", "feat/panes-and-windows", "code", "+4"]),
		[narrowTask["side"], narrowTask["chips"]],
	);
	check(
		"narrow sections fold with their summaries, only the test plan open when ready to test",
		JSON.stringify(folds) ===
			JSON.stringify([
				["criteria", "closed", "3 met"],
				["plan", "closed", "4 done"],
				["tests", "open", "4 of 4 passed"],
				["documents", "closed", "Spec, Research"],
				["activity", "closed", "2"],
			]),
		folds,
	);
	check(
		"narrow header shows the id and open chat, with no second more menu beside the plate's own",
		narrowTask["crumb"] === "T-147" && narrowTask["more"] === false,
		[narrowTask["crumb"], narrowTask["more"]],
	);
	const narrowOpenChat = await narrow.ask(
		`(() => { const link = document.querySelector("[data-tasks-open-chat]"); return [link?.tagName, link?.getAttribute("href"), link?.classList.contains("wg-plate-button"), link?.getAttribute("aria-label")]; })()`,
	);
	check(
		"the narrow Open chat is a header link carrying the chat's sumi address",
		JSON.stringify(narrowOpenChat) === JSON.stringify(["A", "sumi://chat/chat-panes", true, "Open chat"]),
		narrowOpenChat,
	);
	const bar = narrowTask["bar"] as { buttons: number[]; atBottom: number } | null;
	check(
		"Send back and Accept stand in a bar at the bottom, two equal buttons",
		bar !== null && bar.buttons.length === 2 && bar.buttons[0] === bar.buttons[1] && Math.abs(bar.atBottom) <= 1,
		bar,
	);
	await shot(narrow, "tasks-page-narrow");
	await narrow.ask(`document.querySelector("[data-tasks-more-props]").click()`);
	check(
		"+N opens every property",
		(await settled(
			narrow,
			`document.querySelector("[data-tasks-props-pop]")?.textContent.includes("Workplaces") ?? false`,
		)) === true,
		null,
	);
	await narrow.ask(`location.hash = ""`);
	await boardDrawn(narrow);
	await narrow.ask(`location.hash = "chat"`);
	const line = (await settled(narrow, `document.querySelector("[data-tasks-line]")?.textContent ?? null`)) as
		string | null;
	check(
		"the chat line says what the chat works on",
		line !== null && line.startsWith("Working onT-148Design tasks") && line.includes("3/6"),
		line,
	);
	await narrow.ask(`document.querySelector("[data-tasks-line]").click()`);
	check(
		"pressing the chat line opens the task",
		JSON.stringify(await settled(narrow, "window.__OPENED__")) === JSON.stringify(["T-148"]),
		null,
	);
	await shot(narrow, "tasks-chat-line");
} finally {
	narrow.close();
}

const chatWide = await paged(file, GATE, { size: [800, 400] });

try {
	await chatWide.ask(`location.hash = "chat"`);
	const step = (await settled(
		chatWide,
		`document.querySelector("[data-tasks-line] .wg-tasks-line-next")?.textContent ?? null`,
	)) as string | null;
	check("the chat line names the next step without its id", step === "· Draw the screens", step);
} finally {
	chatWide.close();
}

console.log(failed === 0 ? "tasks ui: all checks passed" : `tasks ui: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
