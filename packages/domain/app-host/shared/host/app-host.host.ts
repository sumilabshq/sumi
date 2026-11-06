import { hostObject } from "@widgetarium/data-framework";
import type { OneSetTagged } from "@widgetarium/data-framework";
import { isObject } from "@widgetarium/data-framework/is-object";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface CoreChanges {
	onCoreChanged(listener: () => void): () => void;
}

export const CoreChangesHost = hostObject<CoreChanges>("CoreChanges", isCoreChanges);

export type AppHostLent = OneSetTagged<{
	tauri: {
		store: typeof StoreClient;
		coreChanges: typeof CoreChangesHost;
	};
	elsewhere: Record<never, never>;
}>;

function isCoreChanges(held: unknown): held is CoreChanges {
	return isObject(held) && typeof held["onCoreChanged"] === "function";
}
