import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { DrawnTabPage, TabPageProps } from "@sumi/sumi-host-plugin";

interface FilledApp {
	readonly id: string;
	readonly view: ComponentType<{ readonly tabId: string }>;
}

export function appsTabPageOf(apps: readonly FilledApp[]): DrawnTabPage {
	const viewOf = (app: string): FilledApp["view"] | null => apps.find(({ id }) => id === app)?.view ?? null;
	return {
		draws: (app) => viewOf(app) !== null,
		page: ({ app, tabId }: TabPageProps): ReactElement | null => {
			const View = viewOf(app);
			return View === null ? null : <View tabId={tabId} />;
		},
	};
}
