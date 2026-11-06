import { BrowserModule } from "@widgetarium/browser/module";
import { app } from "@widgetarium/framework";
import type { Platform, StartedApp } from "@widgetarium/framework";

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
