const RINGS_AT_MOST_EVERY_MS = 100;

export class ChangeBell {
	private readonly listeners = new Set<() => void>();
	private rungAt = Number.NEGATIVE_INFINITY;
	private isRingingSoon = false;

	listen(heard: () => void): () => void {
		this.listeners.add(heard);
		return () => this.listeners.delete(heard);
	}

	ring(): void {
		if (this.isRingingSoon) {
			return;
		}

		const sinceRungMs = performance.now() - this.rungAt;
		if (sinceRungMs >= RINGS_AT_MOST_EVERY_MS) {
			this.ringNow();
			return;
		}

		this.isRingingSoon = true;
		setTimeout(() => {
			this.isRingingSoon = false;
			this.ringNow();
		}, RINGS_AT_MOST_EVERY_MS - sinceRungMs);
	}

	private ringNow(): void {
		this.rungAt = performance.now();
		for (const heard of this.listeners) {
			heard();
		}
	}
}
