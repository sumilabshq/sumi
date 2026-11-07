import { BrowserModule } from "@widgetarium/browser/module";
import { runtime } from "@widgetarium/data-framework";
import type { Platform, Runtime } from "@widgetarium/data-framework";

export interface BrowserAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
}

export interface StudioBrowser {
	readonly browserApp: Runtime;
}

export function startBrowserApp({ platform, workspaceId }: BrowserAppAsk): Runtime {
	return runtime().modules(BrowserModule).start({ platform, scope: { workspaceId } });
}
