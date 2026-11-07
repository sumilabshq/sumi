import type { AssistantParts } from "../plugins/chat/data/assistant/gateways/assistant-parts/assistant-parts.gateway.ts";
import { ChatPartsGateway } from "../plugins/chat/data/assistant/gateways/chat-parts/chat-parts.gateway.ts";
import type { ChatKey } from "../plugins/chat/data/assistant/shared/schema/chat-key.schema.ts";
import type { FileDragEvent } from "../plugins/chat/data/assistant/shared/schema/file-drag.schema.ts";

export class OneChatPartsGateway extends ChatPartsGateway {
	constructor(private readonly parts: AssistantParts) {
		super();
	}

	partsOf(): AssistantParts {
		return this.parts;
	}

	sessionChanged(listener: (chat: ChatKey) => void): () => void {
		return this.parts.assistantSession.sessionChanged(() => listener(null));
	}

	setupChanged(listener: () => void): () => void {
		return this.parts.assistantSetup.setupChanged(listener);
	}

	claudeOptionsChanged(listener: () => void): () => void {
		return this.parts.claudeOptions.claudeOptionsChanged(listener);
	}

	workingFolderChanged(listener: () => void): () => void {
		return this.parts.workingFolders.workingFolderChanged(listener);
	}

	fileDragged(heard: (chat: ChatKey, drag: FileDragEvent) => void): () => void {
		return this.parts.fileDrop.fileDragged((drag) => heard(null, drag));
	}
}

export function oneChatParts(parts: AssistantParts): { readonly chatParts: ChatPartsGateway } {
	return {
		chatParts: new OneChatPartsGateway(parts),
	};
}
