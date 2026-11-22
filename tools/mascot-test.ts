import { readFileSync } from "node:fs";
import http from "node:http";
import { agentEventsBetween } from "../plugins/ai/chat/src/features/assistant/lib/agent-activity.ts";
import type { ChatMoment } from "../plugins/ai/chat/src/features/assistant/lib/agent-activity.ts";
import {
	ASLEEP_AFTER_MS,
	DONE_HELD_MS,
	ERROR_HELD_MS,
	LISTENING_HELD_MS,
	SURPRISE_HELD_MS,
	mascotStateOf,
	nextDecisionAt,
} from "../plugins/ai/chat/src/features/mascot/lib/mascot-state.ts";
import type { MascotTouch } from "../plugins/ai/chat/src/features/mascot/lib/mascot-state.ts";
import { MascotStateSchema } from "../plugins/ai/chat/src/features/mascot/lib/mascot-state.schema.ts";
import type { MascotState } from "../plugins/ai/chat/src/features/mascot/lib/mascot-state.schema.ts";
import { cloverCellsOf, cloverRowsOf } from "../plugins/sumi-host/src/features/mascot/lib/clover-cells.ts";
import {
	STEM_FOOT,
	cloverCapsulesAt,
	cloverInkAt,
	leanedPoint,
} from "../plugins/sumi-host/src/features/mascot/lib/clover-shape.ts";
import { sumiStateOf } from "../plugins/sumi-host/src/features/mascot/lib/sumi-state-of.ts";
import { activityAfter } from "../plugins/ai/chat/data/mascot/features/activity/lib/activity-after.ts";
import { MemoryAgentActivityGateway } from "../plugins/ai/chat/data/mascot/gateways/agent-activity/memory.gateway.ts";
import { AgentActivitySchema, mascot } from "../plugins/ai/chat/data/mascot/generated/contract.ts";
import type { AgentActivity, AgentEvent } from "../plugins/ai/chat/data/mascot/generated/contract.ts";
import { mascot as mascotModule } from "../plugins/ai/chat/data/mascot/generated/module.ts";
import { runtime } from "../packages/shared/data-framework/src/index.ts";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";

let failed = 0;
function check(what: string, got: unknown, want: unknown): void {
	const isOk = JSON.stringify(got) === JSON.stringify(want);
	if (!isOk) {
		failed += 1;
	}

	console.log(
		`${isOk ? "ok  " : "FAIL"} ${what} — got ${JSON.stringify(got)}${isOk ? "" : `, want ${JSON.stringify(want)}`}`,
	);
}

const T0 = 1_000_000;
const NO_AGENT_ACTIVITY: AgentActivity = AgentActivitySchema.parse({});
const AWAKE: MascotTouch = { isHovered: false, pokedAt: -Infinity, wokeAt: T0 };

function stateAfter(steps: readonly (readonly [AgentEvent, number])[], at: number, touch = AWAKE): MascotState {
	check(
		"the next decision waits for the nearest deadline: asleep when quiet, idle when done ends",
		[
			nextDecisionAt(NO_AGENT_ACTIVITY, T0 + 1, AWAKE),
			nextDecisionAt({ ...NO_AGENT_ACTIVITY, finishedAt: T0, lastAt: T0 }, T0 + 1, AWAKE),
			nextDecisionAt(NO_AGENT_ACTIVITY, T0 + ASLEEP_AFTER_MS, AWAKE),
		],
		[T0 + ASLEEP_AFTER_MS, T0 + DONE_HELD_MS, null],
	);

	const activity = steps.reduce((was, [event, eventAt]) => activityAfter(was, [event], eventAt), NO_AGENT_ACTIVITY);
	return mascotStateOf(activity, at, touch);
}

const quietly = console.debug;
console.debug = () => undefined;

