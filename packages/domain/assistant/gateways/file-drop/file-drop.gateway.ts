import type { FileDragEvent } from "../../shared/lib/file-drag-store.js";

export type { DroppedFile, FileDragEvent } from "../../shared/lib/file-drag-store.js";

export abstract class FileDropGateway {
	abstract watch(heard: (event: FileDragEvent) => void): () => void;
}
