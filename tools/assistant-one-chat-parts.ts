import type { AssistantParts } from "../plugins/ai/agent/data/assistant/gateways/assistant-parts/assistant-parts.gateway.ts";
import type { AssistantModuleParts } from "../plugins/ai/agent/data/assistant/gateways/assistant-parts/chat-parts-on.ts";
import { AddedRunnersGateway } from "../plugins/ai/agent/data/assistant/gateways/runners/added.gateway.ts";
import { ServedToolLabelsGateway } from "../plugins/ai/agent/data/assistant/gateways/tool-labels/served.gateway.ts";
import { CLAUDE_CODE_RUNNER } from "../plugins/ai/claude-code/src/features/claude-code/lib/claude-code-runner.ts";
import { ChatPartsGateway } from "../plugins/ai/agent/data/assistant/gateways/chat-parts/chat-parts.gateway.ts";
import type { ChatKey } from "../plugins/ai/agent/data/assistant/shared/schema/chat-key.schema.ts";
import type { FileDragEvent } from "../plugins/ai/agent/data/assistant/shared/schema/file-drag.schema.ts";

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

export function oneChatParts(parts: AssistantParts): AssistantModuleParts {
	return {
		chatParts: new OneChatPartsGateway(parts),
		runners: new AddedRunnersGateway([CLAUDE_CODE_RUNNER]),
		toolLabels: new ServedToolLabelsGateway([]),
	};
}
