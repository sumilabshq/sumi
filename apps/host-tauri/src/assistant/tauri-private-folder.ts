import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { AssistantBridge } from "./assistant-bridge.js";

export interface TauriPrivateFolder {
	write(path: string, data: Uint8Array): void;
	remove(path: string): void;
	removeOlderThan(folder: string, ageMs: number, now: number): void;
	settled(): Promise<void>;
	bytesOf(path: string): Uint8Array | null;
}

interface WrittenBytes {
	readonly bytes: Uint8Array;
	readonly at: number;
}

const NOT_WRITTEN = "An attached file could not be written: {why}";
const NOT_SWEPT = "[widgetarium] the private attachments folder could not be swept";
const NOT_REMOVED = "[widgetarium] an attachment could not be removed";

// TRADE-OFF: the gateway writes synchronously but IPC is async, so writes are queued and a turn waits for them in settled() before it starts
export function tauriPrivateFolder(bridge: AssistantBridge): TauriPrivateFolder {
	const pending = new Set<Promise<void>>();
	const failures: unknown[] = [];
	// TRADE-OFF: bytes of files written this hour stay in memory so a queued message can be copied to the store; reading them back would need a new IPC command
	const written = new Map<string, WrittenBytes>();
	const track = (write: Promise<void>): void => {
		const held = write.catch((failed: unknown) => void failures.push(failed)).finally(() => pending.delete(held));
		pending.add(held);
	};
	return {
		write: (path, data) => {
			written.set(path, {
				bytes: data,
				at: Date.now(),
			});
			track(bridge.writeAttachment(path, data));
		},
		remove: (path) => {
			written.delete(path);
			void bridge.removeAttachment(path).catch((failed: unknown) => console.error(NOT_REMOVED, failed));
		},
		removeOlderThan: (_folder, ageMs, now) => {
			for (const [path, { at }] of written) {
				if (now - at >= ageMs) {
					written.delete(path);
				}
			}

			void bridge.sweepAttachments(ageMs).catch((failed: unknown) => console.error(NOT_SWEPT, failed));
		},
		bytesOf: (path) => written.get(path)?.bytes ?? null,
		settled: async () => {
			await Promise.all([...pending]);
			const failed = failures.splice(0);
			if (failed.length > 0) {
				throw new Error(NOT_WRITTEN.replace("{why}", failed.map((failure) => failureMessage(failure)).join("; ")));
			}
		},
	};
}
