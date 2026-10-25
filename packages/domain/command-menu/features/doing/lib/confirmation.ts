import { bareAddressOf, isAddressLike } from "../../../shared/lib/address.js";
import type { Intent, MenuCommand } from "../../../shared/schema/command-menu.schema.js";

const RAN: Readonly<Record<MenuCommand, string>> = {
	"new-chat": "Ran “New chat”",
	"new-tab": "New tab",
	"reopen-tab": "Reopened the last closed tab",
	"new-workspace": "Ran “New workspace”",
};

export function confirmationOf(intent: Intent): string {
	switch (intent.do) {
		case "reopen-closed":
			return `Reopened “${intent.title}”`;
		case "show-tab":
		case "show-essential":
			return `Switched to “${intent.title}”`;
		case "open-chat":
			return `Opened chat “${intent.title}”`;
		case "open-chat-elsewhere":
			return `Opened chat “${intent.title}” in ${intent.workspaceName}`;
		case "open-workspace":
			return `Switched to workspace ${intent.title}`;
		case "open-app":
			return `Opened ${intent.title}`;
		case "open-address":
			return openedSaidOf(intent.address, intent.where);
		case "run":
			return RAN[intent.command];
		case "ask-ink":
			return `New chat: asked Sumi “${intent.text}”`;
		case "new-chat":
			return `New chat “${intent.title}”`;
		case "new-workspace":
			return `New workspace “${intent.name}”`;
		case "close-tab":
			return `Closed “${intent.title}”`;
		case "pin-chat":
			return intent.isPinned ? "Pinned" : "Unpinned";
	}
}

function openedSaidOf(address: string, where: "new-tab" | "this-tab"): string {
	const place = where === "new-tab" ? "in a new tab" : "in this tab";

	if (isAddressLike(address)) {
		return `Opened ${bareAddressOf(address)} ${place}`;
	}

	return `Searched the web for “${address.trim()}” ${place}`;
}
