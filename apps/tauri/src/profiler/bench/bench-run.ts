import { STUDIO_MARK } from "../../studio-log.js";

export type BenchStep =
	| { readonly kind: "toggle"; readonly times: number; readonly gapMs: number }
	| { readonly kind: "click"; readonly text: string }
	| { readonly kind: "css"; readonly text: string }
	| { readonly kind: "wait"; readonly ms: number }
	| { readonly kind: "probe"; readonly times: number }
	| { readonly kind: "probe-state"; readonly times: number }
	| { readonly kind: "probe-touch"; readonly times: number; readonly selector: string };

export interface BenchPlan {
	readonly name: string;
	readonly at: string;
	readonly steps: readonly BenchStep[];
}

interface FrameSample {
	readonly animationFps: number | null;
	readonly frames: number;
	readonly fps: number;
	readonly janks: number;
	readonly blockedMs: number;
	readonly worstMs: number;
	readonly worstGaps: readonly number[];
}

const FRESH_FOR_MS = 120_000;
const ANIMATION_WINDOW_MS = 300;
const FRAME_BUDGET_MS = 1000 / 60;
const SLOW_FRAME_MS = 34;
const WORST_GAPS_SHOWN = 6;
const BENCH_CSS_ID = "wg-bench-css";
const BENCH_RAN_KEY = "__wgBenchRan";
const SIDEBAR_SELECTOR = ".wg-shell-left";
const PROBE_WIDTHS = ["300px", "360px"] as const;
const TOGGLE_SELECTOR = '[data-side-toggle="left"]';
const CLICKABLE = "button, a, [role='button'], [role='tab'], [role='treeitem'], [role='option'], [data-tab-id]";

export function runBenchIfFresh(plan: BenchPlan): void {
	if (Math.abs(Date.now() - Date.parse(plan.at)) > FRESH_FOR_MS) {
		return;
	}

	if (document.querySelector(TOGGLE_SELECTOR) === null || Reflect.get(window, BENCH_RAN_KEY) === plan.at) {
		return;
	}

	Reflect.set(window, BENCH_RAN_KEY, plan.at);
	void runBench(plan);
}

async function runBench(plan: BenchPlan): Promise<void> {
	say({ plan: plan.name, phase: "start" });

	for (const [index, step] of plan.steps.entries()) {
		const sample = await measured(() => runStep(step));
		say({
			plan: plan.name,
			index,
			step,
			nodes: document.getElementsByTagName("*").length,
			sections: document.querySelectorAll("[data-path]").length,
			...sample,
		});
	}

	say({ plan: plan.name, phase: "end" });
}

async function runStep(step: BenchStep): Promise<readonly number[]> {
	if (step.kind === "wait") {
		await pause(step.ms);
		return [];
	}

	if (step.kind === "probe") {
		say(probed(step.times));
		return [];
	}

	if (step.kind === "probe-touch") {
		say(touchProbed(step.times, step.selector));
		return [];
	}

	if (step.kind === "probe-state") {
		say(stateProbed(step.times));
		return [];
	}

	if (step.kind === "css") {
		benchStyle().textContent = step.text;
		await pause(500);
		return [];
	}

	if (step.kind === "click") {
		pressed(step.text);
		await pause(1500);
		return [];
	}

	const toggledAt: number[] = [];

	for (let turn = 0; turn < step.times; turn += 1) {
		toggledAt.push(performance.now());
		document.querySelector<HTMLElement>(TOGGLE_SELECTOR)?.click();
		await pause(step.gapMs);
	}

	return toggledAt;
}

async function measured(run: () => Promise<readonly number[]>): Promise<FrameSample> {
	const frameTimes: number[] = [];
	let isRunning = true;
	const tick = (now: number): void => {
		frameTimes.push(now);

		if (isRunning) {
			requestAnimationFrame(tick);
		}
	};
	const startedAt = performance.now();
	frameTimes.push(startedAt);
	requestAnimationFrame(tick);
	const toggledAt = await run();
	isRunning = false;
	return sampleOf(frameTimes, toggledAt, performance.now() - startedAt);
}

