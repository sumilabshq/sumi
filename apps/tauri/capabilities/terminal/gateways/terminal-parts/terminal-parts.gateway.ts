import type { ModuleFacts } from "@widgetarium/data-framework";
import type { ProgramsGateway } from "../programs/programs.gateway.js";
import { MemoryProgramsGateway } from "../programs/memory.gateway.js";
import { TauriProgramsGateway } from "../programs/tauri.gateway.js";
import type { TerminalSessionsGateway } from "../terminal-sessions/terminal-sessions.gateway.js";
import { MemoryTerminalSessionsGateway } from "../terminal-sessions/memory.gateway.js";
import { TauriTerminalSessionsGateway } from "../terminal-sessions/tauri.gateway.js";

export type TerminalParts = {
	readonly sessions: TerminalSessionsGateway;
	readonly programs: ProgramsGateway;
};

const TERMINAL_STORE = "TERMINAL_STORE";
const TAURI_TERMINAL = "tauri";

export function terminalPartsOn({ env }: ModuleFacts): TerminalParts {
	return env[TERMINAL_STORE] === TAURI_TERMINAL
		? {
				sessions: new TauriTerminalSessionsGateway(),
				programs: new TauriProgramsGateway(),
			}
		: memoryTerminalParts();
}

export function memoryTerminalParts(): TerminalParts {
	return {
		sessions: new MemoryTerminalSessionsGateway(),
		programs: new MemoryProgramsGateway(),
	};
}
