import type { DroppedFile } from "../../shared/schema/file-drag.schema.js";

export interface DroppedBatch {
	readonly id: string;
	readonly files: readonly DroppedFile[];
	readonly folders: readonly string[];
}

export interface FileDragState {
	readonly pageDepth: number;
	readonly isHostOver: boolean;
	readonly dropped: DroppedBatch | null;
}

export abstract class FileDragGateway {
	abstract fileDrag(): FileDragState;
	abstract saveFileDrag(next: FileDragState): void;
}
