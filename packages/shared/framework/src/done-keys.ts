import type { Answer } from "./answer";

export type Claim = { readonly isFirst: true } | { readonly isFirst: false; readonly answer: Promise<Answer<unknown>> };

// TODO: a durable DoneKeys contract: a pending claim with an expiry, so a crashed run frees its key.
export abstract class DoneKeys {
	abstract claim(key: string): Promise<Claim>;
	abstract settle(key: string, answer: Answer<unknown>): Promise<void>;
	abstract release(key: string, answer: Answer<unknown>): Promise<void>;
}

interface Held {
	readonly answer: Promise<Answer<unknown>>;
	readonly settle: (answer: Answer<unknown>) => void;
	isSettled: boolean;
}

const ANSWERS_KEPT = 1000;

export class MemoryDoneKeys extends DoneKeys {
	private readonly held = new Map<string, Held>();

	// TRADE-OFF: a count cap, not Stripe's 24h TTL: memory needs a bound, retries come within the last few calls.
	constructor(private readonly kept: number = ANSWERS_KEPT) {
		super();
	}

	override async claim(key: string): Promise<Claim> {
		const known = this.held.get(key);
		if (known !== undefined) return { isFirst: false, answer: known.answer };
		this.held.set(key, heldAnswer());
		this.forgetOldestSettled();
		return { isFirst: true };
	}

	override async settle(key: string, answer: Answer<unknown>): Promise<void> {
		this.held.get(key)?.settle(answer);
	}

	override async release(key: string, answer: Answer<unknown>): Promise<void> {
		this.held.get(key)?.settle(answer);
		this.held.delete(key);
	}

	private forgetOldestSettled(): void {
		for (const [key, held] of this.held) {
			if (this.held.size <= this.kept) return;
			if (held.isSettled) this.held.delete(key);
		}
	}
}

function heldAnswer(): Held {
	const settled: { settle: (answer: Answer<unknown>) => void } = { settle: () => undefined };
	const answer = new Promise<Answer<unknown>>((resolve) => {
		settled.settle = resolve;
	});
	const held: Held = {
		answer,
		isSettled: false,
		settle: (given) => {
			held.isSettled = true;
			settled.settle(given);
		},
	};
	return held;
}
