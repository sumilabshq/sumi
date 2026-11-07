import type { FolderLending } from "../../shared/host/folder-lending.host.js";
import { AttachmentFolderGateway } from "./attachment-folder.gateway.js";

export class LendingAttachmentFolderGateway extends AttachmentFolderGateway {
	constructor(private readonly lending: FolderLending) {
		super();
	}

	canPick(): boolean {
		return true;
	}

	pickedFolder(): Promise<string | null> {
		return this.lending.pick();
	}

	lendFolders(paths: readonly string[]): void {
		this.lending.lend(paths);
	}
}
