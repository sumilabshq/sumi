import type { ClaudeOptionAsked, ClaudeOptions } from "../../shared/schema/claude-options.schema.js";

export abstract class ClaudeOptionsGateway {
	abstract options(): ClaudeOptions | null;
	abstract watch(changed: () => void): () => void;
	abstract choose(asked: ClaudeOptionAsked): void;
}
