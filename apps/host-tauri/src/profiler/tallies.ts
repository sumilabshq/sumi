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
	readonly #held = new Map<string, Tally>();

	add(name: string, ms: number): void {
		const held = this.#held.get(name);
		if (held === undefined) {
			this.#held.set(name, {
				calls: 1,
				ms,
				worstMs: ms,
			});
			return;
		}

		held.calls += 1;
		held.ms += ms;
		held.worstMs = Math.max(held.worstMs, ms);
	}

	callsSoFar(): number {
		let calls = 0;
		for (const held of this.#held.values()) {
			calls += held.calls;
		}

		return calls;
	}

	drain(top: number): TallyRow[] {
		const rows = [...this.#held.entries()].map(([name, held]) => ({
			name,
			calls: held.calls,
			ms: Math.round(held.ms),
			worstMs: Math.round(held.worstMs),
		}));
		this.#held.clear();
		return rows.sort((one, other) => other.ms - one.ms || other.calls - one.calls).slice(0, top);
	}
}
