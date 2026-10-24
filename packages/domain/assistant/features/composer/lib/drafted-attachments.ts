import { refuse } from "@widgetarium/core/requests";
import type { DraftAttachment, DraftAttachmentsStore } from "../../../shared/lib/draft-attachments-store.js";
import type { DroppedFile } from "../../../shared/lib/file-drag-store.js";
import { folderNameOf, shortPathOf } from "../../../shared/lib/short-path.js";
import { sizeSaid } from "../../../shared/lib/size-said.js";
import type { AttachmentChip } from "../../../shared/schema/attachment.schema.js";
import { kindOf, refusalOfFile, refusalOfReach } from "./attachment-rules.js";
import type { ChosenProvider } from "./attachment-rules.js";
import { readAttachment } from "./read-attachment.js";
import { FOLDER_SAID } from "./written-attachments.js";

export interface Drafted {
	readonly drafts: readonly DraftAttachment[];
	readonly refusal: string | null;
}

const ATTACHED = "attached {names}";
const NEW_LINE = 10;
const TEXT_SIZE = "{size} · {lines} lines";
const ALREADY_ATTACHED = "{name} is already attached";
const FOLDER_MIME = "inode/directory";

export function attachDrafted({ drafts, refusal }: Drafted, draftAttachmentsStore: DraftAttachmentsStore): void {
	if (refusal) {
		return refuse(refusal);
	}

	draftAttachmentsStore.change(
		[...draftAttachmentsStore.now(), ...drafts],
		ATTACHED.replace("{names}", drafts.map(({ name }) => name).join(", ")),
	);
}

export function chipOf(draft: DraftAttachment): AttachmentChip {
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

export function offeredOf(file: File): DroppedFile {
	return {
		name: file.name,
		size: file.size,
		file: () => Promise.resolve(file),
	};
}

export async function draftedFiles(offered: readonly DroppedFile[], provider: ChosenProvider): Promise<Drafted> {
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

export function draftedFolders(
	paths: readonly string[],
	provider: ChosenProvider,
	held: readonly DraftAttachment[],
): Drafted {
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

function textSizeOf(bytes: Uint8Array): string {
	const lines = bytes.reduce((count, byte) => (byte === NEW_LINE ? count + 1 : count), 1);
	return TEXT_SIZE.replace("{size}", sizeSaid(bytes.length)).replace("{lines}", String(lines));
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
