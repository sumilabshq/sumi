import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DrawnTabPage, TabPageProps } from "@sumi/sumi-host-plugin";
import { AppTab } from "./app-tab.js";
import type { FilledApp } from "./app-tab.js";

export function appsTabPageOf(apps: readonly FilledApp[]): DrawnTabPage {
	const filledOf = (app: string): FilledApp | null => apps.find(({ id }) => id === app) ?? null;
	return {
		draws: (app) => filledOf(app) !== null,
		page: ({ app, tabId }: TabPageProps): ReactElement | null => {
			const filled = filledOf(app);
			return filled === null ? null : <AppTab filled={filled} tabId={tabId} />;
		},
	};
}
