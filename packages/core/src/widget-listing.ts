import { CATALOGUE_COPY_DIR } from "./paths.js";
import type { Fields } from "./engine/catalogue-index.js";
import type { WidgetLookup } from "./registry.js";

interface ManifestHolder {
	readonly manifest?: Fields | null | undefined;
	readonly folder?: string | null | undefined;
}

export function boardWidgets<Entry extends ManifestHolder>(entries: readonly Entry[]): Entry[] {
	return entries.filter((entry) => !isInlineOnly(entry) && !isCatalogueCopy(entry));
}

export function inlineWidgets<Entry extends ManifestHolder>(entries: readonly Entry[]): Entry[] {
	return entries.filter((entry) => entry.manifest?.["inline"] === true && !isCatalogueCopy(entry));
}

export function declaredName(registry: WidgetLookup | null | undefined, id: string): unknown {
	const manifest = registry?.get(id)?.manifest;
	return manifest?.["view"] ?? manifest?.["title"] ?? id;
}

export function declaredLabel(registry: WidgetLookup | null | undefined, id: string): string {
	return String(declaredName(registry, id));
}

function isInlineOnly(entry: ManifestHolder): boolean {
	return entry.manifest?.["inline"] === true && !entry.manifest["defaultSize"];
}

function isCatalogueCopy(entry: ManifestHolder): boolean {
	return entry.folder?.startsWith(`${CATALOGUE_COPY_DIR}/`) === true;
}
