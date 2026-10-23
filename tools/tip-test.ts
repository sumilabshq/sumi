import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { kitTooltipSheet } from "./kit-tooltip-sheet.ts";

interface Frame {
	readonly at: number;
	readonly nodes: number;
	readonly opacity: number;
	readonly x: number;
	readonly width: number;
	readonly text: string;
}

interface TimedRow {
	readonly action: string;
	readonly ms: number;
	readonly targetCommits: number;
	readonly tipCommits: number;
}

const VIEW: readonly [number, number] = [1200, 700];
const MOST_MS = 100;
const SHOWN_AFTER_MS = 500;
const GAP_CROSSING_MS = 30;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tip"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/tip-page.tsx");
const sheets =
	`${kitTooltipSheet()}\n` +
	["design-systems/sumi/sumi.css", "packages/shell/shell.css"].map((at) => readFileSync(at, "utf8")).join("\n");
const font = readFileSync("packages/kit/assets/fonts/inter/InterVariable-latin.woff2");
const FONT_FACE = `@font-face { font-family: "Inter Variable"; src: url(/inter.woff2) format("woff2"); font-weight: 100 900; }`;
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACE}</style><style>${sheets}</style>
<style>body { margin: 0; background: var(--sumi-frame); }</style></head><body><div id="root"></div><pre id="boom"></pre>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;

