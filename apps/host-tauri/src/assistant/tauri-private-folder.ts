import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { AssistantBridge } from "./assistant-bridge.js";

export interface TauriPrivateFolder {
	write(path: string, data: Uint8Array): void;
	remove(path: string): void;
	removeOlderThan(folder: string, ageMs: number, now: number): void;
	settled(): Promise<void>;
}

const NOT_WRITTEN = "An attached file could not be written: {why}";
const NOT_SWEPT = "[widgetarium] the private attachments folder could not be swept";
const NOT_REMOVED = "[widgetarium] an attachment could not be removed";

// TRADE-OFF: the gateway writes synchronously but IPC is async, so writes are queued and a turn waits for them in settled() before it starts
export function tauriPrivateFolder(bridge: AssistantBridge): TauriPrivateFolder {
	const pending = new Set<Promise<void>>();
	const failures: unknown[] = [];
	const track = (write: Promise<void>): void => {
		const held = write.catch((failed: unknown) => void failures.push(failed)).finally(() => pending.delete(held));
		pending.add(held);
	};
	return {
		write: (path, data) => track(bridge.writeAttachment(path, data)),
		remove: (path) => void bridge.removeAttachment(path).catch((failed: unknown) => console.error(NOT_REMOVED, failed)),
		removeOlderThan: (_folder, ageMs) =>
			void bridge.sweepAttachments(ageMs).catch((failed: unknown) => console.error(NOT_SWEPT, failed)),
		settled: async () => {
			await Promise.all([...pending]);
			const failed = failures.splice(0);
			if (failed.length > 0) {
				throw new Error(NOT_WRITTEN.replace("{why}", failed.map((failure) => failureMessage(failure)).join("; ")));
			}
		},
	};
}
