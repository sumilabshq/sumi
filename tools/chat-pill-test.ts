import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

type Theme = "light" | "dark";

const VIEW: readonly [number, number] = [640, 1400];
const SLACK_PX = 1;
const STATES = ["done", "running", "check-failed", "run-failed", "asking", "stopped-kept", "hero-alone", "empty"];
const THEMES: readonly Theme[] = ["light", "dark"];
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-chat-pill"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/chat-pill-page.tsx");
const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const pageOf = (theme: Theme): string => `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}
.wg-studio.wg-studio { display: block; height: auto; min-height: 100vh; padding: 12px; }
.wg-studio .wg-studio-chat { width: 600px; padding: 0; }</style></head>
<body class="theme-${theme}"><div class="wg-studio"><aside class="wg-studio-chat"><div id="chat"></div></aside></div>
<script>window.__COPIED__ = null; navigator.clipboard.writeText = async (said) => { window.__COPIED__ = said; };</script>
<script>${bundle}</script></body></html>`;

const PAINT_OF = `(token) => {
	const probe = document.querySelector(".wg-studio-ai").appendChild(document.createElement("i"));
	probe.style.backgroundColor = "var(" + token + ")";
	const painted = getComputedStyle(probe).backgroundColor;
	probe.remove();
	return painted;
}`;

const OPEN_TOOLS = `(() => {
	document.querySelectorAll(".wg-studio-ai-tools-head").forEach((head) => head.click());
	return true;
})()`;

const OPEN_EDIT = `(() => {
	const row = [...document.querySelectorAll(".wg-studio-ai-call")].find((call) => call.querySelector(".is-edit"));
	row.querySelector(".wg-studio-ai-call-head").click();
	return true;
})()`;

const TOOLS_SEEN = `(() => {
	const answer = [...document.querySelectorAll(".wg-studio-ai-turn")].find((turn) => turn.classList.contains("is-mine") === false);
	const firstSaid = answer.querySelector(".wg-studio-ai-said");
	const said = firstSaid.getBoundingClientRect();
	const head = answer.querySelector(".wg-studio-ai-tools-head");
	const icon = head.querySelector(".wg-studio-ai-tools-icon").getBoundingClientRect();
	return {
		flow: [...answer.children]
			.filter((part) => !part.classList.contains("wg-studio-ai-answer-line"))
			.map((part) => (part.classList.contains("wg-studio-ai-tools") ? "tools" : "said")),
		iconVsText: Math.round(icon.left - said.left - parseFloat(getComputedStyle(firstSaid).paddingLeft)),
		heads: [...answer.querySelectorAll(".wg-studio-ai-tools-said")].map((part) => part.textContent),
		took: [...answer.querySelectorAll(".wg-studio-ai-tools-took")].map((part) => part.textContent),
		headFill: getComputedStyle(head).backgroundColor,
		names: [...document.querySelectorAll(".wg-studio-ai-call-name")].map((name) => name.textContent),
		codes: [...document.querySelectorAll(".wg-studio-ai-call-name code")].map((code) => code.textContent),
		metas: [...document.querySelectorAll(".wg-studio-ai-call-head")].map(
			(row) => row.querySelector(".wg-studio-ai-call-meta, .wg-studio-ai-chip")?.textContent ?? null,
		),
		markFills: [...document.querySelectorAll(".wg-studio-ai-call-mark")].map((mark) => getComputedStyle(mark).backgroundColor),
	};
})()`;

const DIFF_SEEN = `(() => ({
	file: document.querySelector(".wg-studio-ai-diff-file")?.textContent ?? null,
	lines: [...document.querySelectorAll(".wg-studio-ai-diff-line")].map((line) => line.className.split(" is-")[1]),
}))()`;

