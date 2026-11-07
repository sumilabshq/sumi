import { ClaudeOptionsGateway } from "./claude-options.gateway.js";

export const OPTIONS_NOT_HERE = "Claude Code's options are not offered on this host";

export class NoClaudeOptionsGateway extends ClaudeOptionsGateway {
	claudeOptions(): null {
		return null;
	}

	saveClaudeOptions(): void {
		throw new Error(OPTIONS_NOT_HERE);
	}

	claudeOptionsChanged(): () => void {
		return () => undefined;
	}
}
