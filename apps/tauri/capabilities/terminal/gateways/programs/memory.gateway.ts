import type { ProgramOutput } from "../../shared/schema/terminal.schema.js";
import { ProgramsGateway } from "./programs.gateway.js";

const NO_PROGRAMS = "programs run only in the desktop app";

export class MemoryProgramsGateway extends ProgramsGateway {
	override runProgram(): Promise<ProgramOutput> {
		return Promise.reject(new Error(NO_PROGRAMS));
	}
}
