import { appHost } from "@widgetarium/app-host/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";

export interface Trail {
	readonly canGoBack: boolean;
	readonly canGoForward: boolean;
	goBack(): void;
	goForward(): void;
}

export function useTrail(window: string): Trail {
	const trail = useOptionalQuery(navigation.windowTrail.trail, { window }).data;
	const canGoBack = trail?.canGoBack === true;
	const canGoForward = trail?.canGoForward === true;
	const back = useCommand(appHost.flows.back);
	const forward = useCommand(appHost.flows.forward);
	return {
		canGoBack,
		canGoForward,
		goBack: () => {
			if (canGoBack) {
				void back.run();
			}
		},
		goForward: () => {
			if (canGoForward) {
				void forward.run();
			}
		},
	};
}
