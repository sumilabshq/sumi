import { Suspense, createElement as h } from "react";
import type { ReactElement } from "react";
import { AppProvider } from "@widgetarium/data-framework";
import type { PluginApp } from "@sumi/apps-plugin";
import { usePluginApp } from "../../lib/use-plugin-app.js";

export interface PluginAppViewProps {
	readonly app: PluginApp;
	readonly tabId: string;
}

export function PluginAppView({ app, tabId }: PluginAppViewProps): ReactElement | null {
	const started = usePluginApp({ app: app.id, tabId });

	if (started === null) {
		return null;
	}

	return (
		<AppProvider app={started}>
			<Suspense fallback={null}>
				<app.view tabId={tabId} />
			</Suspense>
		</AppProvider>
	);
}
