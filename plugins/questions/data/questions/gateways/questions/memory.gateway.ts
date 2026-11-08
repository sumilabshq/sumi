import type { Question } from "../../shared/schema/question.schema.js";
import { QuestionsGateway } from "./questions.gateway.js";
import type { Changed, QuestionsChange } from "./questions.gateway.js";

const NONE: readonly Question[] = [];

// TRADE-OFF: questions live in memory, so a restart drops them; a turn cannot outlive a restart either
export class MemoryQuestionsGateway extends QuestionsGateway {
	private readonly listeners = new Set<() => void>();
	private readonly chats = new Map<string, readonly Question[]>();

	questionsOf(chat: string): readonly Question[] {
		return this.chats.get(chat) ?? NONE;
	}

	changeQuestions(chat: string, change: QuestionsChange, reason: string): Changed {
		const was = this.questionsOf(chat);
		const moved = change(was);

		if (!moved.ok) {
			console.info(`[questions] chat ${chat}: ${reason} refused → ${moved.refusal}`);
			return moved;
		}

		this.chats.set(chat, moved.held);
		console.info(`[questions] chat ${chat}: ${reason} → ${statesOf(was)} → ${statesOf(moved.held)}`);
		for (const listener of [...this.listeners]) {
			listener();
		}

		return moved;
	}

	questionsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}

function statesOf(held: readonly Question[]): string {
	const open = held.filter(({ state }) => state === "open").length;
	const undelivered = held.filter(({ state, isDelivered }) => state !== "open" && !isDelivered).length;
	return `${open} open, ${undelivered} waiting delivery`;
}
