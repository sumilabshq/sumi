import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export class MemoryTerminalSessionsGateway extends TerminalSessionsGateway {
	override send(app: string, line: string): Promise<void> {
		if (!this.isStarted(app)) {
			this.heardStart(app);
		}

		this.heardOutput(app, `${line}\r\n`);
		return Promise.resolve();
	}
}
