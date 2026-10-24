import { AttachmentFilesGateway } from "./attachment-files.gateway.js";

export interface PrivateFolder {
	write(path: string, data: Uint8Array): void;
	remove(path: string): void;
	removeOlderThan(folder: string, ageMs: number, now: number): void;
}

const SAFE_NAME = /[^A-Za-z0-9._-]/g;

export class PrivateFolderAttachmentFilesGateway extends AttachmentFilesGateway {
	constructor(
		private readonly privateFolder: PrivateFolder,
		private readonly folder: string,
	) {
		super();
	}

	write(name: string, bytes: Uint8Array): string {
		const path = `${this.folder}/${crypto.randomUUID()}-${name.replace(SAFE_NAME, "_")}`;
		this.privateFolder.write(path, bytes);
		return path;
	}

	remove(path: string): void {
		this.privateFolder.remove(path);
	}

	removeOlderThan(ageMs: number, now: number): void {
		this.privateFolder.removeOlderThan(this.folder, ageMs, now);
	}
}
