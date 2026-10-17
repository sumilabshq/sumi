import type { AccessAsk, AskAnswer } from "../schema/access-ask.schema.js";

export type AskOutcome = AskAnswer | "unanswered";

interface PendingAsk {
	readonly ask: AccessAsk;
	readonly settle: (outcome: AskOutcome) => void;
}

export abstract class BrowserAsksStore {
	abstract asks(): readonly AccessAsk[];
	abstract watch(changed: () => void): () => void;
	abstract ask(ask: AccessAsk): Promise<AskOutcome>;
	abstract settle(id: string, outcome: AskOutcome): boolean;
}

export class MemoryBrowserAsksStore extends BrowserAsksStore {
	private readonly watchers = new Set<() => void>();
	private pending: readonly PendingAsk[] = [];

	override asks(): readonly AccessAsk[] {
		return this.pending.map(({ ask }) => ask);
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override ask(ask: AccessAsk): Promise<AskOutcome> {
		return new Promise((settle) => {
			const pending = {
				ask,
				settle,
			};
			this.write([...this.pending, pending], `asked about ${ask.siteKey}`);
		});
	}

	override settle(id: string, outcome: AskOutcome): boolean {
		const found = this.pending.find(({ ask }) => ask.id === id);

		if (!found) {
			return false;
		}

		found.settle(outcome);
		this.write(
			this.pending.filter((pending) => pending !== found),
			`${outcome} for ${found.ask.siteKey}`,
		);
		return true;
	}

	private write(next: readonly PendingAsk[], reason: string): void {
		if (next.length === this.pending.length && next.every((pending, at) => pending === this.pending[at])) {
			return;
		}

		const was = idsOf(this.pending);
		this.pending = next;
		console.debug(`[widgetarium] browser asks ${was} → ${idsOf(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function idsOf(pending: readonly PendingAsk[]): string {
	return JSON.stringify(pending.map(({ ask }) => ask.id));
}
