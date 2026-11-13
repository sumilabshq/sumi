import { tmpdir } from "node:os";
import { runtime, orpcTransport } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "@widgetarium/data-framework/server";
import { terminal } from "../apps/tauri/capabilities/terminal/generated/contract.ts";
import { terminal as RunnableTerminalModule } from "../apps/tauri/capabilities/terminal/generated/module.ts";
import { NodeProcessesGateway } from "../apps/tauri/capabilities/terminal/gateways/processes/node.gateway.ts";
import { memoryTerminalParts } from "../apps/tauri/capabilities/terminal/gateways/terminal-parts/terminal-parts.gateway.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";

const WAIT_STEP_MS = 50;
const MOST_WAIT_MS = 5000;
const served = dataFrameworkMiddleware(
	runtime()
		.modules(RunnableTerminalModule({ injects: { ...memoryTerminalParts(), processes: new NodeProcessesGateway() } }))
		.start({ platform: "server", env: {} }),
	{ authenticate: new AppCallerAuthenticate() },
);

function appOver(id: string): Runtime {
	return runtime()
		.imports(
			terminal({
				over: orpcTransport("http://checks.test", {
					fetch: served.fetch,
					headers: () => ({ [APP_CALLER_HEADER]: id }),
				}),
			}),
		)
		.start();
}

async function exitedOutput(app: Runtime, run: string) {
	for (let waited = 0; waited < MOST_WAIT_MS; waited += WAIT_STEP_MS) {
		const answer = await app.send(terminal.processes.getOutput, { run, from: 0 });

		if (answer.ok && answer.output.status === "exited") {
			return answer.output;
		}

		await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
	}

	throw new Error(`terminal processes checks: ${run} did not exit in ${MOST_WAIT_MS} ms`);
}

const runner = appOver("runner");
const other = appOver("other");
const started = await runner.send(terminal.processes.start, {
	run: "echo",
	folder: tmpdir(),
	program: "sh",
	args: ["-c", "echo one; echo two 1>&2; echo three; exit 3"],
});
check("an app starts a program with no shell between it and the caller", started.ok, true);
const echoed = await exitedOutput(runner, "echo");
check(
	"stdout and stderr arrive as separate lines, in order per stream",
	echoed.lines.filter(({ stream }) => stream === "out").map(({ text }) => text),
	["one", "three"],
);
check(
	"stderr is kept apart",
	echoed.lines.filter(({ stream }) => stream === "err").map(({ text }) => text),
	["two"],
);
check("the exit code comes back", echoed.exitCode, 3);
const later = await runner.send(terminal.processes.getOutput, { run: "echo", from: 2 });
check("reading from a line index answers only the lines after it", later.ok ? later.output.lines.length : -1, 1);
const peeked = await other.send(terminal.processes.getOutput, { run: "echo", from: 0 });
check(
	"another app reading the same run name sees nothing of it",
	peeked.ok ? peeked.output.status : "refused",
	"not-started",
);

await runner.send(terminal.processes.start, { run: "long", folder: tmpdir(), program: "sleep", args: ["30"] });
await runner.send(terminal.processes.stop, { run: "long" });
const stopped = await exitedOutput(runner, "long");
check("a stopped program exits", stopped.status, "exited");

if (tally.failed > 0) {
	process.exit(1);
}

console.log("terminal processes: all checks passed");
