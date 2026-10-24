import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkWidget } from "@widgetarium/core/widget-check.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { isWidgetModule } from "@widgetarium/core/engine/widget-build.js";
import { cardIn } from "./entries.js";
import type { WidgetEntry } from "./widget-entry.js";

const STYLE_FILES = ["widget.css"];

export type WidgetFindings = ReturnType<typeof checkWidget>;

export async function checkedWidget(entry: WidgetEntry, surface: readonly string[]): Promise<WidgetFindings> {
	const card = await cardIn(entry.folder);
	const modules = await textsOf(entry, isWidgetModule);
	return checkWidget({
		id: entry.id,
		source: Object.values(modules).join("\n"),
		styles: Object.values(await textsOf(entry, (name) => STYLE_FILES.includes(name))).join("\n"),
		card: isObject(card) ? card : null,
		surface,
		modules,
	});
}

async function textsOf(entry: WidgetEntry, isWanted: (name: string) => boolean): Promise<Record<string, string>> {
	const texts: Record<string, string> = {};
	for (const name of (entry.files ?? []).filter(isWanted)) {
		texts[name] = await readFile(join(entry.folder ?? "", name), "utf8").catch(() => "");
	}

	return texts;
}
