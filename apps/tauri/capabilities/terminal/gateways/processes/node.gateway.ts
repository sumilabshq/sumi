import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import type { ProcessStream, StartProcessInput } from "../../shared/schema/terminal.schema.js";
import { ProcessesGateway } from "./processes.gateway.js";

export class NodeProcessesGateway extends ProcessesGateway {
	private readonly children = new Map<string, ChildProcess>();

	override start(run: string, { folder, program, args, env }: StartProcessInput): Promise<void> {
		return new Promise((resolve, reject) => {
			const child = spawn(program, args, {
				cwd: folder,
				env: {
					...process.env,
					...env,
				},
				stdio: ["ignore", "pipe", "pipe"],
			});
			child.once("error", reject);
			child.once("spawn", () => {
				this.children.set(run, child);
				this.recordStart(run);
				resolve();
			});
			const reading = [this.readLines(run, child.stdout, "out"), this.readLines(run, child.stderr, "err")];
			child.once("close", (code) => {
				void Promise.all(reading).then(() => {
					this.children.delete(run);
					this.recordExit(run, code);
				});
			});
		});
	}

	override stop(run: string): Promise<void> {
		this.children.get(run)?.kill("SIGTERM");
		return Promise.resolve();
	}

	private readLines(run: string, stream: Readable | null, kind: ProcessStream): Promise<void> {
		if (stream === null) {
			return Promise.resolve();
		}

		const lines = createInterface({ input: stream });
		lines.on("line", (text) => this.recordLine(run, { stream: kind, text }));
		return new Promise((resolve) => lines.once("close", resolve));
	}
}
