import { invoke } from "@tauri-apps/api/core";
import type { DraftFiles } from "./tauri-chat-drafts.js";

const WRITE_FILE = "plugin:store|write_file";
const READ_FILE = "plugin:store|read_file";
const REMOVE_FILE = "plugin:store|remove_file";
const FILE_ROOT_HEADER = "x-ink-store-root";
const FILE_PATH_HEADER = "x-ink-store-path";
const NOT_BYTES = "the store answered a file read with something other than bytes";

export const tauriDraftFiles: DraftFiles = {
	write: async (root, path, bytes) => {
		await invoke(WRITE_FILE, bytes, {
			headers: {
				[FILE_ROOT_HEADER]: root,
				[FILE_PATH_HEADER]: path,
			},
		});
	},
	read: async (root, path) => bytesOf(await invoke(READ_FILE, { root, path })),
	remove: async (root, path) => {
		await invoke(REMOVE_FILE, { root, path });
	},
};

function bytesOf(held: unknown): Uint8Array {
	if (held instanceof ArrayBuffer) {
		return new Uint8Array(held);
	}

	if (Array.isArray(held) && held.every((byte) => typeof byte === "number")) {
		return Uint8Array.from(held);
	}

	throw new Error(NOT_BYTES);
}
