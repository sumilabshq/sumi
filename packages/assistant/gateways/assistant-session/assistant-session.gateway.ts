import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";

export abstract class AssistantSessionGateway {
	abstract isAvailable(): boolean;
	abstract session(): AssistantSession;
	abstract watch(changed: () => void): () => void;
	abstract cardsOf(session: AssistantSession): ChatCards;
	abstract describeCall(call: AssistantCall): CallFace;
	abstract send(said: string): Promise<void>;
	abstract retry(): void;
	abstract stop(): void;
	abstract clear(): Promise<void>;
}
