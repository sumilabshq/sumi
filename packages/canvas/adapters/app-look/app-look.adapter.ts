export type LookTextEdit = (text: string) => string;

export abstract class AppLook {
	abstract read(app: string): Promise<string | null>;
	abstract change(app: string, edit: LookTextEdit): Promise<boolean>;
}
