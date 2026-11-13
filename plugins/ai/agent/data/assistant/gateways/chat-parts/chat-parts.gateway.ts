import type { ChatKey } from "../../shared/schema/chat-key.schema.js";
import type { FileDragEvent } from "../../shared/schema/file-drag.schema.js";
import type { AssistantParts } from "../assistant-parts/assistant-parts.gateway.js";

export abstract class ChatPartsGateway {
	abstract partsOf(chat: ChatKey): AssistantParts;
	abstract sessionChanged(listener: (chat: ChatKey) => void): () => void;
	abstract setupChanged(listener: () => void): () => void;
	abstract claudeOptionsChanged(listener: () => void): () => void;
	abstract workingFolderChanged(listener: () => void): () => void;
	abstract fileDragged(heard: (chat: ChatKey, drag: FileDragEvent) => void): () => void;
}
