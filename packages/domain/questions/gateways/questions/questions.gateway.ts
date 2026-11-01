import type { Moved } from "../../shared/lib/question-moves.js";
import type { Question } from "../../shared/schema/question.schema.js";

export type QuestionsChange = (held: readonly Question[]) => Moved;

export type Changed = { readonly ok: true; readonly held: readonly Question[] } | { readonly ok: false; readonly refusal: string };

export abstract class QuestionsGateway {
	abstract questionsOf(chat: string): readonly Question[];
	abstract changeQuestions(chat: string, change: QuestionsChange, reason: string): Changed;
	abstract questionsChanged(listener: () => void): () => void;
}
