import type { ClaudeOptions } from "@widgetarium/assistant";

export interface ClaudeOptionsCell {
	value(): ClaudeOptions;
	save(next: ClaudeOptions): void;
	changed(listener: () => void): () => void;
}

export const DEFAULT_CLAUDE_OPTIONS: ClaudeOptions = {
	mode: "auto",
	model: "opus",
	effort: "medium",
	usage: null,
};

export function claudeOptionsCell(first: ClaudeOptions = DEFAULT_CLAUDE_OPTIONS): ClaudeOptionsCell {
	const listeners = new Set<() => void>();
	const held = { options: first };
	return {
		value: () => held.options,
		save: (next) => {
			held.options = next;
			for (const listener of [...listeners]) {
				listener();
			}
		},
		changed: (listener) => {
			listeners.add(listener);
			return () => void listeners.delete(listener);
		},
	};
}
