import { PerCall } from "@widgetarium/data-framework";
import { command } from "#module";
import { ProgramOutputSchema, RunProgramInputSchema } from "../../shared/schema/terminal.schema.js";

// TODO: per-app grants (which programs, which folders); every app may run any program today, as it may type any line
export const RunProgramCommand = command("run-program")
	.public()
	.input(RunProgramInputSchema)
	.output(ProgramOutputSchema)
	.idempotencyKey(PerCall)
	.handle((input, { programs }) => programs.runProgram(input));
