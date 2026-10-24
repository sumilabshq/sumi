import type { DataAdapter } from "obsidian";
import { textAt, textOrRefused } from "../../shared/lib/files/text-at.js";
import { DesignFilesGateway } from "./design-files.gateway.js";
import type { TextEdit } from "./design-files.gateway.js";

type FilesAdapter = Pick<DataAdapter, "exists" | "read" | "mkdir" | "writeBinary" | "write" | "process">;

export class ObsidianDesignFilesGateway extends DesignFilesGateway {
	constructor(private readonly adapter: FilesAdapter) {
		super();
	}

	override exists(path: string): Promise<boolean> {
		return this.adapter.exists(path);
	}

	override async read(path: string): Promise<string | null> {
		return textOrRefused(await textAt(this.adapter, path));
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
