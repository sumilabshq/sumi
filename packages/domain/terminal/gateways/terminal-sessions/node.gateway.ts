import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

const SHELL = "/bin/sh";

export class NodeTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly shells = new Map<string, ChildProcessWithoutNullStreams>();

	constructor(private readonly folder: string) {
		super();
	}

	override async start(app: string): Promise<void> {
		this.ensureShell(app);
	}

	// TRADE-OFF: a piped shell has no window size; only a pty can follow the screen
	override async resize(): Promise<void> {}

	override async type(app: string, keys: string): Promise<void> {
		this.ensureShell(app).stdin.write(keys);
	}

	override send(app: string, line: string): Promise<void> {
		return this.type(app, `${line}\n`);
	}

	stopAll(): void {
		for (const shell of this.shells.values()) {
			shell.kill();
		}
	}

	private ensureShell(app: string): ChildProcessWithoutNullStreams {
		return this.shells.get(app) ?? this.startShell(app);
	}

	private startShell(app: string): ChildProcessWithoutNullStreams {
		const shell = spawn(SHELL, [], { cwd: this.folder });
		this.shells.set(app, shell);
		this.recordStart(app);
		shell.stdout.setEncoding("utf8").on("data", (chunk: string) => this.recordOutput(app, chunk));
		shell.stderr.setEncoding("utf8").on("data", (chunk: string) => this.recordOutput(app, chunk));
		shell.on("exit", (code) => {
			this.shells.delete(app);
			this.recordExit(app, code);
		});
		return shell;
	}
}
