import { hostOf, isAddressLike } from "../../../shared/lib/address.js";
import type { Intent, Scope } from "../../../shared/schema/command-menu.schema.js";
import type { Typed } from "./drafts.js";

export function typedOf(text: string): Typed {
	const trimmed = text.trim();
	const isAddress = isAddressLike(trimmed);
	const host = isAddress ? hostOf(trimmed) : "";
	return {
		text: trimmed,
		lower: trimmed.toLowerCase(),
		isAddress,
		host,
		matched: isAddress ? (host.replace(/^www\./, "").split(".")[0] ?? "") : trimmed.toLowerCase(),
	};
}

export function makeNewOf(typed: Typed, scope: Scope): Intent | null {
	if (scope === "chats") {
		return {
			do: "new-chat",
			title: typed.text,
		};
	}

	if (scope === "workspaces") {
		return {
			do: "new-workspace",
			name: typed.text,
		};
	}

	if (typed.text === "") {
		return null;
	}

	return {
		do: "open-address",
		address: typed.text,
		where: "new-tab",
	};
}

const MAKE_NEW_LABEL: Readonly<Record<Scope, string>> = {
	all: "New tab",
	tabs: "New tab",
	apps: "New tab",
	chats: "New chat",
	workspaces: "New workspace",
};

export function makeNewLabelOf(scope: Scope): string {
	return MAKE_NEW_LABEL[scope];
}

export function askInkOf(typed: Typed): Intent | null {
	if (typed.text === "") {
		return null;
	}

	return {
		do: "ask-ink",
		text: typed.text,
	};
}
