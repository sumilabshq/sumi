import { terminal } from "@sumi/contract";
import type { ProcessOutput } from "@sumi/contract";
import { AuthenticatedGuard, PerCall, Repeatable } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { command, query } from "#module";
import type { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import {
	OutputAskedSchema,
	RunAskedSchema,
	ShellRunSchema,
	StartAskedSchema,
	StopAskedSchema,
} from "../../shared/schema/shell.schema.js";
import { runIdOf, shellRunOf } from "./lib/shell-runs.js";

const SHELL = "sh";
const RUN_TIMEOUT_SECONDS = 120;
const POLL_MS = 250;
const STOP_WAIT_MS = 2000;
const RUN_NAME_LENGTH = 8;

interface Watch {
	readonly run: string;
	readonly until: number;
}

// TODO: Windows has no sh; pick the shell per platform
export const run = command()
	.public()
	.metadata({
		description:
			"Run a shell command and wait for it: answers its exit code and the last lines of its output, stderr lines marked [err]. Any program on the machine works (git, npm, docker…). A command still running after timeoutSeconds keeps running: read it with agent-tools_shell_get-output under the name answered, stop it with agent-tools_shell_stop.",
		mcp: { kind: "run", running: "Running", done: "Ran", shows: "command" },
	})
	.input(RunAskedSchema)
	.output(ShellRunSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ command: line, folder, timeoutSeconds }, { send, user, clock }) => {
		const name = `run-${crypto.randomUUID().slice(0, RUN_NAME_LENGTH)}`;
		const runId = runIdOf(user.id, name);
		await send(terminal.processes.start, { run: runId, folder, program: SHELL, args: ["-c", line] });
		console.info(`[agent-tools] ${user.id}: ${name} none → running: ${line}`);
		const until = clock.now().getTime() + (timeoutSeconds ?? RUN_TIMEOUT_SECONDS) * 1000;
		return shellRunOf(name, await outputWhenSettled(send, clock, { run: runId, until }));
	});

export const start = command()
	.public()
	.metadata({
		description:
			"Start a long-running shell command in the background, such as a dev server or a watcher, under a name you pick. Answers at once; read its output with agent-tools_shell_get-output, stop it with agent-tools_shell_stop.",
		mcp: { kind: "other", running: "Starting", done: "Started", shows: "command" },
	})
	.input(StartAskedSchema)
	.output(ShellRunSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ name, command: line, folder }, { send, user }) => {
		const runId = runIdOf(user.id, name);
		await send(terminal.processes.start, { run: runId, folder, program: SHELL, args: ["-c", line] });
		console.info(`[agent-tools] ${user.id}: ${name} none → running: ${line}`);
		return shellRunOf(name, await send(terminal.processes.getOutput, { run: runId, from: 0 }));
	});

export const getOutput = query()
	.public()
	.metadata({
		description:
			"Read what a named shell process printed: pass from as the next of your last answer to read only new lines. Says whether it is still running and its exit code.",
		mcp: { kind: "other", running: "Reading output of", done: "Read output of", shows: "name" },
	})
	.input(OutputAskedSchema)
	.output(ShellRunSchema)
	.guard(AuthenticatedGuard)
	.handle(async ({ name, from }, { send, user }) =>
		shellRunOf(name, await send(terminal.processes.getOutput, { run: runIdOf(user.id, name), from: from ?? 0 })),
	);

export const stop = command()
	.public()
	.metadata({
		description: "Stop a named shell process started by agent-tools_shell_start or agent-tools_shell_run.",
		mcp: { kind: "other", running: "Stopping", done: "Stopped", shows: "name" },
	})
	.input(StopAskedSchema)
	.output(ShellRunSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async ({ name }, { send, user, clock }) => {
		const runId = runIdOf(user.id, name);
		await send(terminal.processes.stop, { run: runId });
		console.info(`[agent-tools] ${user.id}: ${name} → stopped`);
		const until = clock.now().getTime() + STOP_WAIT_MS;
		return shellRunOf(name, await outputWhenSettled(send, clock, { run: runId, until }));
	});

async function outputWhenSettled(
	send: Send,
	clock: ClockGateway,
	{ run: runId, until }: Watch,
): Promise<ProcessOutput> {
	const output = await send(terminal.processes.getOutput, { run: runId, from: 0 });

	if (output.status === "exited" || clock.now().getTime() >= until) {
		return output;
	}

	await clock.pause(POLL_MS);
	return outputWhenSettled(send, clock, { run: runId, until });
}