const MINE_SEEN = `(() => {
	const line = document.querySelector(".wg-studio-ai-turn.is-mine .wg-studio-ai-mine-line");
	return {
		said: line?.querySelector(":scope > span:not(.wg-studio-ai-mine-time)")?.textContent + line?.querySelector(".wg-studio-ai-mine-time")?.textContent,
		opacity: line ? getComputedStyle(line).opacity : null,
		fullTime: line?.querySelector(".wg-studio-ai-mine-time")?.getAttribute("data-tip-said") ?? null,
		copyLabel: line?.querySelector("button")?.getAttribute("aria-label") ?? null,
		addsHeight: Math.round(line.closest(".wg-studio-ai-turn").getBoundingClientRect().height - line.closest(".wg-studio-ai-turn").querySelector(".wg-studio-ai-said").getBoundingClientRect().height),
		fitsGap: line.getBoundingClientRect().bottom <= line.closest(".wg-studio-ai-turn").nextElementSibling.getBoundingClientRect().top,
		textBelowBubble: Math.round(line.querySelector("span").getBoundingClientRect().top - line.closest(".wg-studio-ai-turn").querySelector(".wg-studio-ai-said").getBoundingClientRect().bottom),
		copySize: Math.round(line.querySelector("button").getBoundingClientRect().width),
		isSelectable: getComputedStyle(line).userSelect !== "none",
	};
})()`;

function pointIn(held: unknown): readonly [number, number] {
	if (!Array.isArray(held) || typeof held[0] !== "number" || typeof held[1] !== "number") {
		throw new Error(`not a point: ${JSON.stringify(held)}`);
	}

	return [held[0], held[1]];
}

const MINE_SPOT = `(() => {
	const box = document.querySelector(".wg-studio-ai-turn.is-mine .wg-studio-ai-said").getBoundingClientRect();
	return { at: [box.left + box.width / 2, box.top + box.height / 2] };
})()`;

const ANSWER_SEEN = `(() => {
	const line = document.querySelector(".wg-studio-ai-turn.is-answer .wg-studio-ai-answer-line");
	const turn = line.closest(".wg-studio-ai-turn");
	const next = turn.nextElementSibling;
	return {
		order: [...line.children].map((part) => (part.tagName === "BUTTON" ? "button" : "time")),
		opacity: getComputedStyle(line).opacity,
		copyLabel: line.querySelector("button")?.getAttribute("aria-label") ?? null,
		fitsGap: next === null || line.getBoundingClientRect().bottom <= next.getBoundingClientRect().top + 1,
		leftOfAnswer: Math.round(line.getBoundingClientRect().left - turn.getBoundingClientRect().left),
	};
})()`;

const ANSWER_SPOT = `(() => {
	const box = document.querySelector(".wg-studio-ai-turn.is-answer .wg-studio-ai-said").getBoundingClientRect();
	return { at: [box.left + 20, box.top + box.height / 2] };
})()`;

const FINISH_SEEN = `(() => {
	const paintOf = ${PAINT_OF};
	const finish = document.querySelector(".wg-studio-ai-finish");
	return {
		said: finish?.querySelector(".wg-studio-ai-finish-said")?.textContent ?? null,
		dot: finish ? getComputedStyle(finish.querySelector(".wg-studio-ai-finish-dot")).backgroundColor : null,
		success: paintOf("--wg-kit-success"),
		copyLabel: finish?.querySelector("button")?.getAttribute("aria-label") ?? null,
		result: [...document.querySelectorAll(".wg-studio-ai-result :is(.wg-studio-ai-result-chip, .wg-studio-ai-result-big, .wg-studio-ai-result-said)")].map((part) => part.textContent),
	};
})()`;

const ENDED_SEEN = `(() => {
	const line = document.querySelector(".wg-studio-ai-finish");
	return line ? {
		said: line.querySelector(".wg-studio-ai-finish-said").textContent,
		ended: [...line.classList].find((name) => name.startsWith("is-")) ?? null,
		copies: line.querySelector("button") !== null,
	} : null;
})()`;

const CHAT_WIDTHS = [400, 800, 1200];
const CHAT_WIDTH_PX = 600;
const WIDE_RATIO = 1.5;
const BAND_RATIO = 2.5;
const RATIO_SLACK = 0.05;
const STACKS_BELOW_PX = 560;

