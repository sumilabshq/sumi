import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";

export abstract class AssistantSessionGateway {
	abstract isAvailable(): boolean;
	abstract session(): AssistantSession;
	abstract sessionChanged(listener: () => void): () => void;
	abstract cardsOf(session: AssistantSession): ChatCards;
	abstract faceOf(call: AssistantCall): CallFace;
	abstract send(said: string): Promise<void>;
	abstract retry(): void;
	abstract stop(): void;
	abstract clear(): Promise<void>;
	abstract compact(): Promise<void>;
}
