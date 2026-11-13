import { AttachmentFilesGateway } from "./attachment-files.gateway.js";

export const FILES_NOT_HERE = "Files cannot be attached on this host";

export class NoAttachmentFilesGateway extends AttachmentFilesGateway {
	saveAttachment(): string {
		throw new Error(FILES_NOT_HERE);
	}

	removeAttachment(): void {}

	removeAttachmentsOlderThan(): void {}
}
