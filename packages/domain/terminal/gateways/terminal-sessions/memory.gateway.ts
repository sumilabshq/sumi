import type { TerminalSize } from "../../shared/schema/terminal.schema.js";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export class MemoryTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly startCountBySession = new Map<string, number>();
	private readonly sizeBySession = new Map<string, TerminalSize>();

	override start(session: string, size: TerminalSize): Promise<void> {
		if (this.isRunning(session)) {
			return Promise.resolve();
		}

		this.startCountBySession.set(session, this.startCountOf(session) + 1);
		this.sizeBySession.set(session, size);
		this.recordStart(session);
		return Promise.resolve();
	}

	override resize(session: string, size: TerminalSize): Promise<void> {
		this.sizeBySession.set(session, size);
		return Promise.resolve();
	}

	override type(session: string, keys: string): Promise<void> {
		this.recordOutput(session, keys);
		return Promise.resolve();
	}

	override send(session: string, line: string): Promise<void> {
		return this.type(session, `${line}\r\n`);
	}

	startCountOf(session: string): number {
		return this.startCountBySession.get(session) ?? 0;
	}

	sizeOf(session: string): TerminalSize | null {
		return this.sizeBySession.get(session) ?? null;
	}
}
