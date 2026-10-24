import type { AccessAsk, AskOutcome } from "../../shared/schema/access-ask.schema.js";

export abstract class AccessAsksGateway {
	abstract accessAsks(): readonly AccessAsk[];
	abstract accessAsksChanged(listener: () => void): () => void;
	abstract waitForAnswer(ask: AccessAsk): Promise<AskOutcome>;
	abstract saveAnswer(id: string, outcome: AskOutcome): void;
}
