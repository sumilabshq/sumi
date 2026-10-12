import { contentHash } from "@widgetarium/core/engine/content-hash.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";

let lookStamp: string | null = null;

export function gpuFrameIdOf(widget: string, state: string): string {
	return `${widget}#${state}`;
}

export function snapshotKeyOf(registry: Drawing["registry"], widget: string, state: string, drawn: unknown): string {
	const definition = registry.get(widget);
	const builds = [widget, ...(definition?.uses ?? [])].map((id) => registry.get(id)?.buildKey ?? id);
	return contentHash(JSON.stringify([builds, state, drawn, lookStampOf()]));
}

function lookStampOf(): string {
	lookStamp ??= contentHash(
		[...document.querySelectorAll("style")]
			.map((style) => style.textContent ?? "")
			.filter((sheet) => sheet.includes(".wg-"))
			.join("\n"),
	);
	return `${lookStamp}:${document.body.classList.contains("theme-dark") ? "dark" : "light"}`;
}
