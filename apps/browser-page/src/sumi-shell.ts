import { AppearanceModule, PlacesModule, WebPageModule } from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/core/requests";
import type { RemoteTransport, StartedApp } from "@widgetarium/core/requests";

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
