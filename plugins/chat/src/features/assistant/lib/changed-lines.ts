import type { CallFace } from "@widgetarium/core/engine/assistant-port.js";

export interface ChangedLines {
	readonly added: number;
	readonly removed: number;
}

export function changedLinesOf(faces: readonly CallFace[]): ChangedLines | null {
	const changes = faces.flatMap(({ change }) => (change ? [change] : []));

	if (changes.length === 0) {
		return null;
	}

	return {
		added: changes.reduce((sum, { added }) => sum + added, 0),
		removed: changes.reduce((sum, { removed }) => sum + removed, 0),
	};
}
