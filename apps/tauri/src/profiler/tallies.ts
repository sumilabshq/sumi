interface Tally {
	calls: number;
	ms: number;
	worstMs: number;
}

export interface TallyRow {
	readonly name: string;
	readonly calls: number;
	readonly ms: number;
	readonly worstMs: number;
}

export class Tallies {
	private readonly tallyByName = new Map<string, Tally>();

	add(name: string, ms: number): void {
		const tally = this.tallyByName.get(name);
		if (tally === undefined) {
			this.tallyByName.set(name, {
				calls: 1,
				ms,
				worstMs: ms,
			});
			return;
		}

		tally.calls += 1;
		tally.ms += ms;
		tally.worstMs = Math.max(tally.worstMs, ms);
	}

	totalCalls(): number {
		let calls = 0;
		for (const tally of this.tallyByName.values()) {
			calls += tally.calls;
		}

		return calls;
	}

	drain(rowLimit: number): TallyRow[] {
		const rows = [...this.tallyByName.entries()].map(([name, tally]) => ({
			name,
			calls: tally.calls,
			ms: Math.round(tally.ms),
			worstMs: Math.round(tally.worstMs),
		}));
		this.tallyByName.clear();
		return rows.sort((one, other) => other.ms - one.ms || other.calls - one.calls).slice(0, rowLimit);
	}
}
