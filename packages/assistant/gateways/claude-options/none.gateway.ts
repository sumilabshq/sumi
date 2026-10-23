import { ClaudeOptionsGateway } from "./claude-options.gateway.js";

export const OPTIONS_NOT_HERE = "Claude Code's options are not offered on this host";

export class NoClaudeOptionsGateway extends ClaudeOptionsGateway {
	options(): null {
		return null;
	}

	watch(): () => void {
		return () => undefined;
	}

	choose(): void {
		throw new Error(OPTIONS_NOT_HERE);
	}
}
