import { ChatDraftsGateway } from "../../../gateways/chat-drafts/chat-drafts.gateway.js";
import type { ChatDraft } from "../../../gateways/chat-drafts/chat-drafts.gateway.js";
import { DraftAttachmentsGateway } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import { FileDragGateway } from "../../../gateways/file-drag/file-drag.gateway.js";
import type { FileDragState } from "../../../gateways/file-drag/file-drag.gateway.js";
import { isSameDrafts, namesOf } from "./drafts.js";
import { fileDragOf, isSameFileDrag } from "./file-drag.js";

export function saveDrafts(
	draftAttachments: DraftAttachmentsGateway,
	next: readonly DraftAttachment[],
	reason: string,
): void {
	const was = draftAttachments.draftAttachments();

	if (isSameDrafts(was, next)) {
		return;
	}

	draftAttachments.saveDraftAttachments(next);
	console.debug(`[widgetarium] draft attachments ${namesOf(was)} → ${namesOf(next)} (${reason})`);
}

export function holdChatDraft(chatDrafts: ChatDraftsGateway, chatId: string, next: ChatDraft): void {
	const was = chatDrafts.chatDraft(chatId);
	chatDrafts.saveChatDraft(chatId, next);
	console.debug(`[widgetarium] chat ${chatId} draft ${draftSaid(was)} → ${draftSaid(next)}`);
}

export function saveFileDrag(fileDrag: FileDragGateway, next: FileDragState, reason: string): void {
	const was = fileDragOf(fileDrag.fileDrag());
	fileDrag.saveFileDrag(next);
	const now = fileDragOf(next);

	if (isSameFileDrag(was, now)) {
		return;
	}

	console.debug(`[widgetarium] file drag ${JSON.stringify(was)} → ${JSON.stringify(now)} (${reason})`);
}

function draftSaid(draft: ChatDraft | null): string {
	return draft === null ? "none" : `${JSON.stringify(draft.said)} + ${String(draft.attachments.length)} files`;
}
