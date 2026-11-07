import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DrawnTabPage, TabModules, TabPageProps } from "@sumi/sumi-host-plugin";
import { AppTab } from "./app-tab.js";
import type { FilledApp } from "./app-tab.js";

const NO_OWN_MODULES: TabModules = {
	modules: [],
	imports: [],
};

export function appsTabPageOf(apps: readonly FilledApp[]): DrawnTabPage {
	const filledOf = (app: string): FilledApp | null => apps.find(({ id }) => id === app) ?? null;
	return {
		header: "shell",
		draws: (app) => filledOf(app) !== null,
		modulesOf: () => Promise.resolve(NO_OWN_MODULES),
		page: ({ app, tabId }: TabPageProps): ReactElement | null => {
			const filled = filledOf(app);
			return filled === null ? null : <AppTab filled={filled} tabId={tabId} />;
		},
	};
}
