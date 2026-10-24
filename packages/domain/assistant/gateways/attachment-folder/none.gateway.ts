import { AttachmentFolderGateway } from "./attachment-folder.gateway.js";

export const FOLDERS_NOT_HERE = "Folders cannot be attached on this host";

export class NoAttachmentFolderGateway extends AttachmentFolderGateway {
	canPick(): boolean {
		return false;
	}

	pickedFolder(): Promise<string | null> {
		return Promise.reject(new Error(FOLDERS_NOT_HERE));
	}

	lendFolders(): void {}
}
