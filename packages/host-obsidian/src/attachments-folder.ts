import { PrivateFiles } from "./browser/private-files.js";

const FOLDER_NAME = "widgetarium-attachments-{user}";
const NO_USER = "user";

export interface AttachmentsFolder {
	readonly folder: string;
	readonly files: PrivateFiles;
}

export function attachmentsFolder(): string | null {
	return openAttachmentsFolder()?.folder ?? null;
}

export function openAttachmentsFolder(): AttachmentsFolder | null {
	if (typeof require !== "function") {
		return null;
	}

	const fs: typeof import("node:fs") = require("node:fs");
	const os: typeof import("node:os") = require("node:os");
	const uid = process.getuid?.() ?? null;
	const files = new PrivateFiles(fs, uid);
	const folder = `${os.tmpdir()}/${FOLDER_NAME.replace("{user}", uid === null ? NO_USER : String(uid))}`;
	files.makeFolders([folder]);
	return {
		folder,
		files,
	};
}
