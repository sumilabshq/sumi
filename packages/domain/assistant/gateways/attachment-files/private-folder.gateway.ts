import type { PrivateFolder } from "../../shared/host/attachments-folder.host.js";
import { AttachmentFilesGateway } from "./attachment-files.gateway.js";

const SAFE_NAME = /[^A-Za-z0-9._-]/g;

export class PrivateFolderAttachmentFilesGateway extends AttachmentFilesGateway {
	constructor(
		private readonly privateFolder: PrivateFolder,
		private readonly folder: string,
	) {
		super();
	}

	saveAttachment(name: string, bytes: Uint8Array): string {
		const path = `${this.folder}/${crypto.randomUUID()}-${name.replace(SAFE_NAME, "_")}`;
		this.privateFolder.write(path, bytes);
		return path;
	}

	removeAttachment(path: string): void {
		this.privateFolder.remove(path);
	}

	removeAttachmentsOlderThan(ageMs: number, now: number): void {
		this.privateFolder.removeOlderThan(this.folder, ageMs, now);
	}
}
