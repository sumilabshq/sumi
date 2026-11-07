import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DrawnTabPage, TabModules, TabPageProps } from "@sumi/sumi-host-plugin";
import { AppTab } from "./app-tab.js";
import type { DrawnApp, FilledApp } from "./app-tab.js";

export function appsTabPageOf(apps: readonly FilledApp[]): DrawnTabPage {
	const drawnOf = (app: string): DrawnApp | null => apps.filter(isDrawn).find(({ id }) => id === app) ?? null;
	return {
		header: "shell",
		draws: (app) => drawnOf(app) !== null,
		modulesOf: ({ app }): Promise<TabModules> =>
			Promise.resolve({
				modules: drawnOf(app)?.tabModules?.() ?? [],
				imports: [],
			}),
		page: ({ app, tabId }: TabPageProps): ReactElement | null => {
			const drawn = drawnOf(app);
			return drawn === null ? null : <AppTab filled={drawn} tabId={tabId} />;
		},
	};
}

function isDrawn(app: FilledApp): app is DrawnApp {
	return app.view !== undefined;
}
