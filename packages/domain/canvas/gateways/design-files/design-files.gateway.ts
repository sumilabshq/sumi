export type TextEdit = (text: string) => string;

export abstract class DesignFilesGateway {
	abstract exists(path: string): Promise<boolean>;
	abstract makeFolder(path: string): Promise<void>;
	abstract writeBinary(path: string, data: ArrayBuffer): Promise<void>;
	abstract writeText(path: string, text: string): Promise<void>;
	abstract changeText(path: string, edit: TextEdit): Promise<void>;
}
