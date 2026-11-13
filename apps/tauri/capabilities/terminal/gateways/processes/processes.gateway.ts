import type { ProcessLine, ProcessOutput, StartProcessInput } from "../../shared/schema/terminal.schema.js";

const MOST_LINES = 20000;
const TELL_EVERY_MS = 30;

export interface HeldRun {
	readonly lines: readonly ProcessLine[];
	readonly dropped: number;
	readonly status: ProcessOutput["status"];
	readonly exitCode: number | null;
}

const NOT_STARTED: HeldRun = {
	lines: [],
	dropped: 0,
	status: "not-started",
	exitCode: null,
};

export abstract class ProcessesGateway {
	private readonly held = new Map<string, HeldRun>();
	private readonly listeners = new Set<() => void>();
	private readonly telling = {
		isPending: false,
	};

	abstract start(run: string, input: StartProcessInput): Promise<void>;

	abstract stop(run: string): Promise<void>;

	runOf(run: string): HeldRun {
		return this.held.get(run) ?? NOT_STARTED;
	}

	onOutputChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	protected recordStart(run: string): void {
		this.store(run, {
			...NOT_STARTED,
			status: "running",
		});
		console.info(`[terminal] process ${run}: not-started → running`);
	}

	protected recordLine(run: string, line: ProcessLine): void {
		const held = this.runOf(run);
		const lines = [...held.lines, line];
		const over = Math.max(0, lines.length - MOST_LINES);
		this.store(run, {
			...held,
			lines: lines.slice(over),
			dropped: held.dropped + over,
		});
	}

	protected recordExit(run: string, exitCode: number | null): void {
		this.store(run, {
			...this.runOf(run),
			status: "exited",
			exitCode,
		});
		console.info(`[terminal] process ${run}: running → exited ${String(exitCode)}`);
	}

	private store(run: string, held: HeldRun): void {
		this.held.set(run, held);

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