function sampleOf(frameTimes: readonly number[], toggledAt: readonly number[], durationMs: number): FrameSample {
	const gaps = frameTimes.slice(1).map((at, index) => at - (frameTimes[index] ?? at));
	const slow = gaps.filter((gap) => gap >= SLOW_FRAME_MS);
	const animated = toggledAt.flatMap((at) => frameTimes.filter((frame) => frame > at && frame <= at + ANIMATION_WINDOW_MS));
	return {
		animationFps: toggledAt.length === 0 ? null : Math.round((animated.length * 1000) / (toggledAt.length * ANIMATION_WINDOW_MS)),
		frames: gaps.length,
		fps: Math.round((gaps.length * 1000) / durationMs),
		janks: slow.length,
		blockedMs: Math.round(slow.reduce((sum, gap) => sum + gap - FRAME_BUDGET_MS, 0)),
		worstMs: Math.round(Math.max(0, ...gaps)),
		worstGaps: [...slow]
			.sort((a, b) => b - a)
			.slice(0, WORST_GAPS_SHOWN)
			.map(Math.round),
	};
}

function probed(times: number): Readonly<Record<string, unknown>> {
	const side = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR);

	if (side === null) {
		return { probe: "no sidebar" };
	}

	const kept = side.style.cssText;
	const spent = { styleMs: 0, layoutMs: 0, attributeStyleMs: 0 };

	for (let turn = 0; turn < times; turn += 1) {
		side.style.transition = "none";
		side.style.width = turn % 2 === 0 ? PROBE_WIDTHS[0] : PROBE_WIDTHS[1];
		const before = performance.now();
		void getComputedStyle(document.body).color;
		const styled = performance.now();
		void document.body.offsetHeight;
		const laid = performance.now();
		side.dataset["probe"] = String(turn);
		void getComputedStyle(document.body).color;
		spent.styleMs += styled - before;
		spent.layoutMs += laid - styled;
		spent.attributeStyleMs += performance.now() - laid;
	}

	side.style.cssText = kept;
	delete side.dataset["probe"];
	return {
		probe: times,
		styleMs: perTurn(spent.styleMs, times),
		layoutMs: perTurn(spent.layoutMs, times),
		attributeStyleMs: perTurn(spent.attributeStyleMs, times),
	};
}

function touchProbed(times: number, selector: string): Readonly<Record<string, unknown>> {
	const place = document.querySelector<HTMLElement>(selector);

	if (place === null) {
		return { touchProbe: selector, missing: true };
	}

	let layoutMs = 0;

	for (let turn = 0; turn < times; turn += 1) {
		const touch = document.createElement("span");
		touch.textContent = String(turn);
		place.append(touch);
		void getComputedStyle(document.body).color;
		const before = performance.now();
		void document.body.offsetHeight;
		layoutMs += performance.now() - before;
		touch.remove();
		void document.body.offsetHeight;
	}

	return { touchProbe: selector, layoutMs: perTurn(layoutMs, times) };
}

function stateProbed(times: number): Readonly<Record<string, unknown>> {
	const side = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR);

	if (side === null) {
		return { probe: "no sidebar" };
	}

	const kept = side.dataset["state"];
	const spent = { styleMs: 0, layoutMs: 0 };

	for (let turn = 0; turn < times; turn += 1) {
		side.dataset["state"] = turn % 2 === 0 ? "hidden" : "docked";
		const before = performance.now();
		void getComputedStyle(document.body).color;
		const styled = performance.now();
		void document.body.offsetHeight;
		spent.styleMs += styled - before;
		spent.layoutMs += performance.now() - styled;
	}

	side.dataset["state"] = kept ?? "docked";
	return {
		stateProbe: times,
		styleMs: perTurn(spent.styleMs, times),
		layoutMs: perTurn(spent.layoutMs, times),
	};
}

function perTurn(totalMs: number, times: number): number {
	return Math.round((totalMs / times) * 10) / 10;
}

function pressed(text: string): void {
	const target = [...document.querySelectorAll<HTMLElement>("body *")].find(
		(element) => element.childElementCount === 0 && element.textContent?.trim() === text,
	);
	const clickable = target?.closest<HTMLElement>(CLICKABLE) ?? target;

	if (clickable === undefined) {
		say({ missing: text });
		return;
	}

	for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
		clickable.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, isPrimary: true }));
	}

	clickable.click();
}

function benchStyle(): HTMLStyleElement {
	const held = document.getElementById(BENCH_CSS_ID);

	if (held instanceof HTMLStyleElement) {
		return held;
	}

	const made = document.createElement("style");
	made.id = BENCH_CSS_ID;
	document.head.append(made);
	return made;
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function say(fields: Readonly<Record<string, unknown>>): void {
	console.info(`${STUDIO_MARK} bench ${JSON.stringify(fields)}`);
}
