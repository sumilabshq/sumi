import { runBenchIfFresh } from "./bench-run.js";
import type { BenchPlan } from "./bench-run.js";

declare global {
	interface ImportMeta {
		readonly hot?: { accept(): void };
	}
}

export const BENCH_PLAN: BenchPlan = {
	name: "idle",
	at: "2000-01-01T00:00:00Z",
	steps: [],
};

runBenchIfFresh(BENCH_PLAN);
import.meta.hot?.accept();
