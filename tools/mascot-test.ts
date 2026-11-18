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
import { gazeGoalOf, lidOf } from "../plugins/sumi-host/src/features/mascot/lib/sumi-goals.ts";
import {
	EYE_TENSION,
	bodyPointsOf,
	cornerGoalsOf,
	eyeTransformOf,
	restingCorners,
	restingSpring,
	springToward,
} from "../plugins/sumi-host/src/features/mascot/lib/sumi-springs.ts";
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

const looked = { x: 0.4, y: -0.2 };
check("rest looks where the pointer is", gazeGoalOf("rest", 1000, looked), looked);
check("listening looks down at the composer", gazeGoalOf("listening", 1000, looked).y > 0, true);
check("working holds the eye in the centre", gazeGoalOf("working", 1000, looked), { x: 0, y: 0 });
check(
	"waits looks down and taps between two heights",
	[gazeGoalOf("waits", 0, looked).y, gazeGoalOf("waits", 450, looked).y],
	[0.8, 0.58],
);
check(
	"done nods up and down, then settles in the centre",
	[gazeGoalOf("done", 0, looked).y < 0, gazeGoalOf("done", 160, looked).y > 0, gazeGoalOf("done", 900, looked)],
	[true, true, { x: 0, y: 0 }],
);
check(
	"error shakes side to side, then settles",
	[gazeGoalOf("error", 0, looked).x, gazeGoalOf("error", 100, looked).x, gazeGoalOf("error", 900, looked)],
	[-0.6, 0.6, { x: 0, y: 0 }],
);
check("asleep sinks low", gazeGoalOf("asleep", 0, looked), { x: 0, y: 0.78 });
check(
	"rest blinks at the start of each cycle and is open between",
	[lidOf("rest", 75) < 0.5, lidOf("rest", 1000), lidOf("working", 75), lidOf("asleep", 1000)],
	[true, 1, 1, 0.14],
);
const settling = restingSpring();
for (let frame = 0; frame < 120; frame += 1) {
	springToward(settling, { x: 1, y: 0 }, EYE_TENSION, 1 / 60);
}
check("the eye spring settles on its goal", [settling.x.toFixed(2), settling.y.toFixed(2)], ["1.00", "0.00"]);
check(
	"a still eye is square; a fast one stretches along its move, never turns",
	[
		eyeTransformOf(restingSpring(), 200, 1),
		/scale\(([\d.]+) ([\d.]+)\)/
			.exec(eyeTransformOf({ x: 0, y: 0, vx: 8, vy: 0 }, 200, 1))
			?.slice(1)
			.map(Number)
			.map((at) => at > 1),
		eyeTransformOf({ x: 0, y: 0, vx: 8, vy: 8 }, 200, 1).includes("rotate"),
	],
	["translate(0.00 0.00) scale(1.000 1.000)", [true, false], false],
);
const pulledDown = cornerGoalsOf({ x: 0, y: 1 }, 1, { x: 0, y: 0 }, 0, 140);
check(
	"a pointer below pulls the bottom corners down, the top ones stay",
	pulledDown.map((goal) => goal.y > 0),
	[false, false, true, true],
);
check("no pointer, no move: every corner rests", cornerGoalsOf({ x: 0, y: 0 }, 0, { x: 0, y: 0 }, 0, 140), [
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
]);
check(
	"the resting body is the square itself",
	bodyPointsOf(restingCorners(), 40),
	"-20.0,-20.0 20.0,-20.0 20.0,20.0 -20.0,20.0",
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
		rest: body("[data-row=rest]") === ink("--sumi-text"),
		waits: body("[data-row=waits]") === ink("--sumi-accent"),
		done: body("[data-row=done]") === ink("--sumi-success"),
		error: body("[data-row=error]") === ink("--sumi-danger"),
		eye: getComputedStyle(document.querySelector("[data-row=rest] .sumi-figure-eye")).fill === ink("--sumi-plate"),
		dark: body("#dark") !== body("[data-row=rest]"),
		glow: getComputedStyle(document.querySelector("[data-row=working] .sumi-figure-eye")).animationName,
	};
})()`;
const LIVE = `(() => {
	const live = document.querySelector("#live .sumi-figure");
	const box = live.getBoundingClientRect();
	return {
		state: live.dataset.state,
		eye: live.querySelector(".sumi-figure-eye").getAttribute("transform"),
		body: live.querySelector(".sumi-figure-body").getAttribute("points"),
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
	readonly eye: string;
	readonly body: string;
	readonly centre: readonly [number, number];
}

const isLive = (value: unknown): value is Live => typeof value === "object" && value !== null && "eye" in value;

async function liveOf(page: AskedPage): Promise<Live> {
	const read = await page.ask(LIVE);

	if (!isLive(read)) {
		throw new Error(`the live mascot did not answer: ${JSON.stringify(read)}`);
	}

	return read;
}

async function eyesWhenPointedFrom(page: AskedPage, centre: readonly [number, number]): Promise<readonly string[]> {
	const eyes: string[] = [];

	for (const dx of [-300, 300]) {
		for (let step = 0; step < 4; step += 1) {
			await page.hover(centre[0] + dx + step, centre[1] + step);
			await waited(60);
		}

		await waited(700);
		eyes.push((await liveOf(page)).eye);
	}

	return eyes;
}

const eyeX = (transform: string): number => Number(/translate\(([-\d.]+)/.exec(transform)?.[1] ?? NaN);
const lowestY = (points: string): number => Math.max(...points.split(" ").map((one) => Number(one.split(",")[1])));

const page = await paged(origin, "mascot", { size: [1300, 700] });
try {
	await waited(800);
	check("each state paints its body, the eye is the paper, working does not glow", await page.ask(FILLS), {
		rest: true,
		waits: true,
		done: true,
		error: true,
		eye: true,
		dark: true,
		glow: "none",
	});
	const resting = await liveOf(page);
	check("the live mascot starts at rest", resting.state, "rest");
	const [fromLeft = "", fromRight = ""] = await eyesWhenPointedFrom(page, resting.centre);
	check("its eye follows the pointer", eyeX(fromLeft) < eyeX(fromRight) - 2, true);
	await page.hover(resting.centre[0], resting.centre[1] + 160);
	await waited(800);
	check("a pointer below pulls the body down past its square", lowestY((await liveOf(page)).body) > 90, true);
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
	const [stillLeft, stillRight] = await eyesWhenPointedFrom(page, still.centre);
	check("reduced motion: the eye stays put", stillLeft === stillRight && stillLeft !== "", true);
	check("the page drew without a failure", await page.ask(`document.getElementById("boom").textContent`), "");
} finally {
	page.close();
	server.close();
}

console.log(failed === 0 ? "mascot: clean" : `mascot: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
