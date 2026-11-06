import type { ModuleFacts } from "@widgetarium/framework";
import type { TerminalSessionsGateway } from "../terminal-sessions/terminal-sessions.gateway.js";
import { MemoryTerminalSessionsGateway } from "../terminal-sessions/memory.gateway.js";
import { TauriTerminalSessionsGateway } from "../terminal-sessions/tauri.gateway.js";

export type TerminalParts = {
	readonly sessions: TerminalSessionsGateway;
};

const TERMINAL_STORE = "TERMINAL_STORE";
const TAURI_TERMINAL = "tauri";

export function terminalPartsOn({ env }: ModuleFacts): TerminalParts {
	return env[TERMINAL_STORE] === TAURI_TERMINAL
		? { sessions: new TauriTerminalSessionsGateway() }
		: memoryTerminalParts();
}

export function memoryTerminalParts(): TerminalParts {
	return {
		sessions: new MemoryTerminalSessionsGateway(),
	};
}
