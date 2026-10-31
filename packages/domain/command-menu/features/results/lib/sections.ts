import type { Door, Row, RowKind, Section } from "../../../shared/schema/command-menu.schema.js";
import type { Draft } from "./drafts.js";
import type { Found } from "./found.js";

const KIND_LABEL: Readonly<Partial<Record<RowKind, string>>> = {
	tab: "Tab",
	chat: "Chat",
	app: "App",
	site: "Site",
	workspace: "Workspace",
	"closed-tab": "Closed tab",
};
const DO_LABEL: Readonly<Record<RowKind, string>> = {
	tab: "Switch",
	"closed-tab": "Reopen",
	chat: "Open chat",
	app: "Open",
	site: "Open",
	workspace: "Switch",
	address: "Open",
	search: "Search",
	ask: "Ask",
};
const OPENS_HERE = "Open here";
const MATCHED_KINDS: ReadonlySet<RowKind> = new Set(["tab", "chat", "app", "site", "workspace"]);

export function sectionsOf(drafts: readonly Draft[], matched: string, door: Door): readonly Section[] {
	return drafts
		.filter((draft) => draft.rows.length > 0)
		.map((draft) => ({
			label: draft.label,
			layout: draft.layout,
			rows: draft.rows.map((found) => rowOf(found, matched, draft.isFallback, door)),
		}));
}

export function ghostOf(typed: string, door: Door, hosts: readonly string[]): string {
	const lower = typed.toLowerCase();

	if (lower === "" || lower.includes(" ") || (door === "anywhere" && !lower.includes("."))) {
		return "";
	}

	return hosts.find((host) => host.startsWith(lower) && host !== lower)?.slice(lower.length) ?? "";
}

function rowOf(found: Found, matched: string, isFallback: boolean, door: Door): Row {
	return {
		key: found.key,
		kind: found.kind,
		title: found.title,
		meta: found.meta,
		icon: found.icon,
		match: isFallback ? null : matchOf(found, matched),
		kindLabel: KIND_LABEL[found.kind] ?? "",
		doLabel: doLabelOf(found, door),
		shortcut: found.shortcut,
		isFallback,
		intent: found.intent,
		renames: found.renames,
		actions: [...found.actions],
	};
}

function doLabelOf(found: Found, door: Door): string {
	if (door === "this-tab" && found.intent.do === "open-address" && found.intent.where === "this-tab") {
		return OPENS_HERE;
	}

	if (door === "ask" && found.kind === "ask") {
		return found.title;
	}

	return DO_LABEL[found.kind];
}

function matchOf(found: Found, matched: string): Row["match"] {
	if (matched === "" || !MATCHED_KINDS.has(found.kind)) {
		return null;
	}

	const start = found.title.toLowerCase().indexOf(matched);
	return start === -1
		? null
		: {
				start,
				length: matched.length,
			};
}
