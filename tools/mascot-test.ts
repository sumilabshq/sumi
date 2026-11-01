import { readFileSync } from "node:fs";
import http from "node:http";
import { agentEventsBetween } from "../apps/chat/src/features/assistant/lib/agent-activity.ts";
import type { ChatMoment } from "../apps/chat/src/features/assistant/lib/agent-activity.ts";
import {
	ASLEEP_AFTER_MS,
	DONE_HELD_MS,
	ERROR_HELD_MS,
	LISTENING_HELD_MS,
	SURPRISE_HELD_MS,
	mascotStateOf,
	nextDecisionAt,
} from "../apps/studio/src/features/mascot/lib/mascot-state.ts";
import type { MascotTouch } from "../apps/studio/src/features/mascot/lib/mascot-state.ts";
import { bodyPoseOf, lookTargetOf, springStep } from "../apps/studio/src/features/mascot/lib/mascot-motion.ts";
import type { Spring } from "../apps/studio/src/features/mascot/lib/mascot-motion.ts";
import { OUTFITS, sceneOf } from "../apps/studio/src/features/mascot/lib/wardrobe/outfits.ts";
import { OutfitIdSchema } from "../apps/studio/src/features/mascot/lib/outfit.schema.ts";
import type { MascotState } from "../apps/studio/src/features/mascot/lib/mascot-state.schema.ts";
import { activityAfter } from "../packages/domain/mascot/features/activity/lib/activity-after.ts";
import { MemoryAgentActivityGateway } from "../packages/domain/mascot/gateways/agent-activity/memory.gateway.ts";
import { AgentActivityQuery, AgentActivitySchema, RecordAgentEventsCommand } from "../packages/domain/mascot/index.ts";
import type { AgentActivity, AgentEvent } from "../packages/domain/mascot/index.ts";
import { MascotModule } from "../packages/domain/mascot/module.ts";
import { app } from "../packages/shared/core/src/requests/index.ts";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

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

const mascotApp = app()
	.modules(MascotModule)
	.start({
		platform: "browser",
		scope: {
			workspaceId: "mascot-test",
		},
	});
await mascotApp.send(RecordAgentEventsCommand, {
	events: ["sent", "toolStarted", "toolStarted", "toolFinished"],
});
const midRun = await mascotApp.send(AgentActivityQuery);
await mascotApp.send(RecordAgentEventsCommand, {
	events: ["runFinished"],
});
const afterRun = await mascotApp.send(AgentActivityQuery);
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

const thinking = [0, 0.5].map((seconds) => lookTargetOf("thinking", seconds, [0, 0]).map((at) => at.toFixed(3)));
check("thinking rolls the eyes around the top", thinking[0] !== thinking[1] && Number(thinking[0]?.[1]) < 0, true);
check("idle looks where the pointer is", lookTargetOf("idle", 3, [0.4, -0.2]), [0.4, -0.2]);
let spring: Spring = { look: [0, 0], velocity: [0, 0] };
for (let frame = 0; frame < 120; frame += 1) {
	spring = springStep(spring, [1, 0], 1 / 60);
}
check(
	"the spring settles on its target",
	spring.look.map((at) => at.toFixed(2)),
	["1.00", "0.00"],
);
check(
	"asleep, the body stops turning; awake it turns",
	[
		bodyPoseOf([1, 0], "sleep").body === bodyPoseOf([0, 0], "sleep").body,
		bodyPoseOf([1, 0], "idle").body === bodyPoseOf([0, 0], "idle").body,
	],
	[true, false],
);
const IDS = { paint: "g", shine: "s", clip: "c" };
const LOOKS: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.8, 0.3],
	[-0.6, -0.6],
	[0.3, 0.9],
	[-0.9, 0.2],
];
const dressed = OutfitIdSchema.options.map((outfit) => {
	for (let warm = 0; warm < 30; warm += 1) {
		sceneOf(outfit, { look: [warm / 30, 0], time: warm, ids: IDS });
	}

	const timed = LOOKS.flatMap((look) =>
		[0, 1.3, 2.7].map((time) => {
			const started = performance.now();
			const scene = sceneOf(outfit, { look, time, ids: IDS });
			return { scene, ms: performance.now() - started };
		}),
	);
	const scenes = timed.map((one) => one.scene);
	const ms = timed.map((one) => one.ms).sort((x, y) => x - y)[Math.floor(timed.length / 2)] ?? 0;
	const parts = scenes.map((scene) => scene.behind.length + scene.hats.length + scene.ahead.length);
	const isSwayingSeen =
		sceneOf(outfit, { look: [0, 0], time: 0, ids: IDS })
			.ahead.map((one) => one.d)
			.join() !==
		sceneOf(outfit, { look: [0, 0], time: 1.1, ids: IDS })
			.ahead.map((one) => one.d)
			.join();
	return {
		outfit,
		ms,
		hasParts: Math.min(...parts) > 0,
		isSwayingSeen,
		isFinite: scenes.every((scene) => !JSON.stringify(scene).includes("NaN")),
	};
});
check(
	"bare Sumi wears nothing; every other outfit draws parts at every look",
	dressed.filter((one) => one.hasParts === (one.outfit === "bare")).map((one) => one.outfit),
	[],
);
check(
	"no outfit draws a NaN",
	dressed.filter((one) => !one.isFinite).map((one) => one.outfit),
	[],
);
check(
	"only the outfits declared swaying move with time",
	dressed.filter((one) => one.isSwayingSeen !== OUTFITS[one.outfit].isSwaying).map((one) => one.outfit),
	[],
);
check(
	"a frame of any outfit costs under a millisecond, by the median of fifteen",
	dressed.filter((one) => one.ms > 1).map((one) => `${one.outfit} ${one.ms.toFixed(3)}`),
	[],
);
console.log(`     scene cost per frame, ms: ${dressed.map((one) => `${one.outfit} ${one.ms.toFixed(3)}`).join(", ")}`);

