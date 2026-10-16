import type { DataAdapter } from "obsidian";
import { lookPathOf } from "@widgetarium/core/app-look.js";
import { AppLook } from "./app-look.adapter.js";
import type { LookTextEdit } from "./app-look.adapter.js";

export class VaultAppLook extends AppLook {
	constructor(private readonly adapter: Pick<DataAdapter, "read" | "exists" | "process">) {
		super();
	}

	override read(app: string): Promise<string | null> {
		return this.adapter.read(lookPathOf(app)).catch(() => null);
	}

	override async change(app: string, edit: LookTextEdit): Promise<boolean> {
		const path = lookPathOf(app);
		if (!(await this.adapter.exists(path))) return false;
		await this.adapter.process(path, edit);
		return true;
	}
}
