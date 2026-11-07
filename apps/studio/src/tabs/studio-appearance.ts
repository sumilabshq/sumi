import { AppearanceModule as AppearanceContract, ThemeQuery } from "@widgetarium/appearance";
import { AppearanceModule } from "@widgetarium/appearance/module";
import { app, localTransport } from "@widgetarium/data-framework";
import type { RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";

export interface StudioAppearance {
	readonly transport: RemoteTransport;
	readonly appearanceApp: StartedApp;
}

const DARK_SCHEME = "(prefers-color-scheme: dark)";
const DARK_CLASS = "dark";
const STUDIO_SCOPE = "studio";

export function startStudioAppearance(view: Window): StudioAppearance {
	const transport = localTransport();
	server()
		.modules(AppearanceModule({ systemScheme: view.matchMedia(DARK_SCHEME) }))
		.listen(transport)
		.start({
			env: {},
			scope: {
				workspaceId: STUDIO_SCOPE,
			},
			host: {
				authenticate: new AppCallerAuthenticate(),
			},
		});
	const appearanceApp = app().imports(AppearanceContract({ over: transport })).start();
	const wear = (): void => {
		void appearanceApp.send(ThemeQuery).then((theme) => {
			if (!theme.ok) {
				console.error(`[widgetarium] the studio could not read its theme: ${theme.reason}`);
				return;
			}

			view.document.documentElement.classList.toggle(DARK_CLASS, theme.output.scheme === "dark");
		});
	};
	wear();
	transport.changes(wear);
	return {
		transport,
		appearanceApp,
	};
}
