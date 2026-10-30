export const UNLOAD_AFTER_MS = 30 * 60 * 1000;
export const LIVE_PAGES_AT_MOST = 8;
export const ASK_KEPT_AGAIN_AFTER_MS = 60 * 1000;

const CHECK_EVERY_MS = 10 * 1000;
const MINUTE_MS = 60 * 1000;

export interface PageUnloaderHold {
	readonly livePages: () => readonly string[];
	readonly isShownAnywhere: (tabId: string) => boolean;
	readonly refuseUnload: (tabId: string) => Promise<string | null>;
	readonly unload: (tabId: string) => boolean;
	readonly now: () => number;
}

interface Kept {
	readonly reason: string;
	readonly at: number;
}

export class PageUnloader {
	private readonly lastShownAt = new Map<string, number>();
	private readonly kept = new Map<string, Kept>();
	private isUnloading = false;

	constructor(private readonly hold: PageUnloaderHold) {}

	start(): void {
		setInterval(() => void this.unloadDuePages(), CHECK_EVERY_MS);
	}

	async unloadDuePages(): Promise<void> {
		if (this.isUnloading) {
			return;
		}

		this.isUnloading = true;

		try {
			await this.unloadDueOnce();
		} finally {
			this.isUnloading = false;
		}
	}

	private async unloadDueOnce(): Promise<void> {
		const now = this.hold.now();
		const live = this.hold.livePages();
		this.trackShownTimes(live, now);
		let liveCount = live.length;

		for (const tabId of this.hiddenOldestFirst(live)) {
			const hiddenMs = now - (this.lastShownAt.get(tabId) ?? now);

			if (hiddenMs < UNLOAD_AFTER_MS && liveCount <= LIVE_PAGES_AT_MOST) {
				return;
			}

			if (await this.unloadUnlessKept(tabId, unloadReasonOf(hiddenMs, liveCount), now)) {
				liveCount -= 1;
			}
		}
	}

	private async unloadUnlessKept(tabId: string, reason: string, now: number): Promise<boolean> {
		if (this.isKeptRecently(tabId, now)) {
			return false;
		}

		const refusal = await this.hold.refuseUnload(tabId);

		if (refusal !== null) {
			this.keep(tabId, reason, {
				reason: refusal,
				at: now,
			});
			return false;
		}

		return this.unloadNow(tabId, reason);
	}

	private unloadNow(tabId: string, reason: string): boolean {
		if (!this.hold.unload(tabId)) {
			return false;
		}

		this.lastShownAt.delete(tabId);
		this.kept.delete(tabId);
		console.info(`[widgetarium] browser page ${tabId} live → unloaded (${reason})`);
		return true;
	}

	private isKeptRecently(tabId: string, now: number): boolean {
		const wasKept = this.kept.get(tabId);
		return wasKept !== undefined && now - wasKept.at < ASK_KEPT_AGAIN_AFTER_MS;
	}

	private keep(tabId: string, unloadReason: string, kept: Kept): void {
		const wasReason = this.kept.get(tabId)?.reason;
		this.kept.set(tabId, kept);

		if (wasReason !== kept.reason) {
			console.info(`[widgetarium] browser page ${tabId} live → live (${unloadReason}; kept: ${kept.reason})`);
		}
	}

	private trackShownTimes(live: readonly string[], now: number): void {
		for (const tabId of [...this.lastShownAt.keys()].filter((known) => !live.includes(known))) {
			this.lastShownAt.delete(tabId);
			this.kept.delete(tabId);
		}

		for (const tabId of live) {
			if (this.hold.isShownAnywhere(tabId) || !this.lastShownAt.has(tabId)) {
				this.lastShownAt.set(tabId, now);
			}
		}
	}

	private hiddenOldestFirst(live: readonly string[]): readonly string[] {
		return live
			.filter((tabId) => !this.hold.isShownAnywhere(tabId))
			.sort((one, other) => (this.lastShownAt.get(one) ?? 0) - (this.lastShownAt.get(other) ?? 0));
	}
}

function unloadReasonOf(hiddenMs: number, liveCount: number): string {
	return `hidden ${Math.round(hiddenMs / MINUTE_MS)} min, ${liveCount} live, at most ${LIVE_PAGES_AT_MOST}`;
}
