import type { FileDrops } from "../../shared/host/file-drops.host.js";
import type { FileDragEvent } from "../../shared/schema/file-drag.schema.js";
import { FileDropGateway } from "./file-drop.gateway.js";

export class HostFileDropGateway extends FileDropGateway {
	constructor(private readonly drops: FileDrops) {
		super();
	}

	fileDragged(heard: (event: FileDragEvent) => void): () => void {
		return this.drops.fileDragged(heard);
	}
}
