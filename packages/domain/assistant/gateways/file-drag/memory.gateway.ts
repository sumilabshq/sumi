import { FileDragGateway } from "./file-drag.gateway.js";
import type { FileDragState } from "./file-drag.gateway.js";

const NOT_DRAGGING: FileDragState = {
	pageDepth: 0,
	isHostOver: false,
	dropped: null,
};

export class MemoryFileDragGateway extends FileDragGateway {
	private held: FileDragState = NOT_DRAGGING;

	fileDrag(): FileDragState {
		return this.held;
	}

	saveFileDrag(next: FileDragState): void {
		this.held = next;
	}
}
