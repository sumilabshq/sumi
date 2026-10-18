import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import type { AttachmentKind } from "../../../shared/schema/attachment.schema.js";
import { sizeSaid } from "../../../shared/lib/size-said.js";

export interface ChosenProvider {
	readonly label: string;
	readonly reads: ProviderReads;
}

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
export const MOST_ATTACHED = 10;

const READS_NOTHING: ProviderReads = {
	images: false,
	files: "none",
};
const NOT_ACCEPTED =
	"{name} can't be attached: only images (png, jpg, gif, webp) and text files (md, txt, json, ts, tsx, js, css, html, csv) can";
const TOO_LARGE = "{name} is {size}, over the {limit} limit for {what}";
const AN_IMAGE = "an image";
const A_TEXT_FILE = "a text file";
const TOO_MANY = "At most {count} files can be attached to one message";
const NO_FILES = "{label} can't read attached files";
const NO_IMAGES = "{label} can't read images";

export function kindOf(name: string): AttachmentKind | null {
	const extension = name.split(".").at(-1)?.toLowerCase() ?? "";

	if (extension in IMAGE_TYPES) {
		return "image";
	}

	return TEXT_EXTENSIONS.includes(extension) ? "text" : null;
}

export function chosenOf(setup: Pick<AssistantSetup, "providers" | "chosen" | "providerLabel">): ChosenProvider {
	const chosen = setup.providers.find(({ id }) => id === setup.chosen);
	return {
		label: chosen?.label ?? setup.providerLabel,
		reads: chosen?.reads ?? READS_NOTHING,
	};
}

export function refusalOfReach(kind: AttachmentKind, { label, reads }: ChosenProvider): string | null {
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

export function refusalOfCount(held: number, offered: number): string | null {
	return held + offered > MOST_ATTACHED ? TOO_MANY.replace("{count}", String(MOST_ATTACHED)) : null;
}
