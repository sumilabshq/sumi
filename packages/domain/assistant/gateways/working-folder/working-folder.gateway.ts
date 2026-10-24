import type { WorkingFolders } from "../../shared/schema/working-folder.schema.js";

export abstract class WorkingFolderGateway {
	abstract folders(): Promise<WorkingFolders | null>;
	abstract watch(changed: () => void): () => void;
	abstract choose(path: string): Promise<void>;
	abstract pickAnother(): Promise<void>;
}
