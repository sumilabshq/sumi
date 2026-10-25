import { PerCall, Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { AttachmentFilesGateway } from "../../gateways/attachment-files/attachment-files.gateway.js";
import { AttachmentFolderGateway } from "../../gateways/attachment-folder/attachment-folder.gateway.js";
import { FOLDERS_NOT_HERE } from "../../gateways/attachment-folder/none.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { ChatDraftsGateway } from "../../gateways/chat-drafts/chat-drafts.gateway.js";
import { DraftAttachmentsGateway } from "../../gateways/draft-attachments/draft-attachments.gateway.js";
import { FileDragGateway } from "../../gateways/file-drag/file-drag.gateway.js";
import { FileDraggedEvent } from "../../gateways/file-drop/file-drop.events.js";
import { SentAttachmentsGateway } from "../../gateways/sent-attachments/sent-attachments.gateway.js";
import { SentAttachmentsChangedEvent } from "../../shared/events/sent-attachments.events.js";
import { withAttachments } from "../../shared/lib/attachment-trailer.js";
import { chosenOf } from "../../shared/lib/chosen-provider.js";
import type { ChosenProvider } from "../../shared/lib/chosen-provider.js";
import type { ProviderReads } from "../../shared/schema/agent-setup.schema.js";
import {
	AttachReachSchema,
	AttachmentAskedSchema,
	DraftAttachmentsSchema,
	FilesAskedSchema,
	MessageAskedSchema,
} from "../../shared/schema/attachment.schema.js";
import { ChatOpenedSchema, DraftTextSchema } from "../../shared/schema/chat-draft.schema.js";
import { DroppedAskedSchema, FileDragSchema, PageDragAskedSchema } from "../../shared/schema/file-drag.schema.js";
import type { DroppedFile } from "../../shared/schema/file-drag.schema.js";
import { ACCEPTED, kindOf, refusalOfCount, refusalOfFile, refusalOfReach } from "./lib/attachment-rules.js";
import { SENT, recordSent, sendOrRemoveWritten, sweepFolder, writeDrafts } from "./lib/attachments-on-disk.js";
import { chipOf, draftOfFile, draftedFolders, draftedTogether, offeredOf, refusedWith } from "./lib/drafts.js";
import type { Drafted } from "./lib/drafts.js";
import { fileDragOf, heardHostDrag, heardPageDrag } from "./lib/file-drag.js";
import { holdChatDraft, saveDrafts, saveFileDrag } from "./lib/held-drafts.js";
import { lentFoldersOf } from "./lib/written.js";

const CLEARED = "the chat was cleared";
const CHAT_SWITCHED = "another chat was opened";
const ALREADY_REMOVED = "That attachment was already removed";
const REMOVED = "removed {name}";
const ATTACHED = "attached {names}";
const DROPPED_ALREADY = "the dropped files were already attached";

interface AttachingParts {
	readonly assistantSetup: AssistantSetupGateway;
	readonly draftAttachments: DraftAttachmentsGateway;
}

interface OfferedAttachments {
	readonly files: readonly DroppedFile[];
	readonly folders: readonly string[];
}

export const DraftAttachmentsQuery = query("draft-attachments")
	.output(DraftAttachmentsSchema)
	.settlesNow()
	.inject({ draftAttachments: DraftAttachmentsGateway })
	.handle((_input, { draftAttachments }) => draftAttachments.draftAttachments().map(chipOf));

export const AttachFilesCommand = command("attach-files")
	.input(FilesAskedSchema)
	.idempotencyKey(PerCall)
	.inject({
		assistantSetup: AssistantSetupGateway,
		draftAttachments: DraftAttachmentsGateway,
	})
	.handle(async ({ files }, parts) => {
		parts.invalidate(DraftAttachmentsQuery);
		await attachOffered(parts, {
			files: files.map(offeredOf),
			folders: [],
		});
	});

export const RemoveAttachmentCommand = command("remove-attachment")
	.input(AttachmentAskedSchema)
	.idempotencyKey((input) => input.id)
	.inject({ draftAttachments: DraftAttachmentsGateway })
	.handle(({ id }, { draftAttachments, invalidate }) => {
		const drafts = draftAttachments.draftAttachments();
		const removed = drafts.find((draft) => draft.id === id);

		if (!removed) {
			return refuse(ALREADY_REMOVED);
		}

		invalidate(DraftAttachmentsQuery);
		saveDrafts(
			draftAttachments,
			drafts.filter((draft) => draft !== removed),
			REMOVED.replace("{name}", removed.name),
		);
	});

export const SendMessageCommand = command("send-message")
	.input(MessageAskedSchema)
	.idempotencyKey(PerCall)
	.inject({
		assistantSession: AssistantSessionGateway,
		assistantSetup: AssistantSetupGateway,
		attachmentFiles: AttachmentFilesGateway,
		attachmentFolder: AttachmentFolderGateway,
		draftAttachments: DraftAttachmentsGateway,
		sentAttachments: SentAttachmentsGateway,
		clock: ClockGateway,
	})
	.emits(SentAttachmentsChangedEvent)
	.handle(async ({ said }, parts) => {
		const drafts = parts.draftAttachments.draftAttachments();
		parts.invalidate(DraftAttachmentsQuery);

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
	});

export const SweepAttachmentsCommand = command("sweep-attachments")
	.idempotencyKey(Repeatable)
	.inject({
		assistantSession: AssistantSessionGateway,
		attachmentFiles: AttachmentFilesGateway,
		sentAttachments: SentAttachmentsGateway,
		clock: ClockGateway,
	})
	.emits(SentAttachmentsChangedEvent)
	.handle((_input, parts) =>
		sweepFolder(parts, {
			isBusy: parts.assistantSession.session().busy,
			now: parts.clock.now(),
		}),
	);

export const AttachReachQuery = query("attach-reach")
	.output(AttachReachSchema)
	.settlesNow()
	.inject({ attachmentFolder: AttachmentFolderGateway })
	.handle((_input, { attachmentFolder }) => ({
		canAttachFolders: attachmentFolder.canPick(),
		accepted: ACCEPTED,
	}));

export const AttachFolderCommand = command("attach-folder")
	.idempotencyKey(PerCall)
	.inject({
		assistantSetup: AssistantSetupGateway,
		attachmentFolder: AttachmentFolderGateway,
		draftAttachments: DraftAttachmentsGateway,
	})
	.handle(async (_input, { assistantSetup, attachmentFolder, draftAttachments, invalidate }) => {
		if (!attachmentFolder.canPick()) {
			return refuse(FOLDERS_NOT_HERE);
		}

		const provider = chosenOf(await assistantSetup.setup());
		const held = draftAttachments.draftAttachments();
		const refusal = refusalOfReach("folder", provider) ?? refusalOfCount(held.length, 1, provider.reads);

		if (refusal) {
			return refuse(refusal);
		}

		const path = await attachmentFolder.pickedFolder();

		if (path === null) {
			console.debug("[widgetarium] attach folder skipped: no folder was picked");
			return;
		}

		invalidate(DraftAttachmentsQuery);
		attachDrafted(
			draftAttachments,
			draftedFolders([path], provider, draftAttachments.draftAttachments()),
			provider.reads,
		);
	});

export const FileDragQuery = query("file-drag")
	.output(FileDragSchema)
	.settlesNow()
	.inject({ fileDrag: FileDragGateway })
	.handle((_input, { fileDrag }) => fileDragOf(fileDrag.fileDrag()));

export const HearPageDragCommand = command("hear-page-drag")
	.input(PageDragAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ fileDrag: FileDragGateway })
	.handle(({ drag }, { fileDrag, invalidate }) => {
		invalidate(FileDragQuery);
		saveFileDrag(fileDrag, heardPageDrag(fileDrag.fileDrag(), drag), `the page heard a file drag ${drag}`);
	});

