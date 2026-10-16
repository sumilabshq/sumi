import type { DataAdapter } from "obsidian";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec, SpecRead } from "@widgetarium/core/app-spec.js";

export async function readAppSpec(adapter: Pick<DataAdapter, "read">, app: string): Promise<SpecRead | null> {
	const text = await adapter.read(specPathOf(app)).catch(() => null);
	if (text === null) return null;
	return readSpec(text);
}

export function noteToReturnTo(pages: AppSpec["pages"], canvasPage: string, fromNote: string): string | null {
	const shown = pages.find((page) => page.name === canvasPage)?.note;
	if (shown) return shown;
	if (fromNote) return fromNote;
	return pages.find((page) => page.note)?.note ?? null;
}
