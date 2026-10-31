import { refuse } from "@widgetarium/core/requests";
import type { Emitter } from "@widgetarium/core/requests";
import type { AssistantSetupGateway } from "../../../gateways/assistant-setup/assistant-setup.gateway.js";
import type { AttachmentFolderGateway } from "../../../gateways/attachment-folder/attachment-folder.gateway.js";
import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { DraftAttachmentsGateway } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import { SentAttachmentsChangedEvent } from "../../../shared/events/sent-attachments.events.js";
import { withAttachments } from "../../../shared/lib/attachment-trailer.js";
import { chosenOf } from "../../../shared/lib/chosen-provider.js";
import { refusalOfReach } from "./attachment-rules.js";
import { SENT, recordSent, sendOrRemoveWritten, writeDrafts } from "./attachments-on-disk.js";
import type { SendingParts } from "./attachments-on-disk.js";
import { saveDrafts } from "./held-drafts.js";
import { lentFoldersOf } from "./written.js";

export interface MessageParts extends SendingParts, Emitter<typeof SentAttachmentsChangedEvent> {
	readonly assistantSetup: AssistantSetupGateway;
	readonly attachmentFolder: AttachmentFolderGateway;
	readonly draftAttachments: DraftAttachmentsGateway;
}

export async function sendWithDrafts(
	parts: MessageParts,
	said: string,
	drafts: readonly DraftAttachment[],
): Promise<void> {
	if (drafts.length === 0) {
		await parts.assistantSession.send(said);
		return;
	}

	const provider = chosenOf(await parts.assistantSetup.setup());
	const refusal = drafts.map((draft) => refusalOfReach(draft.kind, provider)).find((found) => found !== null);

	if (refusal) {
		return refuse(refusal);
	}

	const written = writeDrafts(drafts, provider.reads, parts.attachmentFiles);
	parts.attachmentFolder.lendFolders(lentFoldersOf(drafts));
	await sendOrRemoveWritten(parts, withAttachments(said, written.entries), written.files);

	if (written.files.length > 0) {
		recordSent(parts, written.files);
		parts.emit(SentAttachmentsChangedEvent);
	}

	saveDrafts(parts.draftAttachments, [], SENT);
}
