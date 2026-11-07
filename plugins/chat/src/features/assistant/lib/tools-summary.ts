import type { CallFace, CallKind } from "@widgetarium/core/engine/assistant-port.js";
import { countText } from "@widgetarium/core/engine/count-text.js";

interface DoneText {
	readonly one: string;
	readonly many: string;
}

const DONE_TEXT: Readonly<Record<CallKind, DoneText>> = {
	search: {
		one: "searched 1 pattern",
		many: "searched {count} patterns",
	},
	read: {
		one: "read 1 file",
		many: "read {count} files",
	},
	edit: {
		one: "edited 1 file",
		many: "edited {count} files",
	},
	run: {
		one: "ran a command",
		many: "ran {count} commands",
	},
	other: {
		one: "used 1 tool",
		many: "used {count} tools",
	},
};

// TRADE-OFF: a list of what was done is joined, not authored, because its parts vary per turn
export function toolsSummaryOf(faces: readonly CallFace[]): string {
	const kinds = [...new Set(faces.map(({ kind }) => kind))];
	const done = kinds
		.map((kind) => countText(countOfKind(faces, kind), DONE_TEXT[kind].one, DONE_TEXT[kind].many))
		.join(", ");
	return done.charAt(0).toUpperCase() + done.slice(1);
}

function countOfKind(faces: readonly CallFace[], kind: CallKind): number {
	const ofKind = faces.filter((face) => face.kind === kind);

	if (kind !== "edit") {
		return ofKind.length;
	}

	return new Set(ofKind.map((face) => face.change?.file ?? face.object)).size;
}