check("nothing happened: idle", mascotStateOf(NO_AGENT_ACTIVITY, T0 + 10, AWAKE), "idle");
check("asleep after 30 s of nothing", mascotStateOf(NO_AGENT_ACTIVITY, T0 + ASLEEP_AFTER_MS, AWAKE), "sleep");
check("still awake a moment before", mascotStateOf(NO_AGENT_ACTIVITY, T0 + ASLEEP_AFTER_MS - 1, AWAKE), "idle");
check(
	"a moved pointer wakes it",
	mascotStateOf(NO_AGENT_ACTIVITY, T0 + ASLEEP_AFTER_MS + 5, { ...AWAKE, wokeAt: T0 + ASLEEP_AFTER_MS }),
	"idle",
);
check("typing: listening", stateAfter([["typing", T0]], T0 + 100), "listening");
check("typing fades back to idle", stateAfter([["typing", T0]], T0 + LISTENING_HELD_MS), "idle");
check("sent: thinking", stateAfter([["sent", T0]], T0 + 50_000), "thinking");
check(
	"a tool running: working",
	stateAfter(
		[
			["sent", T0],
			["toolStarted", T0 + 10],
		],
		T0 + 20,
	),
	"working",
);
check(
	"the tool done, the run not: thinking again",
	stateAfter(
		[
			["sent", T0],
			["toolStarted", T0 + 10],
			["toolFinished", T0 + 20],
		],
		T0 + 30,
	),
	"thinking",
);
const finished: readonly (readonly [AgentEvent, number])[] = [
	["sent", T0],
	["runFinished", T0 + 10],
];
check("the run finished: done", stateAfter(finished, T0 + 20), "done");
check("done reverts to idle", stateAfter(finished, T0 + 10 + DONE_HELD_MS), "idle");
const broke: readonly (readonly [AgentEvent, number])[] = [
	["sent", T0],
	["toolStarted", T0 + 10],
	["failed", T0 + 20],
];
check("a failure while running: error", stateAfter(broke, T0 + 30), "error");
check("error reverts to what runs", stateAfter(broke, T0 + 20 + ERROR_HELD_MS), "working");
const asked: readonly (readonly [AgentEvent, number])[] = [
	["sent", T0],
	["runFinished", T0 + 10],
	["asked", T0 + 10],
];
check("asked: question, and it holds", stateAfter(asked, T0 + 10 * ASLEEP_AFTER_MS), "question");
check("answered: no question", stateAfter([...asked, ["answered", T0 + 20]], T0 + 10 + DONE_HELD_MS), "idle");
check(
	"hovered while idle: pleased",
	mascotStateOf(NO_AGENT_ACTIVITY, T0 + 1, { ...AWAKE, isHovered: true }),
	"pleased",
);
check(
	"hovered while thinking: still thinking",
	stateAfter([["sent", T0]], T0 + 1, { ...AWAKE, isHovered: true }),
	"thinking",
);
check(
	"poked: surprised, then not",
	[
		mascotStateOf(NO_AGENT_ACTIVITY, T0 + 1, { ...AWAKE, pokedAt: T0 }),
		mascotStateOf(NO_AGENT_ACTIVITY, T0 + SURPRISE_HELD_MS, { ...AWAKE, pokedAt: T0 }),
	],
	["surprised", "idle"],
);

const mascotApp = runtime()
	.modules(mascotModule)
	.start({
		platform: "browser",
		scope: {
			workspaceId: "mascot-test",
		},
	});
