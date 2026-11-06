import { hostObject } from "@widgetarium/data-framework";
import type { OneSetTagged } from "@widgetarium/data-framework";
import { isObject } from "@widgetarium/data-framework/is-object";

export interface BrowserPagesIpc {
	invoke(command: string, args?: Readonly<Record<string, unknown>>): Promise<unknown>;
	channel(onMessage: (message: unknown) => void): unknown;
}

export const BrowserPagesIpcHost = hostObject<BrowserPagesIpc>("BrowserPagesIpc", isBrowserPagesIpc);

export type BrowserHost = OneSetTagged<{
	tauri: {
		browserIpc: typeof BrowserPagesIpcHost;
	};
	elsewhere: Record<never, never>;
}>;

function isBrowserPagesIpc(held: unknown): held is BrowserPagesIpc {
	return isObject(held) && typeof held["invoke"] === "function" && typeof held["channel"] === "function";
}
