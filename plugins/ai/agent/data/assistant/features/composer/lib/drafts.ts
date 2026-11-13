import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import { folderNameOf, shortPathOf } from "../../../shared/lib/short-path.js";
import type { AttachmentChip, FileKind } from "../../../shared/schema/attachment.schema.js";
import type { DroppedFile } from "../../../shared/schema/file-drag.schema.js";
import { IMAGE_TYPES, refusalOfReach } from "./attachment-rules.js";
import type { ChosenProvider } from "../../../shared/lib/chosen-provider.js";
import { sizeSaid } from "./size-said.js";

export interface Drafted {
	readonly drafts: readonly DraftAttachment[];
	readonly refusal: string | null;
}

export interface ReadFile {
	readonly name: string;
	readonly type: string;
	readonly bytes: Uint8Array;
}

export const FOLDER_SAID = "a folder you may read";

const NEW_LINE = 10;
const TEXT_SIZE = "{size} · {lines} lines";
const ALREADY_ATTACHED = "{name} is already attached";
const FOLDER_MIME = "inode/directory";
const NOT_TEXT = "{name} is not a text file";
const TEXT_MIME = "text/plain";
const CHUNK = 0x8000;

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

export function draftOfFile({ name, type, bytes }: ReadFile, kind: FileKind): Drafted {
	if (kind === "text" && !isUtf8(bytes)) {
		return refusedWith(NOT_TEXT.replace("{name}", name));
	}

	const mime = kind === "image" ? (IMAGE_TYPES[extensionOf(name)] ?? type) : TEXT_MIME;
	return {
		drafts: [
			{
				id: crypto.randomUUID(),
				name,
				kind,
				mime,
				bytes,
				preview: kind === "image" ? `data:${mime};base64,${base64Of(bytes)}` : null,
				path: null,
			},
		],
		refusal: null,
	};
}

export function draftedTogether(each: readonly Drafted[]): Drafted {
	const refusal = each.find((drafted) => drafted.refusal !== null)?.refusal ?? null;

	if (refusal !== null) {
		return refusedWith(refusal);
	}

	return {
		drafts: each.flatMap(({ drafts }) => drafts),
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

export function isSameDrafts(was: readonly DraftAttachment[], became: readonly DraftAttachment[]): boolean {
	return was.length === became.length && was.every((draft, at) => draft === became[at]);
}

export function namesOf(drafts: readonly DraftAttachment[]): string {
	return JSON.stringify(drafts.map(({ name }) => name));
}

export function refusedWith(refusal: string): Drafted {
	return {
		drafts: [],
		refusal,
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

function isUtf8(bytes: Uint8Array): boolean {
	try {
		new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		return !bytes.includes(0);
	} catch {
		return false;
	}
}

function extensionOf(name: string): string {
	return name.split(".").at(-1)?.toLowerCase() ?? "";
}

function base64Of(bytes: Uint8Array): string {
	const parts: string[] = [];

	for (let at = 0; at < bytes.length; at += CHUNK) {
		parts.push(String.fromCharCode(...bytes.subarray(at, at + CHUNK)));
	}

	return btoa(parts.join(""));
}
