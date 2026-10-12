import type { CommandAnswer } from "../gateway/run-handler";

export abstract class DoneKeys {
	abstract once(key: string, run: () => Promise<CommandAnswer<unknown>>): Promise<CommandAnswer<unknown>>;
}

const ANSWERS_KEPT = 1000;

export class MemoryDoneKeys extends DoneKeys {
	private readonly answers = new Map<string, Promise<CommandAnswer<unknown>>>();

	// TRADE-OFF: a count cap, not Stripe's 24h TTL: memory needs a bound, retries come within the last few calls.
	constructor(private readonly kept: number = ANSWERS_KEPT) {
		super();
	}

	once(key: string, run: () => Promise<CommandAnswer<unknown>>): Promise<CommandAnswer<unknown>> {
		const known = this.answers.get(key);
		if (known !== undefined) return known;
		const answer = run().then((settled) => {
			if (!settled.ok && !settled.ran && this.answers.get(key) === answer) this.answers.delete(key);
			return settled;
		});
		this.answers.set(key, answer);
		this.forgetOldest();
		return answer;
	}

	private forgetOldest(): void {
		for (const oldest of this.answers.keys()) {
			if (this.answers.size <= this.kept) return;
			this.answers.delete(oldest);
		}
	}
}
