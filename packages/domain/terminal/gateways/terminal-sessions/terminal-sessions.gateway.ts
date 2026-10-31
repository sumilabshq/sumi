import type { TerminalOutput } from "../../shared/schema/terminal.schema.js";

const MOST_OUTPUT_CHARS = 262144;

const NOT_STARTED: TerminalOutput = {
	output: "",
	isRunning: false,
	exitCode: null,
};

export abstract class TerminalSessionsGateway {
	private readonly held = new Map<string, TerminalOutput>();
	private readonly listeners = new Set<() => void>();

	abstract send(app: string, line: string): Promise<void>;

	outputOf(app: string): TerminalOutput {
		return this.held.get(app) ?? NOT_STARTED;
	}

	outputChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	protected isStarted(app: string): boolean {
		return this.outputOf(app).isRunning;
	}

	protected heardStart(app: string): void {
		this.keep(app, {
			...this.outputOf(app),
			isRunning: true,
			exitCode: null,
		});
	}

	protected heardOutput(app: string, chunk: string): void {
		const held = this.outputOf(app);
		this.keep(app, {
			...held,
			output: (held.output + chunk).slice(-MOST_OUTPUT_CHARS),
		});
	}

	protected heardExit(app: string, exitCode: number | null): void {
		this.keep(app, {
			...this.outputOf(app),
			isRunning: false,
			exitCode,
		});
		console.info(`[terminal] app ${app}: running → exited ${String(exitCode)}`);
	}

	private keep(app: string, output: TerminalOutput): void {
		this.held.set(app, output);
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}
