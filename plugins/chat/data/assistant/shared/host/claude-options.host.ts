import type { ClaudeOptions } from "../schema/claude-options.schema.js";

export interface ClaudeOptionsCell {
	value(): ClaudeOptions;
	save(next: ClaudeOptions): void;
	changed(listener: () => void): () => void;
}
