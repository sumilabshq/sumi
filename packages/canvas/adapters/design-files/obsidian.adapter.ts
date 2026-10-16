import type { DataAdapter } from "obsidian";
import { DesignFiles } from "./design-files.adapter.js";
import type { TextEdit } from "./design-files.adapter.js";

type FilesAdapter = Pick<DataAdapter, "exists" | "read" | "mkdir" | "writeBinary" | "write" | "process">;

export class ObsidianDesignFiles extends DesignFiles {
	constructor(private readonly adapter: FilesAdapter) {
		super();
	}

	override exists(path: string): Promise<boolean> {
		return this.adapter.exists(path);
	}

	override read(path: string): Promise<string | null> {
		return this.adapter.read(path).catch(() => null);
	}

	override makeFolder(path: string): Promise<void> {
		return this.adapter.mkdir(path);
	}

	override writeBinary(path: string, data: ArrayBuffer): Promise<void> {
		return this.adapter.writeBinary(path, data);
	}

	override writeText(path: string, text: string): Promise<void> {
		return this.adapter.write(path, text);
	}

	override async changeText(path: string, edit: TextEdit): Promise<void> {
		await this.adapter.process(path, edit);
	}
}