export const AttachDroppedCommand = command("attach-dropped")
	.input(DroppedAskedSchema)
	.idempotencyKey((input) => input.id)
	.inject({
		assistantSetup: AssistantSetupGateway,
		draftAttachments: DraftAttachmentsGateway,
		fileDrag: FileDragGateway,
	})
	.handle(async ({ id }, parts) => {
		const batch = parts.fileDrag.fileDrag().dropped;

		if (batch?.id !== id) {
			console.debug(`[widgetarium] drop ${id} not attached (${DROPPED_ALREADY})`);
			return;
		}

		parts.invalidate(FileDragQuery);
		parts.invalidate(DraftAttachmentsQuery);
		await attachOffered(parts, batch);
		saveFileDrag(
			parts.fileDrag,
			{
				...parts.fileDrag.fileDrag(),
				dropped: null,
			},
			"the dropped files were attached",
		);
	});

export const ClearChatCommand = command("clear-chat")
	.idempotencyKey(Repeatable)
	.inject({
		assistantSession: AssistantSessionGateway,
		draftAttachments: DraftAttachmentsGateway,
		attachmentFiles: AttachmentFilesGateway,
		sentAttachments: SentAttachmentsGateway,
		clock: ClockGateway,
	})
	.emits(SentAttachmentsChangedEvent)
	.handle(async (_input, parts) => {
		await parts.assistantSession.clear();
		parts.invalidate(DraftAttachmentsQuery);
		saveDrafts(parts.draftAttachments, [], CLEARED);
		sweepFolder(parts, {
			isBusy: false,
			now: parts.clock.now(),
		});
	});

