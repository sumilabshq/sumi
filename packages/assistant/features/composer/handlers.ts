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
import type { DraftAttachment } from "../../shared/lib/draft-attachments-store.js";
import { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import { FileDragStore } from "../../shared/lib/file-drag-store.js";
import type { DroppedFile } from "../../shared/lib/file-drag-store.js";
import { folderNameOf, shortPathOf } from "../../shared/lib/short-path.js";
import { StarterStore } from "../../shared/lib/starter-store.js";
import { sizeSaid } from "../../shared/lib/size-said.js";
import type { AttachmentChip } from "../../shared/schema/attachment.schema.js";
import { AssistantClientModule } from "../../module.js";
import { chosenOf, kindOf, refusalOfCount, refusalOfFile, refusalOfReach } from "./lib/attachment-rules.js";
import type { ChosenProvider } from "./lib/attachment-rules.js";
import { readAttachment } from "./lib/read-attachment.js";
import { FileDropGateway } from "../../gateways/file-drop/file-drop.gateway.js";
import { withStarter } from "./lib/starter-said.js";
import { FOLDER_SAID, sentRecordOf, writtenOf } from "./lib/written-attachments.js";
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
const ATTACHED = "attached {names}";
const PREFILLED = "another app asked for a draft";
const PICKED = "a starter was pressed";
const DROPPED = "the starter chip was removed";
const NEW_LINE = 10;
const TEXT_SIZE = "{size} · {lines} lines";
const DROPPED_ALREADY = "the dropped files were already attached";
const ALREADY_ATTACHED = "{name} is already attached";
const FOLDER_MIME = "inode/directory";

interface Drafted {
	readonly drafts: readonly DraftAttachment[];
	readonly refusal: string | null;
}

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

function attachDrafted({ drafts, refusal }: Drafted, draftAttachmentsStore: DraftAttachmentsStore): void {
	if (refusal) {
		return refuse(refusal);
	}

	draftAttachmentsStore.change(
		[...draftAttachmentsStore.now(), ...drafts],
		ATTACHED.replace("{names}", drafts.map(({ name }) => name).join(", ")),
	);
}

function chipOf(draft: DraftAttachment): AttachmentChip {
	if (draft.kind === "folder") {
		return {
			id: draft.id,
			name: draft.name,
			kind: draft.kind,
			size: FOLDER_SAID,
			bytes: 0,
			preview: null,
			where: shortPathOf(draft.path ?? ""),
		};
	}

	return {
		id: draft.id,
		name: draft.name,
		kind: draft.kind,
		size: draft.kind === "text" ? textSizeOf(draft.bytes) : sizeSaid(draft.bytes.length),
		bytes: draft.bytes.length,
		preview: draft.preview,
		where: null,
	};
}

function textSizeOf(bytes: Uint8Array): string {
	const lines = bytes.reduce((count, byte) => (byte === NEW_LINE ? count + 1 : count), 1);
	return TEXT_SIZE.replace("{size}", sizeSaid(bytes.length)).replace("{lines}", String(lines));
}

function offeredOf(file: File): DroppedFile {
	return {
		name: file.name,
		size: file.size,
		file: () => Promise.resolve(file),
	};
}

async function draftedFiles(offered: readonly DroppedFile[], provider: ChosenProvider): Promise<Drafted> {
	const refusal = offered.map((one) => refusalOfFile(one, provider)).find((found) => found !== null);

	if (refusal) {
		return refusedWith(refusal);
	}

	const read = await Promise.all(
		offered.map(async (one) => readAttachment(await one.file(), kindOf(one.name) ?? "text")),
	);
	const unread = read.find(({ refusal: found }) => found !== null)?.refusal;

	if (unread) {
		return refusedWith(unread);
	}

	return {
		drafts: read.flatMap(({ draft }) => (draft ? [draft] : [])),
		refusal: null,
	};
}

function draftedFolders(paths: readonly string[], provider: ChosenProvider, held: readonly DraftAttachment[]): Drafted {
	if (paths.length === 0) {
		return {
			drafts: [],
			refusal: null,
		};
	}

	const unreachable = refusalOfReach("folder", provider);

	if (unreachable) {
		return refusedWith(unreachable);
	}

	const twice = paths.find((path) => held.some((draft) => draft.path === path));

	if (twice !== undefined) {
		return refusedWith(ALREADY_ATTACHED.replace("{name}", folderNameOf(twice)));
	}

	return {
		drafts: paths.map(folderDraftOf),
		refusal: null,
	};
}

function folderDraftOf(path: string): DraftAttachment {
	return {
		id: crypto.randomUUID(),
		name: folderNameOf(path),
		kind: "folder",
		mime: FOLDER_MIME,
		bytes: new Uint8Array(),
		preview: null,
		path,
	};
}

function refusedWith(refusal: string): Drafted {
	return {
		drafts: [],
		refusal,
	};
}
