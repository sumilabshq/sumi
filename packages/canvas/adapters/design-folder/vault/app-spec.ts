import type { DataAdapter } from "obsidian";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import type { SpecRead } from "@widgetarium/core/app-spec.js";

export async function readAppSpec(adapter: Pick<DataAdapter, "read">, app: string): Promise<SpecRead | null> {
	const text = await adapter.read(specPathOf(app)).catch(() => null);
	if (text === null) return null;
	return readSpec(text);
}
