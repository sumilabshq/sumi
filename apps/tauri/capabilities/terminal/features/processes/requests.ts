import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { processOutputChanged } from "../../gateways/processes/processes.events.js";
import { ownedKeyOf } from "../../shared/lib/owned-key.js";
import {
	ProcessOutputAskedSchema,
	ProcessOutputSchema,
	ProcessRunSchema,
	StartProcessInputSchema,
} from "../../shared/schema/terminal.schema.js";

const ALREADY_RUNNING = "process {run} is already running";

// TODO: per-app grants (which programs, which folders); every app may start any program today
export const start = command()
	.public()
	.input(StartProcessInputSchema)
	.idempotencyKey(PerCall)
	.handle(async (input, { processes, user, invalidate }) => {
		const owned = ownedKeyOf(user, input.run);

		if (processes.runOf(owned).status === "running") {
			return refuse(ALREADY_RUNNING.replace("{run}", input.run));
		}

		invalidate(getOutput);
		await processes.start(owned, input);
	});

export const getOutput = query()
	.public()
	.input(ProcessOutputAskedSchema)
	.output(ProcessOutputSchema)
	.handle(({ run, from }, { processes, user }) => {
		const held = processes.runOf(ownedKeyOf(user, run));
		const first = Math.max(0, from - held.dropped);
		return {
			lines: held.lines.slice(first),
			next: held.dropped + held.lines.length,
			status: held.status,
			exitCode: held.exitCode,
		};
	});

export const stop = command()
	.public()
	.input(ProcessRunSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ run }, { processes, user }) => {
		await processes.stop(ownedKeyOf(user, run));
	});

export const rereadProcessOutput = subscriber(processOutputChanged).handle((_input, { invalidate }) => {
	invalidate(getOutput);
});
