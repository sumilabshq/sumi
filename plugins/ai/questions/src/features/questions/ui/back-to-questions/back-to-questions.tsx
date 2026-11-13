import type { ReactNode } from "react";
import { useOpenQuestions } from "../../lib/use-open-questions.js";

const BACK = "Back to questions";

export function BackToQuestions({ chatId }: { readonly chatId: string }): ReactNode {
	return useOpenQuestions(chatId).length === 0 ? null : BACK;
}
