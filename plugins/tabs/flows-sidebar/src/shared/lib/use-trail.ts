import { appHost } from "@widgetarium/app-host/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";

export interface Trail {
	readonly canGoBack: boolean;
	readonly canGoForward: boolean;
	goBack(): void;
	goForward(): void;
}

export function useTrail(window: string): Trail {
	const trail = useQuery(navigation.windowTrail.trail, { window }).data;
	const back = useCommand(appHost.flows.back);
	const forward = useCommand(appHost.flows.forward);
	return {
		canGoBack: trail.canGoBack,
		canGoForward: trail.canGoForward,
		goBack: () => {
			if (trail.canGoBack) {
				void back.run();
			}
		},
		goForward: () => {
			if (trail.canGoForward) {
				void forward.run();
			}
		},
	};
}
