import { AppearanceModule as AppearanceContract, ThemeQuery } from "@widgetarium/appearance";
import { AppearanceModule } from "@widgetarium/appearance/module";
import { localTransport, mountOrStop, runtime } from "@widgetarium/data-framework";
import type { RemoteTransport, Runtime } from "@widgetarium/data-framework";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";

export interface StudioAppearance {
	readonly transport: RemoteTransport;
	readonly appearanceApp: Runtime;
}

const DARK_SCHEME = "(prefers-color-scheme: dark)";
const DARK_CLASS = "dark";
const STUDIO_SCOPE = "studio";

export function startStudioAppearance(view: Window): StudioAppearance {
	const transport = localTransport();
	const appearance = runtime()
		.modules(AppearanceModule({ systemScheme: view.matchMedia(DARK_SCHEME) }))
		.start({
			platform: "server",
			env: {},
			scope: {
				workspaceId: STUDIO_SCOPE,
			},
		});
	mountOrStop(appearance, (started) => transport.serve(started, { authenticate: new AppCallerAuthenticate() }));
	const appearanceApp = runtime().imports(AppearanceContract({ over: transport })).start();
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
