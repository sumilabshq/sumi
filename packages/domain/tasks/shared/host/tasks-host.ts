import type { DocStore } from "@sumi/contract";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject, oneOf } from "@widgetarium/core/requests";
import type { HostFacts, OneSetTagged } from "@widgetarium/core/requests";

export const DocStorageHost = hostObject<DocStore>("DocStore", isDocStore);

export const TasksStoreHost = hostObject<StoreClient>("StoreClient", isStoreClient);

export const TASKS_HOST_NEEDS = oneOf({
	store: {
		store: TasksStoreHost,
	},
	storage: {
		storage: DocStorageHost,
	},
});

export type TasksFacts = HostFacts<OneSetTagged<typeof TASKS_HOST_NEEDS.sets>>;

function isDocStore(held: unknown): held is DocStore {
	return isObject(held) && typeof held["read"] === "function" && typeof held["write"] === "function";
}

function isStoreClient(held: unknown): held is StoreClient {
	return held instanceof StoreClient;
}
