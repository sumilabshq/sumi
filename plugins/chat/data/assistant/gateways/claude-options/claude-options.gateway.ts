import type { ClaudeOptions } from "../../shared/schema/claude-options.schema.js";

export abstract class ClaudeOptionsGateway {
	abstract claudeOptions(): ClaudeOptions | null;
	abstract saveClaudeOptions(next: ClaudeOptions): void;
	abstract claudeOptionsChanged(listener: () => void): () => void;
}
