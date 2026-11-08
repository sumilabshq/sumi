import { invoke } from "@tauri-apps/api/core";
import { ProgramOutputSchema } from "../../shared/schema/terminal.schema.js";
import type { ProgramOutput, RunProgramInput } from "../../shared/schema/terminal.schema.js";
import { ProgramsGateway } from "./programs.gateway.js";

const RUN = "plugin:terminal|run";

export class TauriProgramsGateway extends ProgramsGateway {
	override async runProgram({ folder, program, args }: RunProgramInput): Promise<ProgramOutput> {
		return ProgramOutputSchema.parse(await invoke(RUN, { folder, program, args }));
	}
}
