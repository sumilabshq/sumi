import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import {
	RuntimeProvider,
	Slot,
	runtime,
	clientModule,
	handler,
	query,
	useQuery,
} from "../packages/shared/data-framework/src/index.ts";
import type { AnyQuery } from "../packages/shared/data-framework/src/index.ts";

const RUNS = 12;
const READY_FRAMES_SEEN = 2;
const FRAMES_AT_MOST = 300;
const ASYNC_DELAY_MS = 20;
const RunSchema = z.object({ run: z.number() });

const SettledNowQuery = query("probe/settled-now").settlesNow().input(RunSchema).output(z.number());
const AsyncQuery = query("probe/async").input(RunSchema).output(z.number());

const ProbeClientModule = clientModule("probe");
const SettledNowQueryHandler = handler(SettledNowQuery, ProbeClientModule).handle(({ run }) => run);
const AsyncQueryHandler = handler(AsyncQuery, ProbeClientModule).handle(
	({ run }) => new Promise<number>((settled) => setTimeout(() => settled(run), ASYNC_DELAY_MS)),
);
const started = runtime()
	.modules(ProbeClientModule.handlers([SettledNowQueryHandler, AsyncQueryHandler]))
	.start();

function Probe({ asked, run }: { readonly asked: AnyQuery; readonly run: number }): ReactElement {
	const { data } = useQuery(asked, { run });
	return h("div", { "data-state": "ready" }, String(data));
}

function framesOf(asked: AnyQuery, run: number): Promise<string[]> {
	const node = document.body.appendChild(document.createElement("div"));
	const states: string[] = [];
	return new Promise((settled) => {
		const tick = (): void => {
			states.push(node.querySelector("[data-state]")?.getAttribute("data-state") ?? "absent");
			if (isSampledEnough(states)) return settled(states);
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(() => {
			mountProbe(node, asked, run);
			requestAnimationFrame(tick);
		});
	});
}

function isSampledEnough(states: readonly string[]): boolean {
	return states.filter((state) => state === "ready").length >= READY_FRAMES_SEEN || states.length > FRAMES_AT_MOST;
}

function mountProbe(node: HTMLElement, asked: AnyQuery, run: number): void {
	const loading = h("div", { "data-state": "loading" });
	createRoot(node).render(h(RuntimeProvider, { runtime: started }, h(Slot, { loading }, h(Probe, { asked, run }))));
}

async function loadingFramesOf(asked: AnyQuery): Promise<number[]> {
	const counts: number[] = [];
	for (let run = 0; run < RUNS; run += 1)
		counts.push((await framesOf(asked, run)).filter((state) => state === "loading").length);
	return counts;
}

async function measured(): Promise<void> {
	const report = document.getElementById("wg-measure");
	try {
		const settledNow = await loadingFramesOf(SettledNowQuery);
		const asynchronous = await loadingFramesOf(AsyncQuery);
		if (report) report.textContent = JSON.stringify({ settledNow, asynchronous });
	} catch (failure) {
		if (report) report.textContent = JSON.stringify({ failure: String(failure) });
	}
}

void measured();
