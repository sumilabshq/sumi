import { AttachmentFolderGateway } from "./attachment-folder.gateway.js";

export interface FolderPicker {
	pick(): Promise<string | null>;
	lend(paths: readonly string[]): void;
}

export class PickerAttachmentFolderGateway extends AttachmentFolderGateway {
	constructor(private readonly picker: FolderPicker) {
		super();
	}

	canPick(): boolean {
		return true;
	}

	pick(): Promise<string | null> {
		return this.picker.pick();
	}

	lend(paths: readonly string[]): void {
		this.picker.lend(paths);
	}
}
