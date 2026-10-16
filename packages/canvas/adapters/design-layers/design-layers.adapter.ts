export type SourceEdit = (source: string) => string;

export abstract class DesignLayers {
	abstract change(path: string, edit: SourceEdit): Promise<void>;
}
