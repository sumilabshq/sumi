import { AssistantClientModule } from "../packages/assistant/generated/module.ts";
import { assistantPartsOf, obsidianAssistantGateways } from "../packages/assistant/generated/gateways.ts";
import type { PrivateFolder } from "../packages/assistant/generated/gateways.ts";
import type { AssistantPort } from "../packages/core/src/engine/assistant-port.ts";
import { app } from "../packages/core/src/requests/index.ts";
import type { StartedApp } from "../packages/core/src/requests/index.ts";
import { MascotClientModule } from "../packages/mascot/generated/module.ts";
import { memoryMascotParts } from "../packages/mascot/generated/gateways.ts";

export interface MemoryFolder extends PrivateFolder {
	readonly files: Map<string, Uint8Array>;
}

export const SHOT_ATTACHMENTS = "/attachments";

export function memoryFolder(): MemoryFolder {
	const files = new Map<string, Uint8Array>();
	return {
		files,
		write: (path, data) => void files.set(path, data),
		remove: (path) => void files.delete(path),
		removeOlderThan: () => undefined,
	};
}

export function chatAppOver(port: AssistantPort, privateFolder: PrivateFolder = memoryFolder()): StartedApp {
	const gateways = obsidianAssistantGateways({
		port,
		privateFolder,
		folder: SHOT_ATTACHMENTS,
	});
	return app({
		modules: [MascotClientModule.with(memoryMascotParts()), AssistantClientModule.with(assistantPartsOf(gateways))],
	});
}
