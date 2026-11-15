import { SIDEBAR_MEASURE_PREFIX } from "@widgetarium/studio";

interface TimeTotals {
	calls: number;
	ms: number;
	worstMs: number;
}

export interface SidebarTime {
	readonly name: string;
	readonly calls: number;
	readonly meanMs: number;
	readonly worstMs: number;
}

export class SidebarTimes {
	private readonly totalsByName = new Map<string, TimeTotals>();

	observe(): void {
		if (typeof PerformanceObserver !== "function") {
			return;
		}

		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				this.add(entry.name, entry.duration);
			}
		}).observe({ type: "measure" });
	}

	drain(): SidebarTime[] {
		const rows = [...this.totalsByName.entries()].map(([name, totals]) => ({
			name,
			calls: totals.calls,
			meanMs: roundToTenth(totals.ms / totals.calls),
			worstMs: roundToTenth(totals.worstMs),
		}));
		this.totalsByName.clear();
		return rows;
	}

	private add(measure: string, ms: number): void {
		if (!measure.startsWith(SIDEBAR_MEASURE_PREFIX)) {
			return;
		}

		const name = measure.slice(SIDEBAR_MEASURE_PREFIX.length);
		const totals = this.totalsByName.get(name) ?? { calls: 0, ms: 0, worstMs: 0 };
		this.totalsByName.set(name, {
			calls: totals.calls + 1,
			ms: totals.ms + ms,
			worstMs: Math.max(totals.worstMs, ms),
		});
	}
}

function roundToTenth(ms: number): number {
	return Math.round(ms * 10) / 10;
}
