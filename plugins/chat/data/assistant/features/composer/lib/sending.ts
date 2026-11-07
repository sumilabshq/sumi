import { refuse } from "@widgetarium/data-framework";
import type { Emitter } from "@widgetarium/data-framework";
import type { AssistantSetupGateway } from "../../../gateways/assistant-setup/assistant-setup.gateway.js";
import type { AttachmentFolderGateway } from "../../../gateways/attachment-folder/attachment-folder.gateway.js";
import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { DraftAttachmentsGateway } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import { SentAttachmentsChangedEvent } from "../../../shared/events/sent-attachments.events.js";
import { attachmentsIn, withAttachments } from "../../../shared/lib/attachment-trailer.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
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

export interface OutgoingMessage {
	readonly said: string;
	readonly drafts: readonly DraftAttachment[];
	readonly replaces?: string | undefined;
}

const NO_SUCH_QUEUED = "That queued message was already sent or removed";

export async function sendWithDrafts(injects: MessageParts, { said, drafts, replaces }: OutgoingMessage): Promise<void> {
	const kept = replaces === undefined ? [] : keptEntriesOf(injects, replaces);
	const deliver = deliveryOf(injects, replaces);

	if (drafts.length === 0) {
		await deliver(withAttachments(said, kept));
		return;
	}

	const provider = chosenOf(await injects.assistantSetup.setup());
	const refusal = drafts.map((draft) => refusalOfReach(draft.kind, provider)).find((found) => found !== null);

	if (refusal) {
		return refuse(refusal);
	}

	const written = writeDrafts(drafts, provider.reads, injects.attachmentFiles);
	injects.attachmentFolder.lendFolders(lentFoldersOf(drafts));
	await sendOrRemoveWritten(injects, { said: withAttachments(said, [...kept, ...written.entries]), files: written.files }, deliver);

	if (written.files.length > 0) {
		recordSent(injects, written.files);
		injects.emit(SentAttachmentsChangedEvent);
	}

	saveDrafts(injects.draftAttachments, [], SENT);
}

function keptEntriesOf(injects: MessageParts, replaces: string): readonly TrailerEntry[] {
	const queued = injects.assistantSession.session().queued.find(({ id }) => id === replaces);

	if (queued === undefined) {
		return refuse(NO_SUCH_QUEUED);
	}

	return attachmentsIn(queued.text).entries;
}

function deliveryOf(injects: MessageParts, replaces: string | undefined): (said: string) => Promise<void> {
	if (replaces === undefined) {
		return (said) => injects.assistantSession.send(said);
	}

	return (said) => {
		const refusal = injects.assistantSession.changeQueue({
			kind: "edit",
			id: replaces,
			said,
		});
		return refusal === null ? Promise.resolve() : Promise.reject(new Error(refusal));
	};
}
