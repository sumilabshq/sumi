import type { DataAdapter } from "obsidian";
import { DesignPhotos } from "../design-photos.adapter.js";
import type { TextEdit } from "../design-photos.adapter.js";

type PhotoAdapter = Pick<DataAdapter, "exists" | "mkdir" | "writeBinary" | "write" | "process">;

export class VaultDesignPhotos extends DesignPhotos {
	constructor(private readonly adapter: PhotoAdapter) {
		super();
	}

	override exists(path: string): Promise<boolean> {
		return this.adapter.exists(path);
	}

	override makeFolder(path: string): Promise<void> {
		return this.adapter.mkdir(path);
	}

	override writePhoto(path: string, data: ArrayBuffer): Promise<void> {
		return this.adapter.writeBinary(path, data);
	}

	override writeText(path: string, text: string): Promise<void> {
		return this.adapter.write(path, text);
	}

	override async changeText(path: string, edit: TextEdit): Promise<void> {
		await this.adapter.process(path, edit);
	}
}
