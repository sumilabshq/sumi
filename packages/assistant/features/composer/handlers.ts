import { handler, refuse } from "@widgetarium/core/requests";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { AttachmentFilesGateway } from "../../gateways/attachment-files/attachment-files.gateway.js";
import { AttachmentFolderGateway } from "../../gateways/attachment-folder/attachment-folder.gateway.js";
import { FOLDERS_NOT_HERE } from "../../gateways/attachment-folder/none.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { sweepFolder } from "../../shared/lib/attachment-sweep.js";
import { withAttachments } from "../../shared/lib/attachment-trailer.js";
import { ComposerPrefillStore } from "../../shared/lib/composer-prefill-store.js";
import { DraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import { FileDragStore } from "../../shared/lib/file-drag-store.js";
import { StarterStore } from "../../shared/lib/starter-store.js";
import { AssistantClientModule } from "../../module.js";
import { chosenOf, refusalOfCount, refusalOfReach } from "./lib/attachment-rules.js";
import { FileDropGateway } from "../../gateways/file-drop/file-drop.gateway.js";
import { withStarter } from "./lib/starter-said.js";
import { sentRecordOf, writtenOf } from "./lib/written-attachments.js";
import { attachDrafted, chipOf, draftedFiles, draftedFolders, offeredOf } from "./lib/drafted-attachments.js";
import {
	AttachDroppedCommand,
	AttachFilesCommand,
	AttachFolderCommand,
	AttachReachQuery,
	ComposerPrefillQuery,
	ComposerStarterQuery,
	DropStarterCommand,
	PickStarterCommand,
	DraftAttachmentsQuery,
	FileDragQuery,
	HearPageDragCommand,
	PrefillDraftCommand,
	RemoveAttachmentCommand,
	SendMessageCommand,
	SweepAttachmentsCommand,
	SlashCommandsQuery,
	ClearChatCommand,
	CompactChatCommand,
} from "./contract.js";
import type { SlashName } from "../../shared/schema/slash-command.schema.js";

const CLEARED = "the chat was cleared";
const SLASH_ALWAYS: readonly SlashName[] = ["clear"];
const SLASH_WITH_COMPACT: readonly SlashName[] = ["clear", "compact"];

const ALREADY_REMOVED = "That attachment was already removed";
const SENT = "sent with the message";
const REMOVED = "removed {name}";
const PREFILLED = "another app asked for a draft";
const PICKED = "a starter was pressed";
const DROPPED = "the starter chip was removed";
const DROPPED_ALREADY = "the dropped files were already attached";

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
		const counted = refusalOfCount(draftAttachmentsStore.now().length, files.length);

		if (counted) {
			return refuse(counted);
		}

		const drafted = await draftedFiles(files.map(offeredOf), chosenOf(await assistantSetupGateway.setup()));
		return attachDrafted(drafted, draftAttachmentsStore);
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
		attachmentFolderGateway: AttachmentFolderGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
		sentAttachmentsStore: SentAttachmentsStore,
		starterStore: StarterStore,
		clockGateway: ClockGateway,
	})
	.handle(async ({ said }, parts) => {
		const drafts = parts.draftAttachmentsStore.now();
		const started = withStarter(parts.starterStore.now(), said);

		if (drafts.length === 0) {
			await parts.assistantSessionGateway.send(started);
			parts.starterStore.change(null, SENT);
			return;
		}

		const provider = chosenOf(await parts.assistantSetupGateway.setup());
		const refusal = drafts.map((draft) => refusalOfReach(draft.kind, provider)).find((found) => found !== null);

		if (refusal) {
			return refuse(refusal);
		}

		const written = writtenOf(drafts, provider.reads, parts.attachmentFilesGateway);
		parts.attachmentFolderGateway.lend(drafts.flatMap(({ path }) => (path === null ? [] : [path])));

		try {
			await parts.assistantSessionGateway.send(withAttachments(started, written.entries));
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
		parts.starterStore.change(null, SENT);
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

export const AttachReachQueryHandler = handler(AttachReachQuery, AssistantClientModule)
	.inject({ attachmentFolderGateway: AttachmentFolderGateway })
	.handle((_input, { attachmentFolderGateway }) => ({ canAttachFolders: attachmentFolderGateway.canPick() }));

export const AttachFolderCommandHandler = handler(AttachFolderCommand, AssistantClientModule)
	.inject({
		assistantSetupGateway: AssistantSetupGateway,
		attachmentFolderGateway: AttachmentFolderGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
	})
	.handle(async (_input, { assistantSetupGateway, attachmentFolderGateway, draftAttachmentsStore }) => {
		if (!attachmentFolderGateway.canPick()) {
			return refuse(FOLDERS_NOT_HERE);
		}

		const provider = chosenOf(await assistantSetupGateway.setup());
		const refusal = refusalOfReach("folder", provider) ?? refusalOfCount(draftAttachmentsStore.now().length, 1);

		if (refusal) {
			return refuse(refusal);
		}

		const path = await attachmentFolderGateway.pick();

		if (path === null) {
			return;
		}

		return attachDrafted(draftedFolders([path], provider, draftAttachmentsStore.now()), draftAttachmentsStore);
	});

export const FileDragQueryHandler = handler(FileDragQuery, AssistantClientModule)
	.inject({
		fileDragStore: FileDragStore,
		fileDropGateway: FileDropGateway,
	})
	.watch((_input, { fileDragStore, fileDropGateway }, changed) => {
		const stopStore = fileDragStore.watch(changed);
		const stopHost = fileDropGateway.watch((event) => fileDragStore.hear(event));
		return () => {
			stopHost();
			stopStore();
		};
	})
	.handle((_input, { fileDragStore }) => fileDragStore.now());

export const HearPageDragCommandHandler = handler(HearPageDragCommand, AssistantClientModule)
	.inject({ fileDragStore: FileDragStore })
	.handle(({ drag }, { fileDragStore }) => fileDragStore.hearPage(drag));

export const AttachDroppedCommandHandler = handler(AttachDroppedCommand, AssistantClientModule)
	.inject({
		assistantSetupGateway: AssistantSetupGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
		fileDragStore: FileDragStore,
	})
	.handle(async ({ id }, { assistantSetupGateway, draftAttachmentsStore, fileDragStore }) => {
		const batch = fileDragStore.take(id);

		if (batch === null) {
			console.debug(`[widgetarium] drop ${id} not attached (${DROPPED_ALREADY})`);
			return;
		}

		const held = draftAttachmentsStore.now();
		const counted = refusalOfCount(held.length, batch.files.length + batch.folders.length);

		if (counted) {
			return refuse(counted);
		}

		const provider = chosenOf(await assistantSetupGateway.setup());
		const folders = draftedFolders(batch.folders, provider, held);

		if (folders.refusal) {
			return refuse(folders.refusal);
		}

		const files = await draftedFiles(batch.files, provider);
		return attachDrafted(
			{
				drafts: [...folders.drafts, ...files.drafts],
				refusal: files.refusal,
			},
			draftAttachmentsStore,
		);
	});

export const ComposerStarterQueryHandler = handler(ComposerStarterQuery, AssistantClientModule)
	.inject({ starterStore: StarterStore })
	.watch((_input, { starterStore }, changed) => starterStore.watch(changed))
	.handle((_input, { starterStore }) => starterStore.now());

export const PickStarterCommandHandler = handler(PickStarterCommand, AssistantClientModule)
	.inject({ starterStore: StarterStore })
	.handle(({ starter }, { starterStore }) => starterStore.change(starter, PICKED));

export const DropStarterCommandHandler = handler(DropStarterCommand, AssistantClientModule)
	.inject({ starterStore: StarterStore })
	.handle((_input, { starterStore }) => starterStore.change(null, DROPPED));

export const SlashCommandsQueryHandler = handler(SlashCommandsQuery, AssistantClientModule)
	.inject({
		assistantSessionGateway: AssistantSessionGateway,
		assistantSetupGateway: AssistantSetupGateway,
	})
	.handle(async (_input, { assistantSessionGateway, assistantSetupGateway }) => {
		if (!assistantSessionGateway.isAvailable()) {
			return [];
		}

		const setup = await assistantSetupGateway.setup();
		const chosen = setup.providers.find(({ id }) => id === setup.chosen);
		return [...(chosen?.compacts === true ? SLASH_WITH_COMPACT : SLASH_ALWAYS)];
	});

export const ClearChatCommandHandler = handler(ClearChatCommand, AssistantClientModule)
	.inject({
		assistantSessionGateway: AssistantSessionGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
		attachmentFilesGateway: AttachmentFilesGateway,
		sentAttachmentsStore: SentAttachmentsStore,
		clockGateway: ClockGateway,
	})
	.handle(async (_input, parts) => {
		await parts.assistantSessionGateway.clear();
		parts.draftAttachmentsStore.change([], CLEARED);
		sweepFolder(parts, {
			isBusy: false,
			now: parts.clockGateway.now(),
		});
	});

export const CompactChatCommandHandler = handler(CompactChatCommand, AssistantClientModule)
	.inject({ assistantSessionGateway: AssistantSessionGateway })
	.handle(async (_input, { assistantSessionGateway }) => {
		await assistantSessionGateway.compact();
	});
