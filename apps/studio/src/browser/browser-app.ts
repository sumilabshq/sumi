import { BrowserModule } from "@widgetarium/browser/module";
import { app } from "@widgetarium/data-framework";
import type { Platform, StartedApp } from "@widgetarium/data-framework";

export interface BrowserAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
}

export interface StudioBrowser {
	readonly browserApp: StartedApp;
}

export function startBrowserApp({ platform, workspaceId }: BrowserAppAsk): StartedApp {
	return app().modules(BrowserModule).start({ platform, scope: { workspaceId } });
}