const EYE_PATHS: Readonly<Record<MascotState, string>> = {
	idle: "M0 -9 Q0 0 0 9",
	listening: "M0 -9 Q0 0 0 9",
	thinking: "M0 -5 Q0 0 0 5",
	working: "M0 0.5 Q0 2 0 3.5",
	done: "M-4.5 3 Q0 -6 4.5 3",
	pleased: "M-4.5 3 Q0 -6 4.5 3",
	question: "M0 -1.5 Q0 0 0 1.5",
	error: "M0 -6 Q0 0.5 0 7",
	sleep: "M-4 3 Q0 6 4 3",
	surprised: "M0 -13 Q0 0 0 12",
};
const tokensOf = (path: string): string => (path.match(/-?[\d.]+|[A-Z]/g) ?? []).join(" ");

const bundle = await bundleOf("tools/mascot-page.tsx");
const sheet = readFileSync("apps/host-obsidian/styles.css", "utf8");
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

const EYES_BY_STATE = `Object.fromEntries([...document.querySelectorAll("[data-row]")].map((row) =>
	[row.dataset.row, getComputedStyle(row.querySelector(".wg-mascot-eye.is-left")).d]))`;
const LIVE = `(() => {
	const live = document.querySelector("#live .wg-mascot");
	const eye = live.querySelector(".wg-mascot-eye.is-left");
	const box = live.getBoundingClientRect();
	return {
		state: live.dataset.state,
		eye: getComputedStyle(eye).d,
		turn: eye.closest(".wg-mascot-turn").style.transform,
		breath: getComputedStyle(live.querySelector(".wg-mascot-breath")).animationName,
		morph: getComputedStyle(eye).transitionDuration,
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
	readonly turn: string;
	readonly breath: string;
	readonly morph: string;
	readonly centre: readonly [number, number];
}

const isLive = (value: unknown): value is Live => typeof value === "object" && value !== null && "turn" in value;

async function liveOf(page: AskedPage): Promise<Live> {
	const read = await page.ask(LIVE);
	if (!isLive(read)) {
		throw new Error(`the live mascot did not answer: ${JSON.stringify(read)}`);
	}

	return read;
}

async function turnsWhenPointedFrom(page: AskedPage, centre: readonly [number, number]): Promise<readonly string[]> {
	const turns: string[] = [];
	for (const dx of [-400, 400]) {
		for (let step = 0; step < 4; step += 1) {
			await page.hover(centre[0] + dx + step, centre[1] + step);
			await waited(60);
		}

		await waited(700);
		turns.push((await liveOf(page)).turn);
	}

	return turns;
}

const translateX = (transform: string): number =>
	Number(/matrix\((?:[-\d.]+, ){4}([-\d.]+)/.exec(transform)?.[1] ?? NaN);

const page = await paged(origin, "mascot", { size: [1300, 700] });
try {
	await waited(800);
	const eyes = await page.ask(EYES_BY_STATE);
	const shownEyes = typeof eyes === "object" && eyes !== null ? Object.entries(eyes) : [];
	check(
		"every state draws its own eye path",
		Object.fromEntries(
			Object.keys(EYE_PATHS).map((state) => [state, tokensOf(String(Object.fromEntries(shownEyes)[state]))]),
		),
		Object.fromEntries(Object.entries(EYE_PATHS).map(([state, d]) => [state, tokensOf(d)])),
	);
	const idle = await liveOf(page);
	check(
		"the live mascot starts idle, breathing, morphing",
		[idle.state, idle.breath, idle.morph.startsWith("0.5s")],
		["idle", "wg-mascot-breathe", true],
	);
	const [fromLeft = "", fromRight = ""] = await turnsWhenPointedFrom(page, idle.centre);
	check("its eyes follow the pointer", translateX(fromLeft) < translateX(fromRight) - 2, true);
	await page.ask(`window.__RECORD__(["sent"]); true`);
	await waited(300);
	check("a sent message: thinking", (await liveOf(page)).state, "thinking");
	await page.ask(`window.__RECORD__(["toolStarted"]); true`);
	await waited(800);
	const working = await liveOf(page);
	check(
		"a tool started: working, the eyes morphed",
		[working.state, tokensOf(working.eye)],
		["working", tokensOf(EYE_PATHS.working)],
	);
	await page.ask(`window.__RECORD__(["toolFinished", "runFinished"]); true`);
	await waited(300);
	check("the run finished: done", (await liveOf(page)).state, "done");
	const outfitParts = await page.ask(
		`Object.fromEntries([...document.querySelectorAll("[data-outfit-row]")].map((row) => [row.dataset.outfitRow, row.querySelectorAll("svg path").length]))`,
	);
	const partCounts = typeof outfitParts === "object" && outfitParts !== null ? Object.entries(outfitParts) : [];
	const bareParts = Number(Object.fromEntries(partCounts)["bare"]);
	check(
		"every outfit draws on the page, more than bare Sumi",
		partCounts.filter(([outfit, count]) => outfit !== "bare" && Number(count) <= bareParts).map(([outfit]) => outfit),
		[],
	);
	const themed = await page.ask(
		`(() => { const of = (root) => [getComputedStyle(root.querySelector(".wg-mascot-body-base")).stopColor, getComputedStyle(root.querySelector(".wg-mascot-eye")).stroke]; return [of(document.querySelector("[data-row=idle]")), of(document.querySelector("#dark"))]; })()`,
	);
	check("Sumi is black with white eyes, and white with black eyes in a dark theme", themed, [
		["rgb(23, 24, 27)", "rgb(255, 255, 255)"],
		["rgb(241, 241, 238)", "rgb(23, 24, 27)"],
	]);
	await page.ask(`location.hash = "quiet"; location.reload(); true`);
	await waited(1500);
	check("at rest, bare Sumi asks for no frames", await page.ask(FRAMES_IN_A_SECOND), 0);
	await page.ask(`window.__WEAR__("sprout"); true`);
	await waited(300);
	check("a swaying sprout keeps the frames coming", Number(await page.ask(FRAMES_IN_A_SECOND)) > 20, true);
	await page.ask(`location.hash = ""; true`);
	await page.reduceMotion();
	await page.ask(`location.reload(); true`);
	await waited(1000);
	const still = await liveOf(page);
	check("reduced motion: no breathing, no morph", [still.breath, still.morph], ["none", "0s"]);
	const [stillLeft, stillRight] = await turnsWhenPointedFrom(page, still.centre);
	check("reduced motion: the eyes stay ahead", stillLeft === stillRight && stillLeft !== "", true);
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the page drew without a failure", boom, "");
} finally {
	page.close();
	server.close();
}

console.log(failed === 0 ? "mascot: clean" : `mascot: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