export const HoldDraftTextCommand = command("hold-draft-text")
	.input(DraftTextSchema)
	.idempotencyKey(PerCall)
	.inject({
		chatDrafts: ChatDraftsGateway,
		draftAttachments: DraftAttachmentsGateway,
	})
	.handle(({ said }, { chatDrafts, draftAttachments }) => {
		const openChat = chatDrafts.openChat();

		if (openChat === null) {
			console.debug("[widgetarium] draft text not held: no chat is open yet");
			return;
		}

		holdChatDraft(chatDrafts, openChat, {
			said,
			attachments: draftAttachments.draftAttachments(),
		});
	});

export const OpenChatDraftCommand = command("open-chat-draft")
	.input(ChatOpenedSchema)
	.output(DraftTextSchema)
	.idempotencyKey(PerCall)
	.inject({
		chatDrafts: ChatDraftsGateway,
		draftAttachments: DraftAttachmentsGateway,
	})
	.handle(({ chatId }, { chatDrafts, draftAttachments, invalidate }) => {
		const left = chatDrafts.openChat();

		if (left === chatId) {
			return { said: "" };
		}

		if (left !== null) {
			holdChatDraft(chatDrafts, left, {
				said: chatDrafts.chatDraft(left)?.said ?? "",
				attachments: draftAttachments.draftAttachments(),
			});
		}

		chatDrafts.saveOpenChat(chatId);
		console.debug(`[widgetarium] open chat ${String(left)} → ${chatId}`);
		const opened = chatDrafts.chatDraft(chatId);
		invalidate(DraftAttachmentsQuery);
		saveDrafts(draftAttachments, opened?.attachments ?? [], CHAT_SWITCHED);
		return { said: opened?.said ?? "" };
	});

export const HearHostDragSubscriber = subscriber(FileDraggedEvent)
	.inject({ fileDrag: FileDragGateway })
	.handle((event, { fileDrag, invalidate }) => {
		invalidate(FileDragQuery);
		saveFileDrag(
			fileDrag,
			heardHostDrag(fileDrag.fileDrag(), event, crypto.randomUUID()),
			`the host heard a file drag ${event.kind}`,
		);
	});

async function draftedFiles(offered: readonly DroppedFile[], provider: ChosenProvider): Promise<Drafted> {
	const refusal = offered.map((one) => refusalOfFile(one, provider)).find((found) => found !== null);

	if (refusal) {
		return refusedWith(refusal);
	}

	const each = await Promise.all(
		offered.map(async (one) => {
			const file = await one.file();
			const read = {
				name: file.name,
				type: file.type,
				bytes: new Uint8Array(await file.arrayBuffer()),
			};
			return draftOfFile(read, kindOf(one.name) ?? "text");
		}),
	);
	return draftedTogether(each);
}

async function attachOffered(parts: AttachingParts, offered: OfferedAttachments): Promise<void> {
	const provider = chosenOf(await parts.assistantSetup.setup());
	const folders = draftedFolders(offered.folders, provider, parts.draftAttachments.draftAttachments());

	if (folders.refusal !== null) {
		return refuse(folders.refusal);
	}

	attachDrafted(
		parts.draftAttachments,
		draftedTogether([folders, await draftedFiles(offered.files, provider)]),
		provider.reads,
	);
}

function attachDrafted(
	draftAttachments: DraftAttachmentsGateway,
	{ drafts, refusal }: Drafted,
	reads: ProviderReads,
): void {
	const counted = refusal ?? refusalOfCount(draftAttachments.draftAttachments().length, drafts.length, reads);

	if (counted !== null) {
		return refuse(counted);
	}

	saveDrafts(
		draftAttachments,
		[...draftAttachments.draftAttachments(), ...drafts],
		ATTACHED.replace("{names}", drafts.map(({ name }) => name).join(", ")),
	);
}
