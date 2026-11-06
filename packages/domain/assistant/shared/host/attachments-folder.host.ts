import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";

export interface PrivateFolder {
	write(path: string, data: Uint8Array): void;
	remove(path: string): void;
	removeOlderThan(folder: string, ageMs: number, now: number): void;
}

export interface AttachmentsFolder {
	readonly folder: string | null;
	readonly files: PrivateFolder;
}

export const AttachmentsFolderHost = hostObject<AttachmentsFolder>("AttachmentsFolder", isAttachmentsFolder);

function isAttachmentsFolder(held: unknown): held is AttachmentsFolder {
	const folder = isObject(held) ? held["folder"] : undefined;
	return isObject(held) && isObject(held["files"]) && (folder === null || typeof folder === "string");
}
