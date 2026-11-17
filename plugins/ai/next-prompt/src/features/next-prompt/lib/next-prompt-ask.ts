import type { Chat } from "@widgetarium/assistant/contract";

const TEXT_MOST_CHARS = 3000;
const PROMPT_MOST_CHARS = 200;
const NOTHING_TO_SUGGEST = "NONE";
const QUOTES = /^["'«“`]+|["'»”`]+$/g;
const NEXT_PROMPT_ASK = [
	"A person works with their AI agent. Here is their last exchange.",
	"Guess the person's next message: short, at most 12 words, in the language the person writes in, as they would type it.",
	`Answer with the message only. If no next step is obvious, answer ${NOTHING_TO_SUGGEST}.`,
	"",
	"The person asked:",
	"{asked}",
	"",
	"The agent answered:",
	"{answered}",
].join("\n");

export function nextPromptAskOf(chat: Chat): string | null {
	const turns = chat.session.turns;
	const answered = turns.at(-1);
	const asked = [...turns].reverse().find(({ role }) => role === "user");

	if (answered?.role !== "agent" || answered.outcome !== "done" || asked === undefined) {
		return null;
	}

	return NEXT_PROMPT_ASK.replace("{asked}", asked.text.slice(-TEXT_MOST_CHARS)).replace(
		"{answered}",
		answered.text.slice(-TEXT_MOST_CHARS),
	);
}

export function nextPromptIn(said: string): string | null {
	const [firstLine = ""] = said.trim().split("\n");
	const prompt = firstLine.trim().replace(QUOTES, "").trim();

	if (prompt === "" || prompt === NOTHING_TO_SUGGEST || prompt.length > PROMPT_MOST_CHARS) {
		return null;
	}

	return prompt;
}
