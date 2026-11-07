import type { ChatKey } from "../../shared/schema/chat-key.schema.js";
import type { FileDragEvent } from "../../shared/schema/file-drag.schema.js";
import { assistantPartsOn } from "../assistant-parts/assistant-parts.gateway.js";
import type { AssistantHosts, AssistantParts } from "../assistant-parts/assistant-parts.gateway.js";
import { hostForChat } from "../assistant-parts/host-for-chat.js";
import { ChatPartsGateway } from "./chat-parts.gateway.js";

type Hearing = (chat: ChatKey, parts: AssistantParts) => () => void;

export class LentChatPartsGateway extends ChatPartsGateway {
	private readonly built = new Map<ChatKey, AssistantParts>();
	private readonly hearings = new Map<Hearing, (() => void)[]>();

	constructor(private readonly host: AssistantHosts) {
		super();
	}

	partsOf(chat: ChatKey): AssistantParts {
		const held = this.built.get(chat);

		if (held !== undefined) {
			return held;
		}

		const parts = assistantPartsOn({ config: hostForChat(this.host, chat) });
		console.info(`[widgetarium] assistant chats ${this.built.size} → ${this.built.size + 1} (chat ${String(chat)})`);
		this.built.set(chat, parts);

		for (const [hearing, stops] of this.hearings) {
			stops.push(hearing(chat, parts));
		}

		return parts;
	}

	sessionChanged(listener: (chat: ChatKey) => void): () => void {
		return this.hear((chat, parts) => parts.assistantSession.sessionChanged(() => listener(chat)));
	}

	setupChanged(listener: () => void): () => void {
		return this.hear((_chat, parts) => parts.assistantSetup.setupChanged(listener));
	}

	claudeOptionsChanged(listener: () => void): () => void {
		return this.hear((_chat, parts) => parts.claudeOptions.claudeOptionsChanged(listener));
	}

	workingFolderChanged(listener: () => void): () => void {
		return this.hear((_chat, parts) => parts.workingFolders.workingFolderChanged(listener));
	}

	fileDragged(heard: (chat: ChatKey, drag: FileDragEvent) => void): () => void {
		return this.hear((chat, parts) => parts.fileDrop.fileDragged((drag) => heard(chat, drag)));
	}

	private hear(hearing: Hearing): () => void {
		this.hearings.set(
			hearing,
			[...this.built].map(([chat, parts]) => hearing(chat, parts)),
		);
		return () => {
			for (const stop of this.hearings.get(hearing) ?? []) {
				stop();
			}

			this.hearings.delete(hearing);
		};
	}
}
