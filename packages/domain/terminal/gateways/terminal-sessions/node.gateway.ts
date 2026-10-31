import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

const SHELL = "/bin/sh";

export class NodeTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly shells = new Map<string, ChildProcessWithoutNullStreams>();

	constructor(private readonly folder: string) {
		super();
	}

	override async send(app: string, line: string): Promise<void> {
		const shell = this.shells.get(app) ?? this.startShell(app);
		shell.stdin.write(`${line}\n`);
	}

	stopAll(): void {
		for (const shell of this.shells.values()) {
			shell.kill();
		}
	}

	private startShell(app: string): ChildProcessWithoutNullStreams {
		const shell = spawn(SHELL, [], { cwd: this.folder });
		this.shells.set(app, shell);
		this.heardStart(app);
		shell.stdout.setEncoding("utf8").on("data", (chunk: string) => this.heardOutput(app, chunk));
		shell.stderr.setEncoding("utf8").on("data", (chunk: string) => this.heardOutput(app, chunk));
		shell.on("exit", (code) => {
			this.shells.delete(app);
			this.heardExit(app, code);
		});
		return shell;
	}
}
