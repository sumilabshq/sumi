import { AppearanceModule, PlacesModule } from "@sumi/contract";
import { TasksModule } from "@widgetarium/tasks";
import { app, messagePortTransport, portFromParent } from "@widgetarium/framework";
import type { RemoteTransport, StartedApp } from "@widgetarium/framework";

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
			.imports(
				PlacesModule.over(transport),
				AppearanceModule.over(transport),
				TasksModule.over(transport),
			)
			.start(),
		transport,
		tabId: new URLSearchParams(location.hash.slice(1)).get(TAB_KEY) ?? "",
	};
}
