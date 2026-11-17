import type { Chat } from "@widgetarium/assistant/contract";

const TITLE_MOST_CHARS = 60;
const TEXT_MOST_CHARS = 2000;
const QUOTES = /^["'«“`]+|["'»”`.]+$/g;
const LABEL_BEFORE_NAME = /^[^:\s]+(?:\s[^:\s]+){0,2}:\s+/u;
const TITLE_ASK = [
	"Name this chat between a person and their AI agent in 3 to 6 words, in the language the person writes in.",
	"Name its subject, not the chat itself. Answer with the bare name: no label such as 'Title:' or 'Назва чату:', no quotes.",
	"",
	"The person asked:",
	"{asked}",
	"",
	"The agent answered:",
	"{answered}",
].join("\n");

export function titleAskOf(chat: Chat): string | null {
	if (chat.session.busy) {
		return null;
	}

	const turns = chat.session.turns;
	const asked = turns.find(({ role }) => role === "user");
	const answered = turns.find(({ role, outcome }) => role === "agent" && outcome === "done");

	if (asked === undefined || answered === undefined) {
		return null;
	}

	return TITLE_ASK.replace("{asked}", asked.text.slice(0, TEXT_MOST_CHARS)).replace(
		"{answered}",
		answered.text.slice(0, TEXT_MOST_CHARS),
	);
}

export function latestTitleAskOf(chat: Chat): string | null {
	const turns = [...chat.session.turns].reverse();
	const asked = turns.find(({ role }) => role === "user");
	const answered = turns.find(({ role }) => role === "agent");

	if (asked === undefined) {
		return null;
	}

	return TITLE_ASK.replace("{asked}", asked.text.slice(-TEXT_MOST_CHARS)).replace(
		"{answered}",
		(answered?.text ?? "").slice(-TEXT_MOST_CHARS),
	);
}

export function titleIn(said: string): string | null {
	const [firstLine = ""] = said.trim().split("\n");
	const title = firstLine.trim().replace(LABEL_BEFORE_NAME, "").replace(QUOTES, "").trim();

	if (title === "") {
		return null;
	}

	return title.length <= TITLE_MOST_CHARS ? title : `${title.slice(0, TITLE_MOST_CHARS - 1).trimEnd()}…`;
}
