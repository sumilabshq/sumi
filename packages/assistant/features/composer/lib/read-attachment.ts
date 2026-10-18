import type { DraftAttachment } from "../../../shared/lib/draft-attachments-store.js";
import type { AttachmentKind } from "../../../shared/schema/attachment.schema.js";
import { IMAGE_TYPES } from "./attachment-rules.js";

export interface ReadAttachment {
	readonly draft: DraftAttachment | null;
	readonly refusal: string | null;
}

const NOT_TEXT = "{name} is not a text file";
const TEXT_MIME = "text/plain";
const CHUNK = 0x8000;

export async function readAttachment(file: File, kind: AttachmentKind): Promise<ReadAttachment> {
	const bytes = new Uint8Array(await file.arrayBuffer());

	if (kind === "text" && !isUtf8(bytes)) {
		return {
			draft: null,
			refusal: NOT_TEXT.replace("{name}", file.name),
		};
	}

	const mime = kind === "image" ? (IMAGE_TYPES[extensionOf(file.name)] ?? file.type) : TEXT_MIME;
	return {
		draft: {
			id: crypto.randomUUID(),
			name: file.name,
			kind,
			mime,
			bytes,
			preview: kind === "image" ? `data:${mime};base64,${base64Of(bytes)}` : null,
		},
		refusal: null,
	};
}

export function textOf(bytes: Uint8Array): string {
	return new TextDecoder().decode(bytes);
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
