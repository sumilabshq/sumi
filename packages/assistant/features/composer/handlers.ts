import { handler, refuse } from "@widgetarium/core/requests";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { AttachmentFilesGateway } from "../../gateways/attachment-files/attachment-files.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { sweepFolder } from "../../shared/lib/attachment-sweep.js";
import { withAttachments } from "../../shared/lib/attachment-trailer.js";
import { ComposerPrefillStore } from "../../shared/lib/composer-prefill-store.js";
import { DraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import type { DraftAttachment } from "../../shared/lib/draft-attachments-store.js";
import { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import { sizeSaid } from "../../shared/lib/size-said.js";
import type { AttachmentChip } from "../../shared/schema/attachment.schema.js";
import { AssistantClientModule } from "../../module.js";
import { chosenOf, kindOf, refusalOfCount, refusalOfFile, refusalOfReach } from "./lib/attachment-rules.js";
import { readAttachment } from "./lib/read-attachment.js";
import { sentRecordOf, writtenOf } from "./lib/written-attachments.js";
import {
	AttachFilesCommand,
	ComposerPrefillQuery,
	DraftAttachmentsQuery,
	PrefillDraftCommand,
	RemoveAttachmentCommand,
	SendMessageCommand,
	SweepAttachmentsCommand,
} from "./contract.js";

const ALREADY_REMOVED = "That attachment was already removed";
const SENT = "sent with the message";
const REMOVED = "removed {name}";
const ATTACHED = "attached {names}";
const PREFILLED = "another app asked for a draft";

export const ComposerPrefillQueryHandler = handler(ComposerPrefillQuery, AssistantClientModule)
	.inject({ composerPrefillStore: ComposerPrefillStore })
	.watch((_input, { composerPrefillStore }, changed) => composerPrefillStore.watch(changed))
	.handle((_input, { composerPrefillStore }) => composerPrefillStore.latest());

export const PrefillDraftCommandHandler = handler(PrefillDraftCommand, AssistantClientModule)
	.inject({ composerPrefillStore: ComposerPrefillStore })
	.handle(({ text }, { composerPrefillStore }) => composerPrefillStore.ask(text, PREFILLED));

export const DraftAttachmentsQueryHandler = handler(DraftAttachmentsQuery, AssistantClientModule)
	.inject({ draftAttachmentsStore: DraftAttachmentsStore })
	.watch((_input, { draftAttachmentsStore }, changed) => draftAttachmentsStore.watch(changed))
	.handle((_input, { draftAttachmentsStore }) => draftAttachmentsStore.now().map(chipOf));

export const AttachFilesCommandHandler = handler(AttachFilesCommand, AssistantClientModule)
	.inject({
		assistantSetupGateway: AssistantSetupGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
	})
	.handle(async ({ files }, { assistantSetupGateway, draftAttachmentsStore }) => {
		const provider = chosenOf(await assistantSetupGateway.setup());
		const refusal =
			refusalOfCount(draftAttachmentsStore.now().length, files.length) ??
			files.map((file) => refusalOfFile(file, provider)).find((found) => found !== null);

		if (refusal) {
			return refuse(refusal);
		}

		const read = await Promise.all(files.map((file) => readAttachment(file, kindOf(file.name) ?? "text")));
		const unread = read.find(({ refusal: found }) => found !== null)?.refusal;

		if (unread) {
			return refuse(unread);
		}

		const drafts = read.flatMap(({ draft }) => (draft ? [draft] : []));
		draftAttachmentsStore.change(
			[...draftAttachmentsStore.now(), ...drafts],
			ATTACHED.replace("{names}", drafts.map(({ name }) => name).join(", ")),
		);
	});

export const RemoveAttachmentCommandHandler = handler(RemoveAttachmentCommand, AssistantClientModule)
	.inject({ draftAttachmentsStore: DraftAttachmentsStore })
	.handle(({ id }, { draftAttachmentsStore }) => {
		const drafts = draftAttachmentsStore.now();
		const removed = drafts.find((draft) => draft.id === id);

		if (!removed) {
			return refuse(ALREADY_REMOVED);
		}

		draftAttachmentsStore.change(
			drafts.filter((draft) => draft !== removed),
			REMOVED.replace("{name}", removed.name),
		);
	});

export const SendMessageCommandHandler = handler(SendMessageCommand, AssistantClientModule)
	.inject({
		assistantSessionGateway: AssistantSessionGateway,
		assistantSetupGateway: AssistantSetupGateway,
		attachmentFilesGateway: AttachmentFilesGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
		sentAttachmentsStore: SentAttachmentsStore,
		clockGateway: ClockGateway,
	})
	.handle(async ({ said }, parts) => {
		const drafts = parts.draftAttachmentsStore.now();

		if (drafts.length === 0) {
			return parts.assistantSessionGateway.send(said);
		}

		const provider = chosenOf(await parts.assistantSetupGateway.setup());
		const refusal = drafts.map((draft) => refusalOfReach(draft.kind, provider)).find((found) => found !== null);

		if (refusal) {
			return refuse(refusal);
		}

		const written = writtenOf(drafts, provider.reads, parts.attachmentFilesGateway);

		try {
			await parts.assistantSessionGateway.send(withAttachments(said, written.entries));
		} catch (failed: unknown) {
			written.files.forEach(({ path }) => parts.attachmentFilesGateway.remove(path));
			throw failed;
		}

		if (written.files.length > 0) {
			parts.sentAttachmentsStore.change(
				sentRecordOf(parts.sentAttachmentsStore.now(), written, parts.clockGateway.now()),
				SENT,
			);
		}

		parts.draftAttachmentsStore.change([], SENT);
	});

export const SweepAttachmentsCommandHandler = handler(SweepAttachmentsCommand, AssistantClientModule)
	.inject({
		assistantSessionGateway: AssistantSessionGateway,
		attachmentFilesGateway: AttachmentFilesGateway,
		sentAttachmentsStore: SentAttachmentsStore,
		clockGateway: ClockGateway,
	})
	.handle((_input, parts) =>
		sweepFolder(parts, {
			isBusy: parts.assistantSessionGateway.session().busy,
			now: parts.clockGateway.now(),
		}),
	);

function chipOf(draft: DraftAttachment): AttachmentChip {
	return {
		id: draft.id,
		name: draft.name,
		kind: draft.kind,
		size: sizeSaid(draft.bytes.length),
		preview: draft.preview,
	};
}
