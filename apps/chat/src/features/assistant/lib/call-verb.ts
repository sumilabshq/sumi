import type { CallFace, CallKind } from "@widgetarium/core/engine/assistant-port.js";

const DONE_VERBS: Readonly<Record<CallKind, string>> = {
	search: "Searched",
	read: "Read",
	edit: "Edited",
	run: "Ran",
	other: "",
};

export function callVerbOf(face: CallFace, isAnswered: boolean): string {
	if (!isAnswered && face.doing !== "") {
		return capitalized(face.doing);
	}

	const done = DONE_VERBS[face.kind];
	return done === "" ? capitalized(face.verb) : done;
}

function capitalized(said: string): string {
	return said.charAt(0).toUpperCase() + said.slice(1);
}
