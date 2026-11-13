import type { AskedQuestion } from "@widgetarium/questions/contract";
import type { AskQuestion } from "../../../shared/schema/ask.schema.js";

export function questionsToPost(asked: readonly AskQuestion[]): AskedQuestion[] {
	return asked.map(({ question, detail, options, multiple, ownAnswer, skipSays }) => ({
		question,
		detail: detail ?? "",
		options: (options ?? []).map((option) => ({
			label: option.label,
			detail: option.detail ?? "",
		})),
		multiple: multiple ?? false,
		ownAnswer: ownAnswer ?? true,
		skipSays: skipSays ?? "",
	}));
}
