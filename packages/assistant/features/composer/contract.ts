import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import {
	AttachmentAskedSchema,
	DraftAttachmentsSchema,
	FilesAskedSchema,
	MessageAskedSchema,
} from "../../shared/schema/attachment.schema.js";
import { ComposerPrefillSchema, PrefillAskedSchema } from "../../shared/schema/composer-prefill.schema.js";

export const DraftAttachmentsQuery = query("assistant/draft-attachments").output(DraftAttachmentsSchema).settlesNow();

export const ComposerPrefillQuery = query("assistant/composer-prefill")
	.output(ComposerPrefillSchema.nullable())
	.settlesNow();

export const PrefillDraftCommand = command("assistant/prefill-draft")
	.input(PrefillAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([ComposerPrefillQuery]);

export const AttachFilesCommand = command("assistant/attach-files")
	.input(FilesAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([DraftAttachmentsQuery]);

export const RemoveAttachmentCommand = command("assistant/remove-attachment")
	.input(AttachmentAskedSchema)
	.idempotencyKey((input) => input.id)
	.invalidates([DraftAttachmentsQuery]);

export const SendMessageCommand = command("assistant/send-message")
	.input(MessageAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([DraftAttachmentsQuery]);

export const SweepAttachmentsCommand = command("assistant/sweep-attachments")
	.idempotencyKey(Repeatable)
	.invalidates([]);
