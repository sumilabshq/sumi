import type { ChatMarks } from "../../shared/schema/chat.schema.js";
import { ChatMarksGateway } from "./chat-marks.gateway.js";

export class MemoryChatMarksGateway extends ChatMarksGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: ChatMarks = {}) {
		super();
	}

	chatMarks(): ChatMarks {
		return this.held;
	}

	saveChatMarks(marks: ChatMarks): void {
		this.held = marks;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	chatMarksChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
