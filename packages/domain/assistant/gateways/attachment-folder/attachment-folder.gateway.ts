export abstract class AttachmentFolderGateway {
	abstract canPick(): boolean;
	abstract pick(): Promise<string | null>;
	abstract lend(paths: readonly string[]): void;
}