await mascotApp.send(mascot.activity.recordAgentEvents, {
	events: ["sent", "toolStarted", "toolStarted", "toolFinished"],
});
const midRun = await mascotApp.send(mascot.activity.agentActivity);
await mascotApp.send(mascot.activity.recordAgentEvents, {
	events: ["runFinished"],
});
const afterRun = await mascotApp.send(mascot.activity.agentActivity);
check(
	"the module counts tools through a run and ends it on runFinished",
	[
		midRun.ok && midRun.output.toolsRunning,
		afterRun.ok && afterRun.output.isRunning,
		afterRun.ok && afterRun.output.toolsRunning,
	],
	[1, false, 0],
);
const kept = new MemoryAgentActivityGateway();
let told = 0;
const stopWatching = kept.agentActivityChanged(() => (told += 1));
kept.saveAgentActivity(activityAfter(NO_AGENT_ACTIVITY, ["sent"], T0));
stopWatching();
kept.saveAgentActivity(activityAfter(NO_AGENT_ACTIVITY, ["runFinished"], T0 + 1));
check("a watcher of the gateway is told once per save, and not after it stops", told, 1);
console.debug = quietly;

const calm: ChatMoment = { isBusy: false, failure: null, calls: new Map(), isAsking: false };
const running: ChatMoment = { ...calm, isBusy: true, calls: new Map([["a", { isAnswered: false, isFailed: false }]]) };
const answeredBadly: ChatMoment = {
	...running,
	isBusy: false,
	failure: "no vault",
	calls: new Map([["a", { isAnswered: true, isFailed: true }]]),
};
check("the chat sends, then a tool starts", agentEventsBetween(calm, running), ["sent", "toolStarted"]);
check("a tool fails and the run ends on a failure", agentEventsBetween(running, answeredBadly), [
	"toolFinished",
	"failed",
	"failed",
	"runFinished",
]);
check(
	"a spec card waits: asked, then answered",
	[agentEventsBetween(calm, { ...calm, isAsking: true }), agentEventsBetween({ ...calm, isAsking: true }, calm)],
	[["asked"], ["answered"]],
);
check("nothing changed: nothing told", agentEventsBetween(running, running), []);

const stillClover = cloverCapsulesAt(0);
const overhead = { x: 0, y: -1 };
check(
	"ink inside a leaf, paper far outside",
	[
		cloverInkAt(stillClover, { x: -0.35, y: -0.4 }, overhead) > 0,
		cloverInkAt(stillClover, { x: 0.95, y: 0.95 }, overhead) < 0,
	],
	[true, true],
);
check(
	"a leaning clover turns about its foot: the foot holds, a point above it moves",
	[leanedPoint(STEM_FOOT, 0.4), leanedPoint({ x: STEM_FOOT.x, y: -0.5 }, 0.4).x < STEM_FOOT.x],
	[STEM_FOOT, true],
);
const cellsPerLeaf = (size: number): number[] =>
	cloverCellsOf(cloverRowsOf(size)).reduce<number[]>((counts, cell) => {
		counts[cell.leaf] = (counts[cell.leaf] ?? 0) + 1;
		return counts;
	}, []);
check(
	"the small mark is four equal leaves round a heart, at both sizes",
	[cellsPerLeaf(20), cellsPerLeaf(14)],
	[
		[13, 13, 13, 13, 1],
		[8, 8, 8, 8, 1],
	],
);
check(
	"every old mood has a square state",
	MascotStateSchema.options.map((mood) => sumiStateOf(mood)),
	["rest", "listening", "working", "working", "done", "waits", "error", "asleep", "rest", "surprised"],
);

const bundle = await bundleOf("tools/mascot-page.tsx");
const sheet = readFileSync(BOARD_SHEET, "utf8");
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${sheet}</style>
<style>#live { position: absolute; left: 600px; top: 200px; } #states { display: flex; gap: 8px; }</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

