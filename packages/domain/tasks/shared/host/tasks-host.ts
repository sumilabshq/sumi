import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject, oneOf } from "@widgetarium/core/requests";
import type { HostFacts, OneSetTagged } from "@widgetarium/core/requests";

export interface BoardFile {
	readonly read: () => Promise<string | null>;
	readonly write: (text: string) => Promise<void>;
}

export const BoardFileHost = hostObject<BoardFile>("BoardFile", isBoardFile);

export const TasksStoreHost = hostObject<StoreClient>("StoreClient", isStoreClient);

export const TASKS_HOST_NEEDS = oneOf({
	store: {
		store: TasksStoreHost,
	},
	file: {
		file: BoardFileHost,
	},
});

export type TasksFacts = HostFacts<OneSetTagged<typeof TASKS_HOST_NEEDS.sets>>;

function isBoardFile(held: unknown): held is BoardFile {
	return isObject(held) && typeof held["read"] === "function" && typeof held["write"] === "function";
}

function isStoreClient(held: unknown): held is StoreClient {
	return held instanceof StoreClient;
}
