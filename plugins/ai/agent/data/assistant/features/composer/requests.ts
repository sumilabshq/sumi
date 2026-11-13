import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { FOLDERS_NOT_HERE } from "../../gateways/attachment-folder/none.gateway.js";
import { holdChatDraft, wearChoices, wearProvider } from "../../shared/lib/chat-drafts.js";
import { fileDragged } from "../../gateways/chat-parts/chat-parts.events.js";
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
import {
	ChatOpenedSchema,
	DraftNoticeSchema,
	DraftTextSchema,
	HeldDraftTextSchema,
	OpenedDraftSchema,
} from "../../shared/schema/chat-draft.schema.js";
import { DroppedAskedSchema, FileDragSchema, PageDragAskedSchema } from "../../shared/schema/file-drag.schema.js";
import { adoptUnsent } from "./lib/adopted-draft.js";
import { ACCEPTED, refusalOfCount, refusalOfReach } from "./lib/attachment-rules.js";
import { attachDrafted, attachOffered } from "./lib/attaching.js";
import { sweepFolder } from "./lib/attachments-on-disk.js";
import { chipOf, draftedFolders, offeredOf } from "./lib/drafts.js";
import { fileDragOf, heardHostDrag, heardPageDrag } from "./lib/file-drag.js";
import { saveDrafts, saveFileDrag } from "./lib/held-drafts.js";
import { sendWithDrafts } from "./lib/sending.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";

const CLEARED = "the chat was cleared";
const CHAT_SWITCHED = "another chat was opened";
const ALREADY_REMOVED = "That attachment was already removed";
const REMOVED = "removed {name}";
const DROPPED_ALREADY = "the dropped files were already attached";
const HANDED_OVER = "handed to a new chat";

export const draftAttachments = query()
	.public()
	.input(ChatKeySchema)
	.output(DraftAttachmentsSchema)
	.settlesNow()
	.handle(inChat((_input, { draftAttachments }) => draftAttachments.draftAttachments().map(chipOf)));

export const attachFiles = command()
	.public()
	.input(FilesAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ files }, injects) => {
			injects.invalidate(draftAttachments);
			await attachOffered(injects, {
				files: files.map(offeredOf),
				folders: [],
			});
		}),
	);

export const removeAttachment = command()
	.public()
	.input(AttachmentAskedSchema)
	.idempotencyKey((input) => input.id)
	.handle(
		inChat(({ id }, { draftAttachments: draftAttachmentsGateway, invalidate }) => {
			const drafts = draftAttachmentsGateway.draftAttachments();
			const removed = drafts.find((draft) => draft.id === id);

			if (!removed) {
				return refuse(ALREADY_REMOVED);
			}

			invalidate(draftAttachments);
			saveDrafts(
				draftAttachmentsGateway,
				drafts.filter((draft) => draft !== removed),
				REMOVED.replace("{name}", removed.name),
			);
		}),
	);

export const sendMessage = command()
	.public()
	.input(MessageAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ said, replaces }, injects) => {
			const drafts = injects.draftAttachments.draftAttachments();
			injects.chatDrafts.saveUnseenSaid(null);
			injects.invalidate(draftAttachments);
			await sendWithDrafts(injects, {
				said,
				drafts,
				replaces,
			});
		}),
	);

export const takeDraft = command()
	.public()
	.input(ChatKeySchema)
	.output(TakenDraftSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat((_input, { draftAttachments: draftAttachmentsGateway, invalidate }) => {
			const attachments = draftAttachmentsGateway.draftAttachments();
			invalidate(draftAttachments);
			saveDrafts(draftAttachmentsGateway, [], HANDED_OVER);
			return { attachments: [...attachments] };
		}),
	);

export const adoptDraft = command()
	.public()
	.input(AdoptedDraftSchema)
	.output(DraftTextSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async (adopted, injects) => {
			injects.invalidate(draftAttachments);

			if (!adopted.sends) {
				return adoptUnsent(injects, adopted);
			}

			try {
				await sendWithDrafts(injects, {
					said: adopted.said,
					drafts: adopted.attachments,
				});
				return { said: "" };
			} catch (failed) {
				adoptUnsent(injects, adopted);
				throw failed;
			}
		}),
	);

export const sweepAttachments = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.handle(
		inChat((_input, injects) =>
			sweepFolder(injects, {
				isBusy: injects.assistantSession.session().busy,
				now: injects.clock.now(),
			}),
		),
	);

export const attachReach = query()
	.public()
	.input(ChatKeySchema)
	.output(AttachReachSchema)
	.settlesNow()
	.handle(
		inChat((_input, { attachmentFolder }) => ({
			canAttachFolders: attachmentFolder.canPick(),
			accepted: ACCEPTED,
		})),
	);

