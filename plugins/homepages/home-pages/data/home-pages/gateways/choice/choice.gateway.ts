export abstract class ChoiceGateway {
	abstract keptChoice(): Promise<string | null>;
	abstract keepChoice(id: string, reason: string): Promise<void>;
	abstract choiceChanged(listener: () => void): () => void;
}