const cardsSeenAt = (width: number): string => `(async () => {
	document.querySelector(".wg-studio-chat").style.width = "${width}px";
	await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
	const plate = document.querySelector(".wg-studio-ai-result");
	const style = getComputedStyle(plate);
	const inner = plate.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	const cards = [...plate.children].map((card) => card.getBoundingClientRect());
	const rows = new Map();
	for (const card of cards) rows.set(Math.round(card.top), (rows.get(Math.round(card.top)) ?? 0) + card.width);
	const gap = parseFloat(style.columnGap) || 0;
	const rowFill = [...rows.entries()].map(([top, total]) => total + gap * (cards.filter((card) => Math.round(card.top) === top).length - 1));
	const hero = plate.querySelector(".wg-studio-ai-result-hero").getBoundingClientRect();
	const side = plate.querySelector(".wg-studio-ai-result-side")?.getBoundingClientRect() ?? null;
	const big = plate.querySelector(".wg-studio-ai-result-big");
	const bigStyle = getComputedStyle(big);
	const lineHeight = parseFloat(bigStyle.fontSize) * 1.02;
	return {
		inner: Math.round(inner),
		unfilled: Math.round(Math.max(Math.abs(plate.parentElement.clientWidth - plate.offsetWidth), ...rowFill.map((fill) => Math.abs(inner - fill)))),
		heroRatio: hero.width / hero.height,
		sideRatio: side ? side.width / side.height : null,
		headlineLines: Math.round((big.clientHeight - parseFloat(bigStyle.paddingBottom)) / lineHeight),
		isStacked: side ? side.top >= hero.bottom : null,
	};
})()`;

const PRESS_COPY = `(() => {
	document.querySelector(".wg-studio-ai-finish button").click();
	return true;
})()`;

const COPIED = `({ copied: window.__COPIED__, answer: window.__ANSWER__ ?? null })`;

const CODE_SEEN = `(() => {
	const block = document.querySelector(".wg-studio-ai-said pre");
	if (!block) return null;
	const code = block.querySelector("code");
	const copy = block.querySelector(".copy-code-button").getBoundingClientRect();
	const box = block.getBoundingClientRect();
	const range = document.createRange();
	range.selectNodeContents(code);
	const firstLine = range.getClientRects()[0];
	return {
		longest: Math.max(...code.textContent.split("\\n").map((line) => line.length)),
		overflows: block.scrollWidth > block.clientWidth,
		innerFill: getComputedStyle(code).backgroundColor,
		copyInside: copy.left >= box.left && copy.right <= box.right && copy.top >= box.top && copy.bottom <= box.bottom,
		firstLineClear: firstLine.right <= copy.left,
	};
})()`;

const RUNNING_SEEN = `(() => {
	const running = document.querySelector(".wg-studio-ai-running");
	return {
		said: running?.querySelector(".wg-studio-ai-running-said")?.textContent ?? null,
		took: running?.querySelector(".wg-studio-ai-running-took")?.textContent ?? null,
		stop: running?.querySelector("button")?.textContent ?? null,
	};
})()`;

const FAILURE_SEEN = `(() => {
	const card = document.querySelector(".wg-studio-ai-failure-card");
	return card ? [card.querySelector(".wg-studio-ai-failure-title").textContent, card.querySelector(".wg-studio-ai-failure-reason").textContent, card.querySelector("button").textContent] : null;
})()`;

const PRESS_FAILURE = `(() => { document.querySelector(".wg-studio-ai-failure-card button").click(); return true; })()`;

const QUESTION_SEEN = `(() => {
	const card = document.querySelector(".wg-studio-ai-question");
	return card ? {
		said: card.querySelector(".wg-studio-ai-question-said").textContent,
		options: [...card.querySelectorAll(".wg-studio-ai-question-option")].map((option) => option.textContent),
		picked: card.querySelector(".is-picked")?.textContent ?? null,
	} : null;
})()`;

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(got) === JSON.stringify(wanted);
	if (!isOk) failed += 1;
	console.log(
		`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}${isOk ? "" : ` (wanted ${JSON.stringify(wanted)})`}`,
	);
}

function holds(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function recordOf(value: unknown): Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

async function opened(page: AskedPage, state: string): Promise<void> {
	await page.ask(`location.hash = ${JSON.stringify(state)}; location.reload(); true`);
	await waited(200);
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await page.ask(`document.querySelector(".wg-studio-ai-head") !== null`)) === true) break;
		await waited(50);
	}
	await waited(400);
}

