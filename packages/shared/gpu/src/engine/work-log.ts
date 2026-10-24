export interface WorkSummary {
	readonly count: number;
	readonly meanMs: number;
	readonly p95Ms: number;
	readonly worstMs: number;
}

const KEPT_SAMPLES = 1200;

export class WorkLog {
	private samples: number[] = [];

	record(ms: number): void {
		this.samples.push(ms);
		if (this.samples.length > KEPT_SAMPLES) this.samples.splice(0, this.samples.length - KEPT_SAMPLES);
	}

	take(): WorkSummary {
		const summary = summaryOf(this.samples);
		this.samples = [];
		return summary;
	}
}

export function summaryOf(samples: readonly number[]): WorkSummary {
	if (samples.length === 0) return { count: 0, meanMs: 0, p95Ms: 0, worstMs: 0 };
	const sorted = [...samples].sort((a, b) => a - b);
	const round = (ms: number): number => Math.round(ms * 100) / 100;
	return {
		count: samples.length,
		meanMs: round(samples.reduce((sum, ms) => sum + ms, 0) / samples.length),
		p95Ms: round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0),
		worstMs: round(sorted[sorted.length - 1] ?? 0),
	};
}