let failed = 0;
const timings: TimedRow[] = [];

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const server = http.createServer((request, response) => {
	if (request.url === "/inter.woff2") {
		response.setHeader("content-type", "font/woff2");
		response.end(font);
		return;
	}

	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const SAMPLER = `(() => {
	const frames = [];
	const startedAt = performance.now();
	let isOn = true;
	window.__TIP_ENTERED_B__ = null;
	window.__TIP_STARTED__ = startedAt;
	document.addEventListener("pointerover", (event) => {
		if (window.__TIP_ENTERED_B__ === null && event.target.closest?.('[data-at="b"]')) {
			window.__TIP_ENTERED_B__ = Math.round(performance.now() - window.__TIP_STARTED__);
		}
	}, true);
	const tick = () => {
		const bubbles = document.querySelectorAll("[data-tip-bubble]");
		const bubble = bubbles[0];
		const face = bubble?.querySelector("[data-tip-face]");
		const now = bubble?.querySelector(".wg-kit-tooltip-words:not(.is-leaving)");
		frames.push({
			at: Math.round(performance.now() - startedAt),
			nodes: bubbles.length,
			opacity: bubble ? Number(getComputedStyle(bubble).opacity) : 0,
			x: bubble ? new DOMMatrixReadOnly(getComputedStyle(bubble).transform).m41 : 0,
			width: face ? face.getBoundingClientRect().width : 0,
			text: now?.textContent ?? "",
		});
		if (isOn) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
	window.__TIP_SAMPLER__ = { stop: () => { isOn = false; return frames; } };
	return true;
})()`;

const COMMITS = `({ ...window.__TIP_COMMITS__ })`;

async function centreOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const box = await page.ask(
		`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + r.height / 2, r.right] : null; })()`,
	);
	if (!Array.isArray(box) || typeof box[0] !== "number" || typeof box[1] !== "number") {
		throw new Error(`nothing matches ${selector}`);
	}

	return [box[0], box[1]];
}

async function rightEdgeOf(page: AskedPage, selector: string): Promise<number> {
	const right = await page.ask(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().right`);
	return typeof right === "number" ? right : 0;
}

async function commitsOf(page: AskedPage): Promise<{ targets: number; tip: number }> {
	const got = await page.ask(COMMITS);
	if (typeof got !== "object" || got === null) {
		return { targets: 0, tip: 0 };
	}

	return {
		targets: Number(Reflect.get(got, "targets")),
		tip: Number(Reflect.get(got, "tip")),
	};
}

async function framesTaken(page: AskedPage): Promise<readonly Frame[]> {
	const got = await page.ask(`window.__TIP_SAMPLER__.stop()`);
	return Array.isArray(got) ? got.filter((one): one is Frame => typeof one === "object" && one !== null) : [];
}

async function untilOpen(page: AskedPage, startedAt: number, text: string): Promise<number> {
	const wanted = JSON.stringify(text);
	for (let tries = 0; tries < 200; tries += 1) {
		const isOpen = await page.ask(
			`document.querySelector("[data-tip-bubble]")?.dataset.phase === "open" && document.querySelector("[data-tip-bubble] .wg-kit-tooltip-words:not(.is-leaving)")?.textContent === ${wanted}`,
		);
		if (isOpen === true) {
			return Date.now() - startedAt;
		}

		await waited(10);
	}

	return Number.POSITIVE_INFINITY;
}

async function shownAfterMs(page: AskedPage): Promise<number> {
	const got = await page.ask(`Math.round(window.__TIP_SHOWN_AFTER__.openedAt - window.__TIP_SHOWN_AFTER__.pointedAt)`);
	return typeof got === "number" ? got : Number.POSITIVE_INFINITY;
}

async function glideFromAtoB(page: AskedPage, isMotion: boolean): Promise<readonly Frame[]> {
	const [ax, ay] = await centreOf(page, '[data-at="a"]');
	const [bx, by] = await centreOf(page, '[data-at="b"]');
	const gap = (await rightEdgeOf(page, '[data-at="a"]')) + 1;
	await page.hover(ax, ay);
	await untilOpen(page, Date.now(), "Hide chats");
	const shownMs = await shownAfterMs(page);
	if (isMotion) {
		check(
			`first show waits ~${SHOWN_AFTER_MS} ms`,
			shownMs >= SHOWN_AFTER_MS - 30 && shownMs < SHOWN_AFTER_MS + 250,
			shownMs,
		);
	}

	await waited(200);
	const before = await commitsOf(page);
	await page.ask(SAMPLER);
	await waited(50);
	await page.hover(gap, ay);
	await waited(GAP_CROSSING_MS);
	await page.hover(bx, by);
	await waited(400);
	const frames = await framesTaken(page);
	const after = await commitsOf(page);
	const firstB = frames.find((frame) => frame.text === "Open a new chat with everything");
	const enteredB = await page.ask(`window.__TIP_ENTERED_B__`);
	const ms = firstB && typeof enteredB === "number" ? firstB.at - enteredB : Number.POSITIVE_INFINITY;
	timings.push({
		action: isMotion ? "hover A → B (text B painted)" : "hover A → B, reduced motion",
		ms,
		targetCommits: after.targets - before.targets,
		tipCommits: after.tip - before.tip,
	});
	check(
		"the target row never re-renders while the tip moves",
		after.targets === before.targets,
		after.targets - before.targets,
	);
	check("the tip renders for the move", after.tip > before.tip, after.tip - before.tip);
	check(`B's text paints under ${MOST_MS} ms`, ms < MOST_MS, ms);
	return frames;
}

async function walked(page: AskedPage): Promise<void> {
	const frames = await glideFromAtoB(page, true);
	const nodes = [...new Set(frames.map((frame) => frame.nodes))];
	check("one tooltip node throughout", nodes.length === 1 && nodes[0] === 1, nodes);
	const lowest = Math.min(...frames.map((frame) => frame.opacity));
	check("no opacity dip below 0.9 between A and B", lowest >= 0.9, lowest);
	const first = frames[0]?.x ?? 0;
	const last = frames[frames.length - 1]?.x ?? 0;
	const between = frames.filter((frame) => frame.x > Math.min(first, last) + 1 && frame.x < Math.max(first, last) - 1);
	check("its position transitions (frames between A and B)", between.length >= 2 && last !== first, {
		first,
		last,
		between: between.length,
	});
	const widths = frames.map((frame) => Math.round(frame.width));
	const widthBetween = widths.filter((width) => width > Math.min(...widths) && width < Math.max(...widths));
	check("its width transitions", widthBetween.length >= 1, [...new Set(widths)]);
	check(
		"the text is B's",
		frames[frames.length - 1]?.text === "Open a new chat with everything",
		frames[frames.length - 1]?.text,
	);
	writeFileSync(path.join(shotsAt, "tip-glide-frames.json"), JSON.stringify(frames, null, 1));

	const [emptyX, emptyY] = [600, 500];
	await page.hover(emptyX, emptyY);
	const leftAt = Date.now();
	let goneMs = Number.POSITIVE_INFINITY;
	for (let tries = 0; tries < 60; tries += 1) {
		const opacity = await page.ask(`Number(getComputedStyle(document.querySelector("[data-tip-bubble]")).opacity)`);
		if (opacity === 0) {
			goneMs = Date.now() - leftAt;
			break;
		}

		await waited(5);
	}

	check("leaving every target fades it out within ~200 ms", goneMs < 260, goneMs);
	const [cx, cy] = await centreOf(page, '[data-at="c"]');
	await page.hover(cx, cy);
	const graceMs = await untilOpen(page, Date.now(), "Share");
	timings.push({ action: "hover C inside the grace window", ms: graceMs, targetCommits: 0, tipCommits: 0 });
	check(`inside the grace window the next tip opens at once (< ${MOST_MS} ms)`, graceMs < MOST_MS, graceMs);
	const [dx, dy] = await centreOf(page, '[data-at="d"]');
	await page.hover(dx, dy);
	await untilOpen(page, Date.now(), "Search⌘K");
	await waited(300);
	const keyed = await page.ask(`(() => {
		const bubble = document.querySelector("[data-tip-bubble]");
		const key = bubble.querySelector(".wg-kit-tooltip-key");
		const target = document.querySelector('[data-at="d"]').getBoundingClientRect();
		const face = bubble.querySelector("[data-tip-face]").getBoundingClientRect();
		return { side: bubble.dataset.side, key: key?.textContent, below: face.top >= target.bottom };
	})()`);
	check(
		"a shortcut is drawn and the side asked is honoured",
		JSON.stringify(keyed) === JSON.stringify({ side: "bottom", key: "⌘K", below: true }),
		keyed,
	);
	await waited(400);
	writeFileSync(path.join(shotsAt, "tip-keyed.png"), await page.shoot());

	await page.hover(emptyX, emptyY);
	await waited(800);
	const [fx, fy] = await centreOf(page, '[data-at="foot"]');
	await page.hover(fx, fy);
	await untilOpen(page, Date.now(), "Urcraft⌘3");
	const coldMs = await shownAfterMs(page);
	timings.push({ action: "hover after the grace window (first show)", ms: coldMs, targetCommits: 0, tipCommits: 0 });
	check("after the grace window the delay is back", coldMs >= SHOWN_AFTER_MS - 30, coldMs);
	const foot = await page.ask(`(() => {
		const face = document.querySelector("[data-tip-face]").getBoundingClientRect();
		const target = document.querySelector('[data-at="foot"]').getBoundingClientRect();
		return { side: document.querySelector("[data-tip-bubble]").dataset.side, above: face.bottom <= target.top, start: Math.round(face.left - (target.left + target.width / 2 - 36)) };
	})()`);
	check(
		"a start tip sits above with its arrow on the target",
		JSON.stringify(foot) === JSON.stringify({ side: "top", above: true, start: 0 }),
		foot,
	);
	await waited(300);
	writeFileSync(path.join(shotsAt, "tip-foot.png"), await page.shoot());

	await page.press(fx, fy);
	await waited(50);
	check(
		"a press hides it at once",
		(await page.ask(`document.querySelector("[data-tip-bubble]").dataset.phase`)) !== "open",
		await page.ask(`document.querySelector("[data-tip-bubble]").dataset.phase`),
	);
}

async function walkedReduced(page: AskedPage): Promise<void> {
	await page.reduceMotion();
	await page.hover(600, 500);
	await waited(800);
	const frames = await glideFromAtoB(page, false);
	const xs = [...new Set(frames.map((frame) => Math.round(frame.x)))];
	check("reduced motion: the tip jumps, no frames between", xs.length <= 2, xs);
}

try {
	for (const theme of ["light", "dark"] as const) {
		const page = await paged(`${origin}?theme=${theme}`, "tip", { size: VIEW });
		try {
			await waited(400);
			const boom = await page.ask(`document.getElementById("boom").textContent`);
			check(`${theme}: the page renders`, boom === "", boom);
			if (theme === "light") {
				await walked(page);
				await walkedReduced(page);
				continue;
			}

			const [ax, ay] = await centreOf(page, '[data-at="a"]');
			await page.hover(ax, ay);
			await untilOpen(page, Date.now(), "Hide chats");
			await waited(300);
			writeFileSync(path.join(shotsAt, "tip-dark.png"), await page.shoot());
		} finally {
			page.close();
		}
	}
} finally {
	server.close();
}

console.log("\naction | ms | target commits | tip commits");
for (const row of timings) {
	console.log(`${row.action} | ${row.ms} | ${row.targetCommits} | ${row.tipCommits}`);
}

console.log(`\nshots: ${shotsAt}`);
console.log(failed === 0 ? "tip: all green" : `tip: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
