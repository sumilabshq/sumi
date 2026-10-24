import type { AccessAsk, AskOutcome } from "../../shared/schema/access-ask.schema.js";
import { AccessAsksGateway } from "./access-asks.gateway.js";

interface PendingAsk {
	readonly ask: AccessAsk;
	readonly answer: (outcome: AskOutcome) => void;
}

export class MemoryAccessAsksGateway extends AccessAsksGateway {
	private readonly listeners = new Set<() => void>();
	private pending: readonly PendingAsk[] = [];

	accessAsks(): readonly AccessAsk[] {
		return this.pending.map(({ ask }) => ask);
	}

	accessAsksChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	waitForAnswer(ask: AccessAsk): Promise<AskOutcome> {
		return new Promise((answer) => {
			this.keep([
				...this.pending,
				{
					ask,
					answer,
				},
			]);
		});
	}

	saveAnswer(id: string, outcome: AskOutcome): void {
		const answered = this.pending.find(({ ask }) => ask.id === id);

		if (answered === undefined) {
			return;
		}

		answered.answer(outcome);
		this.keep(this.pending.filter((pending) => pending !== answered));
	}

	private keep(pending: readonly PendingAsk[]): void {
		this.pending = pending;
		for (const changed of [...this.listeners]) {
			changed();
		}
	}
}
