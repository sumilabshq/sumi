import type { AgentSetup, ClaudeOptions } from "@widgetarium/assistant";

export const CLAUDE_CODE_PROVIDER_ID = "claude-code";

export function shownClaudeOptions(setup: AgentSetup | null, options: ClaudeOptions | null): ClaudeOptions | null {
	return setup?.chosen === CLAUDE_CODE_PROVIDER_ID ? options : null;
}
