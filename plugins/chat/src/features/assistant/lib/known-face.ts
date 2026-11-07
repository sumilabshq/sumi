import type { AssistantCall, CallFace, CallKind } from "@widgetarium/core/engine/assistant-port.js";
import { folderNameOf } from "./short-path.js";

const TOOL_KINDS: Readonly<Record<string, CallKind>> = {
	Read: "read",
	NotebookRead: "read",
	Edit: "edit",
	MultiEdit: "edit",
	Write: "edit",
	NotebookEdit: "edit",
	Bash: "run",
	Grep: "search",
	Glob: "search",
};
const PATH_KEYS = ["file_path", "notebook_path", "path"];
const TEXT_KEYS = ["command", "pattern", "url", "query"];
const IMAGE_FILE = /\.(?:png|jpe?g|gif|webp|heic|svg)$/i;
const IMAGE_SAID = "image";

export function knownFaceOf(call: AssistantCall, face: CallFace): CallFace {
	if (face.kind !== "other" || face.verb !== "") {
		return face;
	}

	return {
		...face,
		kind: Object.hasOwn(TOOL_KINDS, call.name) ? (TOOL_KINDS[call.name] ?? "other") : "other",
		verb: call.name,
		object: inputObjectOf(call),
	};
}

export function knownFacesOf(calls: readonly AssistantCall[], faces: readonly CallFace[]): readonly CallFace[] {
	return faces.map((face, at) => {
		const call = calls[at];
		return call ? knownFaceOf(call, face) : face;
	});
}

function inputObjectOf(call: AssistantCall): string {
	const path = firstTextOf(call, PATH_KEYS);

	if (path !== null) {
		return IMAGE_FILE.test(path) ? IMAGE_SAID : folderNameOf(path);
	}

	return firstTextOf(call, TEXT_KEYS) ?? "";
}

function firstTextOf(call: AssistantCall, keys: readonly string[]): string | null {
	for (const key of keys) {
		const value = call.input[key];

		if (typeof value === "string" && value !== "") {
			return value;
		}
	}

	return null;
}
