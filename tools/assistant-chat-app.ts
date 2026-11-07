import { AssistantModule } from "../plugins/chat/data/assistant/module.ts";
import type { AssistantPort } from "../packages/shared/core/src/engine/assistant-port.ts";
import { app } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { MascotModule } from "../plugins/chat/data/mascot/module.ts";

export interface MemoryFolder {
	readonly files: Map<string, Uint8Array>;
	write(path: string, data: Uint8Array): void;
	remove(path: string): void;
	removeOlderThan(folder: string, ageMs: number, now: number): void;
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

export function chatAppOver(port: AssistantPort, privateFolder: MemoryFolder = memoryFolder()): StartedApp {
	return app()
		.modules(
			MascotModule,
			AssistantModule({
				kind: "obsidian",
				obsidianAssistant: port,
				attachments: {
					folder: SHOT_ATTACHMENTS,
					files: privateFolder,
				},
			}),
		)
		.start({
			platform: "browser",
			scope: {
				workspaceId: "assistant-chat",
			},
		});
}
