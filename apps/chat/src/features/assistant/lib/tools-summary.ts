import type { CallFace, CallKind } from "@widgetarium/core/engine/assistant-port.js";
import { countText } from "@widgetarium/core/engine/count-text.js";

interface DoneText {
	readonly one: string;
	readonly many: string;
}

const USED_ONE = "Used 1 tool";
const USED_MANY = "Used {count} tools";
const USED_AND_DONE = "{used} · {done}";

const DONE_TEXT: Readonly<Record<CallKind, DoneText>> = {
	search: {
		one: "searched",
		many: "searched",
	},
	read: {
		one: "read",
		many: "read",
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
		one: "",
		many: "",
	},
};

export function toolsSummaryOf(faces: readonly CallFace[]): string {
	const used = countText(faces.length, USED_ONE, USED_MANY);
	const done = doneTextOf(faces);
	return done === "" ? used : USED_AND_DONE.replace("{used}", used).replace("{done}", done);
}

// TRADE-OFF: a list of what was done is joined, not authored, because its parts vary per turn
function doneTextOf(faces: readonly CallFace[]): string {
	const kinds = [...new Set(faces.map(({ kind }) => kind))];
	return kinds
		.map((kind) => countText(countOfKind(faces, kind), DONE_TEXT[kind].one, DONE_TEXT[kind].many))
		.filter((said) => said !== "")
		.join(", ");
}

function countOfKind(faces: readonly CallFace[], kind: CallKind): number {
	const ofKind = faces.filter((face) => face.kind === kind);

	if (kind !== "edit") {
		return ofKind.length;
	}

	return new Set(ofKind.map((face) => face.change?.file ?? face.object)).size;
}
