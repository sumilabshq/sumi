import { execFile } from "node:child_process";
import type { ProgramOutput, RunProgramInput } from "../../shared/schema/terminal.schema.js";
import { ProgramsGateway } from "./programs.gateway.js";

const MAX_ANSWER_BYTES = 32 * 1024 * 1024;
const KILLED_CODE = -1;

export class NodeProgramsGateway extends ProgramsGateway {
	override runProgram({ folder, program, args }: RunProgramInput): Promise<ProgramOutput> {
		return new Promise((resolve, reject) => {
			execFile(
				program,
				args,
				{
					cwd: folder,
					maxBuffer: MAX_ANSWER_BYTES,
					env: {
						...process.env,
						GIT_TERMINAL_PROMPT: "0",
					},
				},
				(failure, out, err) => {
					const code = failure === null ? 0 : failure.code;

					if (typeof code === "string") {
						reject(failure);
						return;
					}

					resolve({
						code: code ?? KILLED_CODE,
						out,
						err,
					});
				},
			);
		});
	}
}
