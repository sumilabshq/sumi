import { BrowserModule } from "@widgetarium/browser/module";
import { app } from "@widgetarium/core/requests";
import type { Platform, StartedApp } from "@widgetarium/core/requests";

export interface BrowserAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
}

export interface StudioBrowser {
	readonly browserApp: StartedApp;
	readonly chatApp: StartedApp | null;
}

export function startBrowserApp({ platform, workspaceId }: BrowserAppAsk): StartedApp {
	return app().modules(BrowserModule).start({ platform, scope: { workspaceId } });
}