export const attachFolder = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(
			async (_input, { assistantSetup, attachmentFolder, draftAttachments: draftAttachmentsGateway, invalidate }) => {
				if (!attachmentFolder.canPick()) {
					return refuse(FOLDERS_NOT_HERE);
				}

				const provider = chosenOf(await assistantSetup.setup());
				const held = draftAttachmentsGateway.draftAttachments();
				const refusal = refusalOfReach("folder", provider) ?? refusalOfCount(held.length, 1, provider.reads);

				if (refusal) {
					return refuse(refusal);
				}

				const path = await attachmentFolder.pickedFolder();

				if (path === null) {
					console.debug("[widgetarium] attach folder skipped: no folder was picked");
					return;
				}

				invalidate(draftAttachments);
				attachDrafted(
					draftAttachmentsGateway,
					draftedFolders([path], provider, draftAttachmentsGateway.draftAttachments()),
					provider.reads,
				);
			},
		),
	);

export const fileDrag = query()
	.public()
	.input(ChatKeySchema)
	.output(FileDragSchema)
	.settlesNow()
	.handle(inChat((_input, { fileDrag }) => fileDragOf(fileDrag.fileDrag())));

export const hearPageDrag = command()
	.public()
	.input(PageDragAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(({ drag }, { fileDrag: fileDragGateway, invalidate }) => {
			invalidate(fileDrag);
			saveFileDrag(
				fileDragGateway,
				heardPageDrag(fileDragGateway.fileDrag(), drag),
				`the page heard a file drag ${drag}`,
			);
		}),
	);

export const attachDropped = command()
	.public()
	.input(DroppedAskedSchema)
	.idempotencyKey((input) => input.id)
	.handle(
		inChat(async ({ id }, injects) => {
			const batch = injects.fileDrag.fileDrag().dropped;

			if (batch?.id !== id) {
				console.debug(`[widgetarium] drop ${id} not attached (${DROPPED_ALREADY})`);
				return;
			}

			injects.invalidate(fileDrag);
			injects.invalidate(draftAttachments);
			await attachOffered(injects, batch);
			saveFileDrag(
				injects.fileDrag,
				{
					...injects.fileDrag.fileDrag(),
					dropped: null,
				},
				"the dropped files were attached",
			);
		}),
	);

export const clearChat = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.handle(
		inChat(async (_input, injects) => {
			await injects.assistantSession.clear();
			injects.invalidate(draftAttachments);
			saveDrafts(injects.draftAttachments, [], CLEARED);
			sweepFolder(injects, {
				isBusy: false,
				now: injects.clock.now(),
			});
		}),
	);

export const holdDraftText = command()
	.public()
	.input(HeldDraftTextSchema)
	.output(DraftNoticeSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(({ said }, { chatDrafts, draftAttachments }) => {
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
		}),
	);

export const openChatDraft = command()
	.public()
	.input(ChatOpenedSchema)
	.output(OpenedDraftSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(
			async (
				{ chat: chatId },
				{ chatDrafts, draftAttachments: draftAttachmentsGateway, claudeOptions, assistantSetup, invalidate },
			) => {
				const left = chatDrafts.openChat();

				if (left === chatId) {
					return {
						said: "",
						notice: chatDrafts.problemOf(chatId),
					};
				}

				if (left !== null) {
					holdChatDraft(chatDrafts, left, { attachments: draftAttachmentsGateway.draftAttachments() });
				}

				chatDrafts.saveOpenChat(chatId);
				console.debug(`[widgetarium] open chat ${String(left)} → ${chatId}`);
				await chatDrafts.ready(chatId);
				const opened = chatDrafts.chatDraft(chatId);
				chatDrafts.saveUnseenSaid(opened === null || opened.said === "" ? null : opened.said);
				invalidate(draftAttachments);
				saveDrafts(draftAttachmentsGateway, opened?.attachments ?? [], CHAT_SWITCHED);
				wearChoices(claudeOptions, opened?.choices ?? null, chatId);
				await wearProvider(assistantSetup, opened?.provider ?? null, chatId);
				return {
					said: opened?.said ?? "",
					notice: chatDrafts.problemOf(chatId),
				};
			},
		),
	);

export const hearHostDrag = subscriber(fileDragged).handle(
	inChat(({ drag: event }, { fileDrag: fileDragGateway, invalidate }) => {
		invalidate(fileDrag);
		saveFileDrag(
			fileDragGateway,
			heardHostDrag(fileDragGateway.fileDrag(), event, crypto.randomUUID()),
			`the host heard a file drag ${event.kind}`,
		);
	}),
);