function checkTools(seen: Readonly<Record<string, unknown>>): void {
	check("tools stand between the words they came with", seen["flow"], ["said", "tools", "said", "tools", "said"]);
	check("each group says what it did", seen["heads"], [
		"Used 2 tools · searched, read",
		"Used 3 tools · edited 1 file, ran 2 commands",
	]);
	holds("a group's icon starts where the text starts", Math.abs(Number(seen["iconVsText"])) <= SLACK_PX, seen);
	check("a group's duration is the span of its calls", seen["took"], ["1 s", "10 s"]);
	check("a group head is a line of text, not a plate", seen["headFill"], "rgba(0, 0, 0, 0)");
	check("every row is a verb and an object", seen["names"], [
		"Searched languages",
		"Read translator/widget.tsx",
		"Edited translator/widget.tsx",
		"Ran widgets.mjs check @translator/translator",
		'Ran widgets.mjs report "Translator"',
	]);
	check("a pattern and a command are code", seen["codes"], [
		"languages",
		"widgets.mjs check @translator/translator",
		'widgets.mjs report "Translator"',
	]);
	check("each row's meta comes from the call", seen["metas"], ["5 hits", "212 lines", "+2 −1", "passed", "passed"]);
	check(
		"a row's mark is a quiet glyph with no painted circle",
		seen["markFills"],
		Array.from({ length: 5 }, () => "rgba(0, 0, 0, 0)"),
	);
}

const STARTERS_SEEN = `(() => {
	const rows = [...document.querySelectorAll(".wg-studio-ai-starter")];
	return {
		titles: rows.map((row) => row.textContent),
		stacked: rows.every((row, at) => at === 0 || row.getBoundingClientRect().top >= rows[at - 1].getBoundingClientRect().bottom),
		fills: rows.map((row) => getComputedStyle(row).backgroundColor),
	};
})()`;

