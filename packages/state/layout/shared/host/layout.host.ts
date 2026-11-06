import { hostObject } from "@widgetarium/data-framework";
import type { OneSetTagged } from "@widgetarium/data-framework";
import { isObject } from "@widgetarium/data-framework/is-object";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface StudioWindows {
	openLabels(): Promise<readonly string[]>;
	onOwnCloseAsked(listener: () => void): void;
}

export const StudioWindowsHost = hostObject<StudioWindows>("StudioWindows", isStudioWindows);

export type LayoutHost = OneSetTagged<{
	tauri: {
		store: typeof StoreClient;
		studioWindows: typeof StudioWindowsHost;
	};
	elsewhere: Record<never, never>;
}>;

function isStudioWindows(held: unknown): held is StudioWindows {
	return isObject(held) && typeof held["openLabels"] === "function" && typeof held["onOwnCloseAsked"] === "function";
}
