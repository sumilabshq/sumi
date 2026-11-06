import { oneOf } from "@widgetarium/data-framework";
import type { OneSetTagged } from "@widgetarium/data-framework";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";

const WORKSPACES_HOST_SETS = {
	tauri: {
		store: StoreClient,
	},
	elsewhere: {},
};

export const WORKSPACES_HOST_NEEDS = oneOf(WORKSPACES_HOST_SETS);

export type WorkspacesHost = OneSetTagged<typeof WORKSPACES_HOST_SETS>;