const server = http.createServer((request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(pageOf(request.url?.includes("dark") ? "dark" : "light"));
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

for (const theme of THEMES) {
	const page = await paged(`${origin}${theme}`, "chat pill", { size: VIEW });
	try {
		await opened(page, "done");
		await page.ask(OPEN_TOOLS);
		await waited(200);
		if (theme === "light") checkTools(recordOf(await page.ask(TOOLS_SEEN)));
		await page.ask(OPEN_EDIT);
		await waited(200);
		if (theme === "light") {
			check("an edit opens into its diff", recordOf(await page.ask(DIFF_SEEN)), {
				file: "translator/widget.tsx",
				lines: ["removed", "added", "added", "kept"],
			});
			const finish = recordOf(await page.ask(FINISH_SEEN));
			check("the finish status says how long the answer took", finish["said"], "Done · 1 m 12 s");
			holds("on a success dot", finish["dot"] === finish["success"], finish);
			check("the finish status leaves copying to the answer's own line", finish["copyLabel"], null);
			check("the answer's line rests hidden", recordOf(await page.ask(ANSWER_SEEN))["opacity"], "0");
			const [answerX, answerY] = pointIn(recordOf(await page.ask(ANSWER_SPOT))["at"]);
			await page.hover(answerX, answerY);
			await waited(300);
			check(
				"hovering an answer shows a copy button first, then when it was answered",
				recordOf(await page.ask(ANSWER_SEEN)),
				{
					order: ["button", "time"],
					opacity: "1",
					copyLabel: "Copy the answer",
					fitsGap: true,
					leftOfAnswer: 0,
				},
			);
			check("my message's line rests hidden", recordOf(await page.ask(MINE_SEEN))["opacity"], "0");
			const [mineX, mineY] = pointIn(recordOf(await page.ask(MINE_SPOT))["at"]);
			await page.hover(mineX, mineY);
			await waited(300);
			check("hovering my message shows who read it, when, and a copy button", recordOf(await page.ask(MINE_SEEN)), {
				said: "Read by Sumi10 minutes ago",
				opacity: "1",
				fullTime: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
					Number(await page.ask("window.__T0__")),
				),
				copyLabel: "Copy the message",
				addsHeight: 36,
				fitsGap: true,
				textBelowBubble: 10,
				copySize: 24,
				isSelectable: false,
			});
			check("the result pair reads the turn and its report", finish["result"], [
				"Report · 12 features · Changed · 1 file · 1 check passed",
				"3 of 12features work",
				"Swap the direction",
			]);
			for (const width of CHAT_WIDTHS) {
				const cards = recordOf(await page.ask(cardsSeenAt(width)));
				const isNarrow = width < STACKS_BELOW_PX;
				holds(`at ${width}px the cards fill the plate's inner width`, Number(cards["unfilled"]) <= SLACK_PX, cards);
				holds(
					`at ${width}px the hero stays 3 to 2`,
					Math.abs(Number(cards["heroRatio"]) - WIDE_RATIO) <= RATIO_SLACK,
					cards["heroRatio"],
				);
				holds(
					`at ${width}px the blocker is ${isNarrow ? "a strip under the hero" : "a square beside it"}`,
					isNarrow
						? cards["isStacked"] === true && Number(cards["sideRatio"]) > 2
						: cards["isStacked"] === false && Math.abs(Number(cards["sideRatio"]) - 1) <= RATIO_SLACK,
					[cards["isStacked"], cards["sideRatio"]],
				);
				check(`at ${width}px the headline is two lines`, cards["headlineLines"], 2);
			}
			await page.ask(cardsSeenAt(CHAT_WIDTH_PX));
			check(
				"a long report line wraps inside one surface, its copy button floating over it",
				recordOf(await page.ask(CODE_SEEN)),
				{
					longest: 200,
					overflows: false,
					innerFill: "rgba(0, 0, 0, 0)",
					copyInside: true,
					firstLineClear: true,
				},
			);
			await page.ask(PRESS_COPY);
			await waited(100);
			const copied = recordOf(await page.ask(COPIED));
			holds(
				"the copy button copies the answer",
				copied["copied"] !== null && copied["copied"] === copied["answer"],
				copied,
			);
		}
		writeFileSync(path.join(shotsAt, `chat-done-${theme}.png`), await page.shoot());
		for (const state of STATES.slice(1)) {
			await opened(page, state);
			writeFileSync(path.join(shotsAt, `chat-${state}-${theme}.png`), await page.shoot());
			if (state === "empty" && theme === "light") {
				check("the starters are a list of titles, one under another, with no plate", await page.ask(STARTERS_SEEN), {
					titles: ["Create an app", "Design the app"],
					stacked: true,
					fills: ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"],
				});
			}
		}
		if (theme === "light") {
			await opened(page, "running");
			const running = recordOf(await page.ask(RUNNING_SEEN));
			check("a running call says what it does", running["said"], "Run the page test…");
			holds("with its own seconds", /^\d+ s$/.test(String(running["took"])), running["took"]);
			check("and a Stop pill", running["stop"], "Stop");
			await opened(page, "check-failed");
			check("a failed check is a card with a Fix it pill", await page.ask(FAILURE_SEEN), [
				"A check failed",
				"Swap didn’t keep the pair after a reload",
				"Fix it",
			]);
			await page.ask(PRESS_FAILURE);
			await waited(100);
			holds(
				"Fix it asks the agent to fix that check",
				String(await page.ask("window.__SENT__")).startsWith("Fix it: `widgets.mjs check"),
				await page.ask("window.__SENT__"),
			);
			await opened(page, "run-failed");
			check("a run that failed is a card with Try again", await page.ask(FAILURE_SEEN), [
				"The answer did not finish",
				"claude stopped: the weekly limit was reached",
				"Try again",
			]);
			await opened(page, "hero-alone");
			for (const width of CHAT_WIDTHS.filter((each) => each >= STACKS_BELOW_PX)) {
				const alone = recordOf(await page.ask(cardsSeenAt(width)));
				holds(`at ${width}px a card alone fills the plate`, Number(alone["unfilled"]) <= SLACK_PX, alone);
				holds(
					`at ${width}px a card alone is a 5 to 2 band`,
					Math.abs(Number(alone["heroRatio"]) - BAND_RATIO) <= RATIO_SLACK,
					alone["heroRatio"],
				);
			}
			await opened(page, "stopped-kept");
			check("a turn kept as stopped says so after a reload, never Done", await page.ask(ENDED_SEEN), {
				said: "Stopped · 12 s",
				ended: "is-stopped",
				copies: false,
			});
			await opened(page, "asking");
			await waited(300);
			check("a spec choice is a question card with option pills", await page.ask(QUESTION_SEEN), {
				said: "Keep the languages for this tile only, or for every page?",
				options: ["For every pagePicked", "This tile only"],
				picked: "For every pagePicked",
			});
		}
	} finally {
		page.close();
	}
}
server.close();

console.log(`shots in ${shotsAt}`);
console.log(failed === 0 ? "chat pill: clean" : `chat pill: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
