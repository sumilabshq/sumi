import type { ModuleFacts, Platform } from "@widgetarium/core/requests";
import { MemoryQuestionsGateway } from "../questions/memory.gateway.js";
import type { QuestionsGateway } from "../questions/questions.gateway.js";

export type QuestionsParts = {
	readonly questions: QuestionsGateway;
};

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => QuestionsParts>> = {
	browser: memoryQuestionsParts,
	tauri: memoryQuestionsParts,
	server: memoryQuestionsParts,
};

export function questionsPartsOn(facts: ModuleFacts): QuestionsParts {
	return PARTS_ON[facts.platform](facts);
}

export function memoryQuestionsParts(): QuestionsParts {
	return {
		questions: new MemoryQuestionsGateway(),
	};
}
