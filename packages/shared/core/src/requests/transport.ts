import type { Answer } from "./answer";
import type { Invalidation } from "./invalidation";
import type { RemoteCall } from "./remote-server";

export type HearChanges = (invalidated: readonly Invalidation[]) => void;

export interface RemoteTransport {
	call(call: RemoteCall): Promise<Answer<unknown>>;
	changes(hear: HearChanges): () => void;
}

export interface ServedCall {
	readonly name: string;
	readonly input: unknown;
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
}

export interface ServingServer {
	answer(call: ServedCall): Promise<Answer<unknown>>;
	changes(hear: HearChanges): () => void;
}

export interface ListeningTransport {
	serve(server: ServingServer): () => void;
}

export class ChangeBroadcast {
	private readonly hearers = new Set<HearChanges>();

	hear(hearer: HearChanges): () => void {
		this.hearers.add(hearer);
		return () => void this.hearers.delete(hearer);
	}

	tell(invalidated: readonly Invalidation[] | undefined): void {
		if (invalidated === undefined || invalidated.length === 0) {
			return;
		}

		for (const hearer of [...this.hearers]) {
			hearer(invalidated);
		}
	}
}
