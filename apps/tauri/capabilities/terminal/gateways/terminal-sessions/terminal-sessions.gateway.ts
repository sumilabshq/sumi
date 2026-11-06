import type { TerminalOutput, TerminalSize } from "../../shared/schema/terminal.schema.js";

const MOST_OUTPUT_CHARS = 262144;
const TELL_EVERY_MS = 50;

const NOT_STARTED: TerminalOutput = {
	output: "",
	status: "not-started",
	exitCode: null,
};

export abstract class TerminalSessionsGateway {
	private readonly held = new Map<string, TerminalOutput>();
	private readonly listeners = new Set<() => void>();
	private readonly telling = {
		isPending: false,
	};

	abstract start(session: string, size: TerminalSize): Promise<void>;

	abstract resize(session: string, size: TerminalSize): Promise<void>;

	abstract type(session: string, keys: string): Promise<void>;

	abstract send(session: string, line: string): Promise<void>;

	outputOf(session: string): TerminalOutput {
		return this.held.get(session) ?? NOT_STARTED;
	}

	onOutputChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	protected isRunning(session: string): boolean {
		return this.outputOf(session).status === "running";
	}

	protected recordStart(session: string): void {
		const held = this.outputOf(session);
		this.storeOutput(session, {
			...held,
			status: "running",
			exitCode: null,
		});
		console.info(`[terminal] session ${session}: ${held.status} → running`);
	}

	protected recordOutput(session: string, chunk: string): void {
		const held = this.outputOf(session);
		this.storeOutput(session, {
			...held,
			output: (held.output + chunk).slice(-MOST_OUTPUT_CHARS),
		});
	}

	protected recordExit(session: string, exitCode: number | null): void {
		this.storeOutput(session, {
			...this.outputOf(session),
			status: "exited",
			exitCode,
		});
		console.info(`[terminal] session ${session}: running → exited ${String(exitCode)}`);
	}

	private storeOutput(session: string, output: TerminalOutput): void {
		this.held.set(session, output);

		if (this.telling.isPending) {
			return;
		}

		this.telling.isPending = true;
		setTimeout(() => {
			this.telling.isPending = false;
			for (const listener of [...this.listeners]) {
				listener();
			}
		}, TELL_EVERY_MS);
	}
}
