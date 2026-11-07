import type { AttachmentKind, FileKind } from "../../../shared/schema/attachment.schema.js";
import type { ChosenProvider } from "../../../shared/lib/chosen-provider.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import { sizeSaid } from "./size-said.js";

export interface OfferedFile {
	readonly name: string;
	readonly size: number;
}

export const IMAGE_TYPES: Readonly<Record<string, string>> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
};

export const TEXT_EXTENSIONS: readonly string[] = ["md", "txt", "json", "ts", "tsx", "js", "css", "html", "csv"];

export const LARGEST_IMAGE_BYTES = 10 * 1024 * 1024;
export const LARGEST_TEXT_BYTES = 1024 * 1024;

const NOT_ACCEPTED =
	"{name} can't be attached: only images (png, jpg, gif, webp) and text files (md, txt, json, ts, tsx, js, css, html, csv) can";
const TOO_LARGE = "{name} is {size}, over the {limit} limit for {what}";
const AN_IMAGE = "an image";
const A_TEXT_FILE = "a text file";
const TOO_MANY = "At most {count} files can be attached to one message";
const NO_FILES = "{label} can't read attached files";
const NO_IMAGES = "{label} can't read images";
const NO_FOLDERS = "{label} can't read attached folders";

export function kindOf(name: string): FileKind | null {
	const extension = name.split(".").at(-1)?.toLowerCase() ?? "";

	if (extension in IMAGE_TYPES) {
		return "image";
	}

	return TEXT_EXTENSIONS.includes(extension) ? "text" : null;
}

export function refusalOfReach(kind: AttachmentKind, { label, reads }: ChosenProvider): string | null {
	if (kind === "folder" && reads.files !== "path") {
		return NO_FOLDERS.replace("{label}", label);
	}

	if (reads.files === "none") {
		return NO_FILES.replace("{label}", label);
	}

	return kind === "image" && !reads.images ? NO_IMAGES.replace("{label}", label) : null;
}

export function refusalOfFile(file: OfferedFile, provider: ChosenProvider): string | null {
	const kind = kindOf(file.name);

	if (kind === null) {
		return NOT_ACCEPTED.replace("{name}", file.name);
	}

	const largest = kind === "image" ? LARGEST_IMAGE_BYTES : LARGEST_TEXT_BYTES;

	if (file.size > largest) {
		return TOO_LARGE.replace("{name}", file.name)
			.replace("{size}", sizeSaid(file.size))
			.replace("{limit}", sizeSaid(largest))
			.replace("{what}", kind === "image" ? AN_IMAGE : A_TEXT_FILE);
	}

	return refusalOfReach(kind, provider);
}

export function refusalOfCount(held: number, offered: number, { mostAttached }: ProviderReads): string | null {
	if (mostAttached === undefined || held + offered <= mostAttached) {
		return null;
	}

	return TOO_MANY.replace("{count}", String(mostAttached));
}

export const ACCEPTED = [...Object.keys(IMAGE_TYPES), ...TEXT_EXTENSIONS].map((extension) => `.${extension}`).join(",");
