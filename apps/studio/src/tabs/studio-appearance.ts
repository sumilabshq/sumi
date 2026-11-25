import { appearance as appearanceContract } from "@widgetarium/appearance/contract";
import { appearance as appearanceModule } from "@widgetarium/appearance/implementation";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
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

export function startStudioAppearance(view: Window, store?: StoreClient): StudioAppearance {
	const transport = localTransport();
	const appearance = runtime()
		.modules(
			appearanceModule({
				systemScheme: view.matchMedia(DARK_SCHEME),
				...(store === undefined ? {} : { tauri: { store } }),
			}),
		)
		.start({
			platform: "server",
			env: {},
			scope: {
				workspaceId: STUDIO_SCOPE,
			},
		});
	mountOrStop(appearance, (started) => transport.serve(started, { authenticate: new AppCallerAuthenticate() }));
	const appearanceApp = runtime()
		.imports(appearanceContract({ over: transport }))
		.start();
	const wear = (): void => {
		void appearanceApp.send(appearanceContract.theme.current).then((theme) => {
			if (!theme.ok) {
				console.error(`[widgetarium] the studio could not read its theme: ${theme.reason}`);
				return;
			}

			view.document.documentElement.classList.toggle(DARK_CLASS, theme.output.scheme === "dark");
		});
	};
	const wearFonts = (): void => {
		void appearanceApp.send(appearanceContract.fonts.current).then((fonts) => {
			if (!fonts.ok) {
				console.error(`[widgetarium] the studio could not read its fonts: ${fonts.reason}`);
				return;
			}

			const style = view.document.documentElement.style;
			style.setProperty("--font-ui", fonts.output.ui.chosen.stack);
			style.setProperty("--font-code", fonts.output.code.chosen.stack);
			style.setProperty("--font-heading", fonts.output.heading.chosen.stack);
		});
	};
	wear();
	wearFonts();
	transport.changes(wear);
	transport.changes(wearFonts);
	return {
		transport,
		appearanceApp,
	};
}
