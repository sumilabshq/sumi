import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import {
	AttachReachSchema,
	AttachmentAskedSchema,
	DraftAttachmentsSchema,
	FilesAskedSchema,
	MessageAskedSchema,
} from "../../shared/schema/attachment.schema.js";
import { ComposerPrefillSchema, PrefillAskedSchema } from "../../shared/schema/composer-prefill.schema.js";
import { DroppedAskedSchema, FileDragSchema, PageDragAskedSchema } from "../../shared/schema/file-drag.schema.js";
import { StarterAskedSchema, StarterSchema } from "../../shared/schema/starter.schema.js";
import { SlashNamesSchema } from "../../shared/schema/slash-command.schema.js";

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

export const AttachReachQuery = query("assistant/attach-reach").output(AttachReachSchema).settlesNow();

export const AttachFolderCommand = command("assistant/attach-folder")
	.idempotencyKey(PerCall)
	.invalidates([DraftAttachmentsQuery]);

export const ComposerStarterQuery = query("assistant/composer-starter").output(StarterSchema.nullable()).settlesNow();

export const PickStarterCommand = command("assistant/pick-starter")
	.input(StarterAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([ComposerStarterQuery]);

export const DropStarterCommand = command("assistant/drop-starter")
	.idempotencyKey(Repeatable)
	.invalidates([ComposerStarterQuery]);

export const FileDragQuery = query("assistant/file-drag").output(FileDragSchema).settlesNow();

export const HearPageDragCommand = command("assistant/hear-page-drag")
	.input(PageDragAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([FileDragQuery]);

export const AttachDroppedCommand = command("assistant/attach-dropped")
	.input(DroppedAskedSchema)
	.idempotencyKey((input) => input.id)
	.invalidates([DraftAttachmentsQuery, FileDragQuery]);

export const SlashCommandsQuery = query("assistant/slash-commands").output(SlashNamesSchema);

export const ClearChatCommand = command("assistant/clear-chat")
	.idempotencyKey(Repeatable)
	.invalidates([DraftAttachmentsQuery]);

export const CompactChatCommand = command("assistant/compact-chat").idempotencyKey(Repeatable).invalidates([]);
