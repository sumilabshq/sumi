import { PerCall, Repeatable, command, query, refuse, subscriber } from "@widgetarium/framework";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { AttachmentFilesGateway } from "../../gateways/attachment-files/attachment-files.gateway.js";
import { AttachmentFolderGateway } from "../../gateways/attachment-folder/attachment-folder.gateway.js";
import { FOLDERS_NOT_HERE } from "../../gateways/attachment-folder/none.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { ClaudeOptionsGateway } from "../../gateways/claude-options/claude-options.gateway.js";
import { holdChatDraft, wearChoices, wearProvider } from "../../shared/lib/chat-drafts.js";
import { ChatDraftsGateway } from "../../gateways/chat-drafts/chat-drafts.gateway.js";
import { DraftAttachmentsGateway } from "../../gateways/draft-attachments/draft-attachments.gateway.js";
import { FileDragGateway } from "../../gateways/file-drag/file-drag.gateway.js";
import { FileDraggedEvent } from "../../gateways/file-drop/file-drop.events.js";
import { SentAttachmentsGateway } from "../../gateways/sent-attachments/sent-attachments.gateway.js";
import { SentAttachmentsChangedEvent } from "../../shared/events/sent-attachments.events.js";
import { chosenOf } from "../../shared/lib/chosen-provider.js";
import {
	AdoptedDraftSchema,
	AttachReachSchema,
	AttachmentAskedSchema,
	DraftAttachmentsSchema,
	FilesAskedSchema,
	MessageAskedSchema,
	TakenDraftSchema,
} from "../../shared/schema/attachment.schema.js";
import { ChatOpenedSchema, DraftNoticeSchema, DraftTextSchema, OpenedDraftSchema } from "../../shared/schema/chat-draft.schema.js";
import { DroppedAskedSchema, FileDragSchema, PageDragAskedSchema } from "../../shared/schema/file-drag.schema.js";
import { adoptUnsent } from "./lib/adopted-draft.js";
import { ACCEPTED, refusalOfCount, refusalOfReach } from "./lib/attachment-rules.js";
import { attachDrafted, attachOffered } from "./lib/attaching.js";
import { sweepFolder } from "./lib/attachments-on-disk.js";
import { chipOf, draftedFolders, offeredOf } from "./lib/drafts.js";
import { fileDragOf, heardHostDrag, heardPageDrag } from "./lib/file-drag.js";
import { saveDrafts, saveFileDrag } from "./lib/held-drafts.js";
import { sendWithDrafts } from "./lib/sending.js";

const CLEARED = "the chat was cleared";
const CHAT_SWITCHED = "another chat was opened";
const ALREADY_REMOVED = "That attachment was already removed";
const REMOVED = "removed {name}";
const DROPPED_ALREADY = "the dropped files were already attached";
const HANDED_OVER = "handed to a new chat";

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
		chatDrafts: ChatDraftsGateway,
		clock: ClockGateway,
	})
	.emits(SentAttachmentsChangedEvent)
	.handle(async ({ said, replaces }, parts) => {
		const drafts = parts.draftAttachments.draftAttachments();
		parts.chatDrafts.saveUnseenSaid(null);
		parts.invalidate(DraftAttachmentsQuery);
		await sendWithDrafts(parts, {
			said,
			drafts,
			replaces,
		});
	});

export const TakeDraftCommand = command("take-draft")
	.output(TakenDraftSchema)
	.idempotencyKey(PerCall)
	.inject({ draftAttachments: DraftAttachmentsGateway })
	.handle((_input, { draftAttachments, invalidate }) => {
		const attachments = draftAttachments.draftAttachments();
		invalidate(DraftAttachmentsQuery);
		saveDrafts(draftAttachments, [], HANDED_OVER);
		return { attachments: [...attachments] };
	});

export const AdoptDraftCommand = command("adopt-draft")
	.input(AdoptedDraftSchema)
	.output(DraftTextSchema)
	.idempotencyKey(PerCall)
	.inject({
		assistantSession: AssistantSessionGateway,
		assistantSetup: AssistantSetupGateway,
		attachmentFiles: AttachmentFilesGateway,
		attachmentFolder: AttachmentFolderGateway,
		chatDrafts: ChatDraftsGateway,
		draftAttachments: DraftAttachmentsGateway,
		sentAttachments: SentAttachmentsGateway,
		clock: ClockGateway,
	})
	.emits(SentAttachmentsChangedEvent)
	.handle(async (adopted, parts) => {
		parts.invalidate(DraftAttachmentsQuery);

		if (!adopted.sends) {
			return adoptUnsent(parts, adopted);
		}

		try {
			await sendWithDrafts(parts, {
				said: adopted.said,
				drafts: adopted.attachments,
			});
			return { said: "" };
		} catch (failed) {
			adoptUnsent(parts, adopted);
			throw failed;
		}
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
	.output(DraftNoticeSchema)
	.idempotencyKey(PerCall)
	.inject({
		chatDrafts: ChatDraftsGateway,
		draftAttachments: DraftAttachmentsGateway,
	})
	.handle(({ said }, { chatDrafts, draftAttachments }) => {
		const openChat = chatDrafts.openChat();

		if (openChat === null) {
			console.debug("[widgetarium] draft text not held: no chat is open yet");
			return { notice: null };
		}

		const unseen = chatDrafts.unseenSaid();
		const attachments = draftAttachments.draftAttachments();

		if (unseen !== null && said === "") {
			console.debug(`[widgetarium] chat ${openChat} kept its text: the composer has not shown it yet`);
			holdChatDraft(chatDrafts, openChat, { attachments });
			return { notice: chatDrafts.problemOf(openChat) };
		}

		chatDrafts.saveUnseenSaid(null);
		holdChatDraft(chatDrafts, openChat, {
			said,
			attachments,
		});
		return { notice: chatDrafts.problemOf(openChat) };
	});

export const OpenChatDraftCommand = command("open-chat-draft")
	.input(ChatOpenedSchema)
	.output(OpenedDraftSchema)
	.idempotencyKey(PerCall)
	.inject({
		chatDrafts: ChatDraftsGateway,
		draftAttachments: DraftAttachmentsGateway,
		claudeOptions: ClaudeOptionsGateway,
		assistantSetup: AssistantSetupGateway,
	})
	.handle(async ({ chatId }, { chatDrafts, draftAttachments, claudeOptions, assistantSetup, invalidate }) => {
		const left = chatDrafts.openChat();

		if (left === chatId) {
			return {
				said: "",
				notice: chatDrafts.problemOf(chatId),
			};
		}

		if (left !== null) {
			holdChatDraft(chatDrafts, left, { attachments: draftAttachments.draftAttachments() });
		}

		chatDrafts.saveOpenChat(chatId);
		console.debug(`[widgetarium] open chat ${String(left)} → ${chatId}`);
		const opened = chatDrafts.chatDraft(chatId);
		chatDrafts.saveUnseenSaid(opened === null || opened.said === "" ? null : opened.said);
		invalidate(DraftAttachmentsQuery);
		saveDrafts(draftAttachments, opened?.attachments ?? [], CHAT_SWITCHED);
		wearChoices(claudeOptions, opened?.choices ?? null, chatId);
		await wearProvider(assistantSetup, opened?.provider ?? null, chatId);
		return {
			said: opened?.said ?? "",
			notice: chatDrafts.problemOf(chatId),
		};
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
