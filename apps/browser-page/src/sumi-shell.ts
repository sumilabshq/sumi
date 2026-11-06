import { AppearanceModule, PlacesModule, WebPageModule } from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/framework";
import type { RemoteTransport, StartedApp } from "@widgetarium/framework";

const TAB_KEY = "sumi-tab";

export interface SumiShell {
	readonly app: StartedApp;
	readonly transport: RemoteTransport;
	readonly tabId: string;
}

export function startSumiShell(): SumiShell {
	const transport = messagePortTransport(portFromParent());
	return {
		app: app()
			.imports(PlacesModule.over(transport), WebPageModule.over(transport), AppearanceModule.over(transport))
			.start(),
		transport,
		tabId: new URLSearchParams(location.hash.slice(1)).get(TAB_KEY) ?? "",
	};
}
