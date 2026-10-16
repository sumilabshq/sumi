import type { AppSpec } from "@widgetarium/core/app-spec.js";

export function noteToReturnTo(pages: AppSpec["pages"], canvasPage: string, fromNote: string): string | null {
	const shown = pages.find((page) => page.name === canvasPage)?.note;
	if (shown) return shown;
	if (fromNote) return fromNote;
	return pages.find((page) => page.note)?.note ?? null;
}
