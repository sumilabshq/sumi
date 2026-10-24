const REPORT_EVERY_MS = 50;
const WINDOW_MS = 250;
const MS_PER_SECOND = 1000;

export class FrameRate {
	private finishedAt: number[] = [];
	private latest: number | null = null;
	private reportedAt = -Infinity;
	private readonly listeners = new Set<() => void>();
	private readonly drivers = new Set<() => void>();

	readonly perSecond = (): number | null => this.latest;

	readonly watch = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		this.toldDrivers();
		return () => {
			this.listeners.delete(listener);
			this.toldDrivers();
		};
	};

	isWatched(): boolean {
		return this.listeners.size > 0;
	}

	drive(watchedChanged: () => void): () => void {
		this.drivers.add(watchedChanged);
		return () => void this.drivers.delete(watchedChanged);
	}

	finished(at: number): void {
		this.finishedAt = [...this.finishedAt.filter((stamp) => at - stamp <= WINDOW_MS), at];
		if (at - this.reportedAt < REPORT_EVERY_MS) {
			return;
		}

		this.reportedAt = at;
		this.report(rateOf(this.finishedAt));
	}

	stopped(): void {
		this.finishedAt = [];
	}

	private toldDrivers(): void {
		for (const driver of this.drivers) {
			driver();
		}
	}

	private report(rate: number | null): void {
		if (rate === null || rate === this.latest) {
			return;
		}

		this.latest = rate;
		for (const listener of this.listeners) {
			listener();
		}
	}
}

function rateOf(stamps: readonly number[]): number | null {
	const first = stamps[0];
	const last = stamps.at(-1);
	if (first === undefined || last === undefined || last === first) {
		return null;
	}

	return Math.round((MS_PER_SECOND * (stamps.length - 1)) / (last - first));
}
