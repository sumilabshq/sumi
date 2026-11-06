import type { RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import { ThemeQuery } from "./generated/appearance.js";

export interface ThemeWearing {
	readonly sumi: StartedApp;
	readonly transport: RemoteTransport;
}

const DARK_CLASSES = ["dark", "theme-dark"] as const;

export function wearSumiTheme({ sumi, transport }: ThemeWearing, view: Window = window): () => void {
	const wear = (): void => {
		void sumi.send(ThemeQuery).then((theme) => {
			if (!theme.ok) {
				console.error(`[sumi] reading Sumi's theme was refused: ${theme.reason}`);
				return;
			}

			DARK_CLASSES.forEach((name) =>
				view.document.documentElement.classList.toggle(name, theme.output.scheme === "dark"),
			);
		});
	};
	wear();
	return transport.changes(wear);
}
