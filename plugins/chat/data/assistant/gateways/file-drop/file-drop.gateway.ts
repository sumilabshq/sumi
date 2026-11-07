import type { FileDragEvent } from "../../shared/schema/file-drag.schema.js";

export abstract class FileDropGateway {
	abstract fileDragged(heard: (event: FileDragEvent) => void): () => void;
}