const FILLS = `(() => {
	const ink = (variable) => { const probe = document.createElement("span"); probe.style.color = "var(" + variable + ")"; document.querySelector(".mascot-page").append(probe); const colour = getComputedStyle(probe).color; probe.remove(); return colour; };
	const body = (at) => getComputedStyle(document.querySelector(at + " .sumi-figure-body")).fill;
	return {
		rest: body("[data-row=rest]") === ink("--text"),
		waits: body("[data-row=waits]") === ink("--accent-base"),
		done: body("[data-row=done]") === ink("--success-text"),
		error: body("[data-row=error]") === ink("--danger"),
		dark: body("#dark") !== body("[data-row=rest]"),
		cells: document.querySelectorAll("[data-row=rest] .sumi-figure-cell").length,
	};
})()`;
const LIVE = `(() => {
	const live = document.querySelector("#live .sumi-figure");
	const canvas = live.querySelector("canvas");
	const box = live.getBoundingClientRect();
	const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, Math.round(canvas.height / 3)).data;
	let inked = 0;
	let across = 0;
	for (let at = 3; at < pixels.length; at += 4) {
		if (pixels[at] > 0) { inked += 1; across += ((at - 3) / 4) % canvas.width; }
	}
	return {
		state: live.dataset.state,
		inked,
		top: inked === 0 ? 0 : across / inked / canvas.width,
		centre: [box.left + box.width / 2, box.top + box.height / 2],
	};
})()`;
const FRAMES_IN_A_SECOND = `new Promise((done) => {
	let asked = 0;
	const real = window.requestAnimationFrame;
	window.requestAnimationFrame = (step) => { asked += 1; return real(step); };
	setTimeout(() => { window.requestAnimationFrame = real; done(asked); }, 1000);
})`;

interface Live {
	readonly state: string;
	readonly inked: number;
	readonly top: number;
	readonly centre: readonly [number, number];
}

const isLive = (value: unknown): value is Live => typeof value === "object" && value !== null && "inked" in value;

async function liveOf(page: AskedPage): Promise<Live> {
	const read = await page.ask(LIVE);

	if (!isLive(read)) {
		throw new Error(`the live mascot did not answer: ${JSON.stringify(read)}`);
	}

	return read;
}

async function topsWhenPointedFrom(page: AskedPage, centre: readonly [number, number]): Promise<readonly number[]> {
	const tops: number[] = [];

	for (const dx of [-300, 300]) {
		await page.hover(centre[0] + dx, centre[1]);
		await waited(900);
		tops.push((await liveOf(page)).top);
	}

	return tops;
}

const page = await paged(origin, "mascot", { size: [1300, 700] });
try {
	await waited(800);
	check("each state paints its leaves, and the small mark is its 33 cells", await page.ask(FILLS), {
		rest: true,
		waits: true,
		done: true,
		error: true,
		dark: true,
		cells: 33,
	});
	const resting = await liveOf(page);
	check("the live mascot starts at rest, drawn in ink", [resting.state, resting.inked > 500], ["rest", true]);
	const [fromLeft = 0, fromRight = 0] = await topsWhenPointedFrom(page, resting.centre);
	check("its leaves lean toward the pointer", fromLeft < fromRight - 0.02, true);
	await page.ask(`window.__RECORD__(["sent"]); true`);
	await waited(300);
	check("a sent message: working", (await liveOf(page)).state, "working");
	await page.ask(`window.__RECORD__(["runFinished"]); true`);
	await waited(300);
	check("the run finished: done", (await liveOf(page)).state, "done");
	await page.ask(`location.hash = "quiet"; location.reload(); true`);
	await waited(1500);
	check("small figures ask for no frames", await page.ask(FRAMES_IN_A_SECOND), 0);
	await page.ask(`location.hash = ""; true`);
	await page.reduceMotion();
	await page.ask(`location.reload(); true`);
	await waited(1000);
	const still = await liveOf(page);
	const [stillLeft, stillRight] = await topsWhenPointedFrom(page, still.centre);
	check(
		"reduced motion: the clover is drawn and stays put",
		[still.inked > 500, stillLeft === stillRight],
		[true, true],
	);
	check("the page drew without a failure", await page.ask(`document.getElementById("boom").textContent`), "");
} finally {
	page.close();
	server.close();
}

console.log(failed === 0 ? "mascot: clean" : `mascot: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
