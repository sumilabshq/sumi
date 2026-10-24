import type { ChatMarks } from "../../shared/schema/chat.schema.js";

export abstract class ChatMarksGateway {
	abstract chatMarks(): ChatMarks;
	abstract saveChatMarks(marks: ChatMarks, reason: string): void;
	abstract chatMarksChanged(listener: () => void): () => void;
}
