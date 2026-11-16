import { ChoiceGateway } from "./choice.gateway.js";

export class MemoryChoiceGateway extends ChoiceGateway {
	private chosen: string | null = null;
	private readonly listeners = new Set<() => void>();

	override keptChoice(): Promise<string | null> {
		return Promise.resolve(this.chosen);
	}

	override keepChoice(id: string): Promise<void> {
		this.chosen = id;

		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve();
	}

	override choiceChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
