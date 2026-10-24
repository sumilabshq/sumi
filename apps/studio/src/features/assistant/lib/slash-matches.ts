import type { SlashName } from "@widgetarium/assistant";

export interface SlashFace {
	readonly said: string;
	readonly icon: string;
	readonly aliases: readonly string[];
}

export const SLASH_FACES: Readonly<Record<SlashName, SlashFace>> = {
	clear: {
		said: "New chat. This one stays in your history",
		icon: "message-square-plus",
		aliases: ["new", "reset"],
	},
	compact: {
		said: "Summarize the chat to free up context",
		icon: "fold-vertical",
		aliases: ["summarize"],
	},
};

const SLASH_QUERY = /^\/([a-z-]*)$/i;

export function slashMatchesOf(names: readonly SlashName[], draft: string): readonly SlashName[] | null {
	const typed = SLASH_QUERY.exec(draft)?.[1];
	if (typed === undefined) {
		return null;
	}

	const asked = typed.toLowerCase();
	return names.filter((name) => [name, ...SLASH_FACES[name].aliases].some((word) => word.startsWith(asked)));
}
