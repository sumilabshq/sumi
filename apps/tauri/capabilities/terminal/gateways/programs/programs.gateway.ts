import type { ProgramOutput, RunProgramInput } from "../../shared/schema/terminal.schema.js";

export abstract class ProgramsGateway {
	abstract runProgram(input: RunProgramInput): Promise<ProgramOutput>;
}
