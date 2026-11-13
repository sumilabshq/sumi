import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type {
	AssistantCall,
	AssistantPort,
	AssistantSession,
	CallFace,
	QueueChange,
} from "@widgetarium/core/engine/assistant-port.js";
import { AssistantSessionGateway } from "./assistant-session.gateway.js";

const QUEUE_NOT_HERE = "This host cannot queue messages while the agent works.";

export class PortAssistantSessionGateway extends AssistantSessionGateway {
	constructor(private readonly port: AssistantPort) {
		super();
	}

	isAvailable(): boolean {
		return this.port.can;
	}

	session(): AssistantSession {
		return this.port.session();
	}

	sessionChanged(listener: () => void): () => void {
		return this.port.onSession(listener);
	}

	cardsOf(session: AssistantSession): ChatCards {
		return this.port.cardsOf(session);
	}

	faceOf(call: AssistantCall): CallFace {
		return this.port.describeCall(call);
	}

	send(said: string): Promise<void> {
		return this.port.send(said);
	}

	changeQueue(change: QueueChange): string | null {
		if (this.port.changeQueue === undefined) {
			return QUEUE_NOT_HERE;
		}

		return this.port.changeQueue(change);
	}

	retry(): void {
		this.port.retry();
	}

	stop(): void {
		this.port.stop();
	}

	clear(): Promise<void> {
		return this.port.clear();
	}

	compact(): Promise<void> {
		return this.port.compact();
	}
}
