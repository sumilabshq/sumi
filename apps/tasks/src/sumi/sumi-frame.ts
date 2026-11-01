import { AppearanceModule, FileSystemModule, PlacesModule } from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/core/requests";
import type { RemoteTransport, StartedApp } from "@widgetarium/core/requests";

const TAB_KEY = "sumi-tab";

export interface SumiFrame {
	readonly sumi: StartedApp;
	readonly transport: RemoteTransport;
	readonly tabId: string;
}

export async function startSumiFrame(): Promise<SumiFrame> {
	const transport = messagePortTransport(await portFromParent());
	return {
		sumi: app()
			.imports(FileSystemModule.over(transport), PlacesModule.over(transport), AppearanceModule.over(transport))
			.start(),
		transport,
		tabId: new URLSearchParams(location.hash.slice(1)).get(TAB_KEY) ?? "",
	};
}
