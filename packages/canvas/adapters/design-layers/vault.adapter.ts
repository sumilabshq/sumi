import type { DataAdapter } from "obsidian";
import { DesignLayers } from "./design-layers.adapter.js";
import type { SourceEdit } from "./design-layers.adapter.js";

export class VaultDesignLayers extends DesignLayers {
	constructor(private readonly adapter: Pick<DataAdapter, "process">) {
		super();
	}

	override async change(path: string, edit: SourceEdit): Promise<void> {
		await this.adapter.process(path, edit);
	}
}
