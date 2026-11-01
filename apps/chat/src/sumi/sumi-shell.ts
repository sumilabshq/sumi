import { AppearanceModule, AssistantModule, PlacesModule, QuestionsModule } from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/core/requests";
import type { RemoteTransport, StartedApp } from "@widgetarium/core/requests";
import { MascotModule } from "@widgetarium/mascot/module";

const TAB_KEY = "sumi-tab";
const FRAME_WORKSPACE = "chat";

export interface SumiShell {
	readonly app: StartedApp;
	readonly transport: RemoteTransport;
	readonly tabId: string;
}

export function startSumiShell(): SumiShell {
	const transport = messagePortTransport(portFromParent());
	return {
		app: app()
			.modules(MascotModule)
			.imports(
				PlacesModule.over(transport),
				AssistantModule.over(transport),
				AppearanceModule.over(transport),
				QuestionsModule.over(transport),
			)
			.start({
				platform: "browser",
				scope: {
					workspaceId: FRAME_WORKSPACE,
				},
			}),
		transport,
		tabId: new URLSearchParams(location.hash.slice(1)).get(TAB_KEY) ?? "",
	};
}
