import type { Duration } from "./duration";

export interface RateLimit {
	readonly calls: number;
	readonly per: Duration;
}

export abstract class RateLimits {
	abstract take(key: string, limit: RateLimit): Promise<boolean>;
}

interface Window {
	readonly startedAt: number;
	readonly calls: number;
}

export class MemoryRateLimits extends RateLimits {
	private readonly windows = new Map<string, Window>();

	constructor(private readonly now: () => number = Date.now) {
		super();
	}

	override async take(key: string, { calls, per }: RateLimit): Promise<boolean> {
		const at = this.now();
		const known = this.windows.get(key);
		const window = known === undefined || at - known.startedAt >= per ? { startedAt: at, calls: 0 } : known;
		if (window.calls >= calls) return false;
		this.windows.set(key, { ...window, calls: window.calls + 1 });
		return true;
	}
}
