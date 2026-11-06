import { AppearanceModule, PlacesModule, TerminalModule } from "@sumi/contract";
import { app, messagePortTransport } from "@widgetarium/data-framework";
import type { RemoteTransport, StartedApp } from "@widgetarium/data-framework";

const TAB_KEY = "sumi-tab";

export interface SumiShell {
	readonly shell: StartedApp;
	readonly transport: RemoteTransport;
	readonly tabId: string | null;
}

export function startSumiShell(port: MessagePort): SumiShell {
	const transport = messagePortTransport(port);
	return {
		shell: app()
			.imports(TerminalModule.over(transport), PlacesModule.over(transport), AppearanceModule.over(transport))
			.start(),
		transport,
		tabId: new URLSearchParams(location.hash.slice(1)).get(TAB_KEY),
	};
}
