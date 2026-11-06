import type { TerminalSize } from "../../shared/schema/terminal.schema.js";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export class MemoryTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly startCountByApp = new Map<string, number>();
	private readonly sizeByApp = new Map<string, TerminalSize>();

	override start(app: string, size: TerminalSize): Promise<void> {
		if (this.isRunning(app)) {
			return Promise.resolve();
		}

		this.startCountByApp.set(app, this.startCountOf(app) + 1);
		this.sizeByApp.set(app, size);
		this.recordStart(app);
		return Promise.resolve();
	}

	override resize(app: string, size: TerminalSize): Promise<void> {
		this.sizeByApp.set(app, size);
		return Promise.resolve();
	}

	override type(app: string, keys: string): Promise<void> {
		this.recordOutput(app, keys);
		return Promise.resolve();
	}

	override send(app: string, line: string): Promise<void> {
		return this.type(app, `${line}\r\n`);
	}

	startCountOf(app: string): number {
		return this.startCountByApp.get(app) ?? 0;
	}

	sizeOf(app: string): TerminalSize | null {
		return this.sizeByApp.get(app) ?? null;
	}
}
