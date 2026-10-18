import { AttachmentFilesGateway } from "./attachment-files.gateway.js";

export const FILES_NOT_HERE = "Files cannot be attached on this host";

export class WebAttachmentFilesGateway extends AttachmentFilesGateway {
	write(): string {
		throw new Error(FILES_NOT_HERE);
	}

	remove(): void {}

	removeOlderThan(): void {}
}
