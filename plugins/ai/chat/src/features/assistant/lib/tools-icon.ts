import type { CallFace, CallKind } from "@widgetarium/core/engine/assistant-port.js";

const KIND_ICONS: Readonly<Record<CallKind, string>> = {
	search: "search",
	read: "file-text",
	edit: "pencil",
	run: "terminal",
	other: "wrench",
};

export function toolsIconOf(faces: readonly CallFace[]): string {
	const first = faces[0];

	return first === undefined ? KIND_ICONS.other : KIND_ICONS[first.kind];
}
