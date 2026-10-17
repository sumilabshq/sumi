import type {
	AssistantCall,
	CallChange,
	CallFace,
	CallKind,
	CallMeta,
} from "@widgetarium/core/engine/assistant-port.js";
import { callChangeOf } from "./call-change.js";
import { countText } from "@widgetarium/core/engine/count-text.js";
import { clipLine, glyphOf, isFileChange, ourCallOf, ourStepOf, shortPathOf } from "./tools.js";

interface Named {
	readonly verb: string;
	readonly doing: string;
	readonly object: string;
	readonly isCodeObject: boolean;
}

interface ToolNaming {
	readonly kind?: Exclude<CallKind, "edit">;
	readonly verb: string;
	readonly doing: string;
	readonly field: string;
	readonly isCode: boolean;
	readonly objectOf?: (held: string) => string;
}

const LONGEST_OBJECT = 80;
const RAN = { verb: "Ran", doing: "Running" };
const ONE_HIT = "1 hit";
const HITS = "{count} hits";
const ONE_LINE = "1 line";
const LINES = "{count} lines";

const NAMING_BY_TOOL: Readonly<Record<string, ToolNaming>> = {
	Grep: { kind: "search", verb: "Searched", doing: "Searching", field: "pattern", isCode: true },
	Glob: { kind: "search", verb: "Searched", doing: "Searching", field: "pattern", isCode: true },
	WebSearch: {
		kind: "search",
		verb: "Searched the web for",
		doing: "Searching the web for",
		field: "query",
		isCode: false,
	},
	Read: { kind: "read", verb: "Read", doing: "Reading", field: "file_path", isCode: false, objectOf: shortPathOf },
	NotebookRead: {
		kind: "read",
		verb: "Read",
		doing: "Reading",
		field: "notebook_path",
		isCode: false,
		objectOf: shortPathOf,
	},
	WebFetch: { kind: "read", verb: "Read", doing: "Reading", field: "url", isCode: false, objectOf: hostOf },
	Write: { verb: "Wrote", doing: "Writing", field: "file_path", isCode: false, objectOf: shortPathOf },
	Edit: { verb: "Edited", doing: "Editing", field: "file_path", isCode: false, objectOf: shortPathOf },
	MultiEdit: {
		verb: "Edited",
		doing: "Editing",
		field: "file_path",
		isCode: false,
		objectOf: shortPathOf,
	},
	NotebookEdit: {
		verb: "Edited",
		doing: "Editing",
		field: "notebook_path",
		isCode: false,
		objectOf: shortPathOf,
	},
	Bash: { kind: "run", ...RAN, field: "command", isCode: true },
};

export function callFaceOf(call: AssistantCall): CallFace {
	const naming = NAMING_BY_TOOL[call.name];
	const kind: CallKind = isFileChange(call) ? "edit" : (naming?.kind ?? "other");
	const change = kind === "edit" ? callChangeOf(call) : null;
	return {
		kind,
		glyph: glyphOf(call),
		...namedOf(call, naming),
		meta: metaOf(call, kind, change),
		change,
	};
}

function namedOf(call: AssistantCall, naming: ToolNaming | undefined): Named {
	const ours = ourCallOf(call);
	if (ours) {
		return { ...RAN, object: clipLine(ourStepOf(ours), LONGEST_OBJECT), isCodeObject: true };
	}

	const described = stringIn(call, "description");
	if (described !== "") {
		return plainNamed(described);
	}

	const held = naming ? stringIn(call, naming.field) : "";
	return naming && held !== "" ? toolNamed(naming, held) : plainNamed(call.name);
}

function toolNamed(naming: ToolNaming, held: string): Named {
	const object = clipLine(naming.objectOf ? naming.objectOf(held) : held, LONGEST_OBJECT);
	return { verb: naming.verb, doing: naming.doing, object, isCodeObject: naming.isCode };
}

function plainNamed(said: string): Named {
	return { verb: "", doing: "", object: clipLine(said, LONGEST_OBJECT), isCodeObject: false };
}

function metaOf(call: AssistantCall, kind: CallKind, change: CallChange | null): CallMeta | null {
	if (!call.answered) {
		return null;
	}

	if (call.failed || kind === "run") {
		return { kind: "verdict", passed: !call.failed };
	}

	if (change) {
		return { kind: "change", added: change.added, removed: change.removed };
	}

	return countMetaOf(call, kind);
}

function countMetaOf(call: AssistantCall, kind: CallKind): CallMeta | null {
	const counted = call.outputCounts;
	if (kind === "search" && counted?.hits !== undefined) {
		return { kind: "count", said: countText(counted.hits, ONE_HIT, HITS) };
	}

	if (kind === "read" && counted?.lines !== undefined) {
		return { kind: "count", said: countText(counted.lines, ONE_LINE, LINES) };
	}

	return null;
}

function stringIn(call: AssistantCall, field: string): string {
	const held = call.input[field];
	return typeof held === "string" ? held.trim() : "";
}

function hostOf(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}
