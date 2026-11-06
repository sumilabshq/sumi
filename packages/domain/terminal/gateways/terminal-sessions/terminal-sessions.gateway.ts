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

	abstract start(app: string, size: TerminalSize): Promise<void>;

	abstract resize(app: string, size: TerminalSize): Promise<void>;

	abstract type(app: string, keys: string): Promise<void>;

	abstract send(app: string, line: string): Promise<void>;

	outputOf(app: string): TerminalOutput {
		return this.held.get(app) ?? NOT_STARTED;
	}

	onOutputChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	protected isRunning(app: string): boolean {
		return this.outputOf(app).status === "running";
	}

	protected recordStart(app: string): void {
		const held = this.outputOf(app);
		this.storeOutput(app, {
			...held,
			status: "running",
			exitCode: null,
		});
		console.info(`[terminal] app ${app}: ${held.status} → running`);
	}

	protected recordOutput(app: string, chunk: string): void {
		const held = this.outputOf(app);
		this.storeOutput(app, {
			...held,
			output: (held.output + chunk).slice(-MOST_OUTPUT_CHARS),
		});
	}

	protected recordExit(app: string, exitCode: number | null): void {
		this.storeOutput(app, {
			...this.outputOf(app),
			status: "exited",
			exitCode,
		});
		console.info(`[terminal] app ${app}: running → exited ${String(exitCode)}`);
	}

	private storeOutput(app: string, output: TerminalOutput): void {
		this.held.set(app, output);

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
