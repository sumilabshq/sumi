import type { ChatDraftsGateway } from "../../../gateways/chat-drafts/chat-drafts.gateway.js";
import type { DraftAttachmentsGateway } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { AdoptedDraft } from "../../../shared/schema/attachment.schema.js";
import { holdChatDraft, saveDrafts } from "./held-drafts.js";

export interface AdoptingParts {
	readonly chatDrafts: ChatDraftsGateway;
	readonly draftAttachments: DraftAttachmentsGateway;
}

const ADOPTED = "a new chat took a draft";

export function adoptUnsent(
	{ chatDrafts, draftAttachments }: AdoptingParts,
	{ chatId, said, attachments }: AdoptedDraft,
): { readonly said: string } {
	if (chatDrafts.openChat() !== chatId) {
		holdChatDraft(chatDrafts, chatId, {
			said,
			attachments: [...(chatDrafts.chatDraft(chatId)?.attachments ?? []), ...attachments],
		});
		return { said: "" };
	}

	saveDrafts(draftAttachments, [...draftAttachments.draftAttachments(), ...attachments], ADOPTED);
	return { said };
}
