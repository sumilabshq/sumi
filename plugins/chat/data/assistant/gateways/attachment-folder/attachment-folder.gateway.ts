export abstract class AttachmentFolderGateway {
	abstract canPick(): boolean;
	abstract pickedFolder(): Promise<string | null>;
	abstract lendFolders(paths: readonly string[]): void;
}
