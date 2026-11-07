import type { FileDragEvent } from "../schema/file-drag.schema.js";

export interface FileDrops {
	fileDragged(heard: (event: FileDragEvent) => void): () => void;
}
