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
const STATES = ["done", "running", "check-failed", "run-failed", "asking", "stopped-kept", "hero-alone"];
const THEMES: readonly Theme[] = ["light", "dark"];
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-chat-pill"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/chat-pill-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
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

const TEXT_BOX_OF = `(node) => {
	const range = document.createRange();
	range.selectNodeContents(node);
	return range.getBoundingClientRect();
}`;

const OPEN_TOOLS = `(() => {
	document.querySelector(".wg-studio-ai-tools-head").click();
	return true;
})()`;

const OPEN_EDIT = `(() => {
	const row = [...document.querySelectorAll(".wg-studio-ai-call")].find((call) => call.querySelector(".is-edit"));
	row.querySelector(".wg-studio-ai-call-head").click();
	return true;
})()`;

const TOOLS_SEEN = `(() => {
	const paintOf = ${PAINT_OF};
	const head = document.querySelector(".wg-studio-ai-tools-head");
	const said = (${TEXT_BOX_OF})(head.querySelector(".wg-studio-ai-tools-said"));
	const round = head.querySelector(".wg-studio-ai-round").getBoundingClientRect();
	const box = head.getBoundingClientRect();
	const marks = [...document.querySelectorAll(".wg-studio-ai-call-mark")].map((mark) => ({
		kind: [...mark.classList].find((name) => name.startsWith("is-")),
		fill: getComputedStyle(mark).backgroundColor,
	}));
	return {
		saidFromLeft: Math.round(said.left - box.left),
		roundFromRight: Math.round(box.right - round.right),
		took: head.querySelector(".wg-studio-ai-tools-took")?.textContent ?? null,
		names: [...document.querySelectorAll(".wg-studio-ai-call-name")].map((name) => name.textContent),
		codes: [...document.querySelectorAll(".wg-studio-ai-call-name code")].map((code) => code.textContent),
		metas: [...document.querySelectorAll(".wg-studio-ai-call-head")].map(
			(row) => row.querySelector(".wg-studio-ai-call-meta, .wg-studio-ai-chip")?.textContent ?? null,
		),
		marks,
		tokens: {
			search: paintOf("--wg-kit-accent-wash"),
			read: paintOf("--wg-kit-accent-wash"),
			edit: paintOf("--wg-kit-accent"),
			run: paintOf("--primary"),
		},
	};
})()`;

const CLOSED_HEAD = `(() => {
	const head = document.querySelector(".wg-studio-ai-tools-head");
	const said = (${TEXT_BOX_OF})(head.querySelector(".wg-studio-ai-tools-said"));
	const box = head.getBoundingClientRect();
	return { saidFromLeft: Math.round(said.left - box.left), said: head.textContent };
})()`;

const DIFF_SEEN = `(() => ({
	file: document.querySelector(".wg-studio-ai-diff-file")?.textContent ?? null,
	lines: [...document.querySelectorAll(".wg-studio-ai-diff-line")].map((line) => line.className.split(" is-")[1]),
}))()`;

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

const HEAD_SEEN = `(() => {
	const head = document.querySelector(".wg-studio-ai-head");
	return head ? {
		order: [...head.children].map((child) => child.className.split(" ")[0] || child.tagName),
		title: head.querySelector(".wg-studio-ai-title")?.textContent ?? null,
		saysProvider: /Claude Code|helpers (on|off)/.test(head.textContent),
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
	holds("the open head says Used N tools from the left edge", seen["saidFromLeft"] === 14, seen["saidFromLeft"]);
	holds(
		"and its round chevron stands at the right edge",
		Number(seen["roundFromRight"]) <= 8 + SLACK_PX,
		seen["roundFromRight"],
	);
	check("the group's duration is the span of its calls", seen["took"], "12 s");
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
	const tokens = recordOf(seen["tokens"]);
	const marks = Array.isArray(seen["marks"]) ? seen["marks"].map(recordOf) : [];
	check(
		"the row's mark is painted by its kind",
		marks.map((mark) => mark["fill"] === tokens[String(mark["kind"]).replace("is-", "")]),
		[true, true, true, true, true],
	);
	check(
		"and the kinds are search, read, edit, run, run",
		marks.map((mark) => mark["kind"]),
		["is-search", "is-read", "is-edit", "is-run", "is-run"],
	);
}

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
		if (theme === "light") {
			const closed = recordOf(await page.ask(CLOSED_HEAD));
			holds("the closed head is never centred", closed["saidFromLeft"] === 10, closed);
			check("the chat head reads Ink and the app, and names no provider", recordOf(await page.ask(HEAD_SEEN)), {
				order: ["wg-mascot", "wg-studio-ai-named"],
				title: "Untitled app",
				saysProvider: false,
			});
		}
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
			check("beside a copy button", finish["copyLabel"], "Copy the answer");
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
