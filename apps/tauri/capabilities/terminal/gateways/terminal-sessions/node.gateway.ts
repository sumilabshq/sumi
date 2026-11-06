import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

const SHELL = "/bin/sh";

export class NodeTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly shells = new Map<string, ChildProcessWithoutNullStreams>();

	constructor(private readonly folder: string) {
		super();
	}

	override async start(session: string): Promise<void> {
		this.ensureShell(session);
	}

	// TRADE-OFF: a piped shell has no window size; only a pty can follow the screen
	override async resize(): Promise<void> {}

	override async type(session: string, keys: string): Promise<void> {
		this.ensureShell(session).stdin.write(keys);
	}

	override send(session: string, line: string): Promise<void> {
		return this.type(session, `${line}\n`);
	}

	stopAll(): void {
		for (const shell of this.shells.values()) {
			shell.kill();
		}
	}

	private ensureShell(session: string): ChildProcessWithoutNullStreams {
		return this.shells.get(session) ?? this.startShell(session);
	}

	private startShell(session: string): ChildProcessWithoutNullStreams {
		const shell = spawn(SHELL, [], { cwd: this.folder });
		this.shells.set(session, shell);
		this.recordStart(session);
		shell.stdout.setEncoding("utf8").on("data", (chunk: string) => this.recordOutput(session, chunk));
		shell.stderr.setEncoding("utf8").on("data", (chunk: string) => this.recordOutput(session, chunk));
		shell.on("exit", (code) => {
			this.shells.delete(session);
			this.recordExit(session, code);
		});
		return shell;
	}
}
