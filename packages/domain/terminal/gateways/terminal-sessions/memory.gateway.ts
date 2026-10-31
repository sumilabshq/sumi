import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export class MemoryTerminalSessionsGateway extends TerminalSessionsGateway {
	override send(app: string, line: string): Promise<void> {
		if (!this.isRunning(app)) {
			this.recordStart(app);
		}

		this.recordOutput(app, `${line}\r\n`);
		return Promise.resolve();
	}
}
