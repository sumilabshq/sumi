import { bareAddressOf, isAddressLike } from "../../../shared/lib/address.js";
import type { Intent, MenuCommand, Where } from "../../../shared/schema/command-menu.schema.js";

const RAN: Readonly<Record<MenuCommand, string>> = {
	"new-chat": "Ran “New chat”",
	"new-tab": "New tab",
	"new-window": "Opened a window without a workspace",
};
const PLACE_SAID: Readonly<Record<Where, string>> = {
	"new-tab": "in a new tab",
	"this-tab": "in this tab",
	"new-window": "in a new window",
};

export function confirmationOf(intent: Intent): string {
	switch (intent.do) {
		case "reopen-closed":
			return `Reopened “${intent.title}”`;
		case "show-tab":
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
		case "open-link":
			return `Opened ${intent.href} ${PLACE_SAID[intent.where]}`;
		case "run":
			return RAN[intent.command];
		case "ask-ink":
			return askedSaidOf(intent.text, intent.sends);
		case "close-tab":
			return `Closed “${intent.title}”`;
		case "unsplit":
			return intent.title;
		case "open-door":
			return "";
	}
}

function askedSaidOf(text: string, sends: boolean): string {
	if (text === "") {
		return "New chat";
	}

	return sends ? `New chat: asked Sumi “${text}”` : `New chat: drafted “${text}”`;
}

function openedSaidOf(address: string, where: Where): string {
	const place = PLACE_SAID[where];

	if (isAddressLike(address)) {
		return `Opened ${bareAddressOf(address)} ${place}`;
	}

	return `Searched the web for “${address.trim()}” ${place}`;
}
