import { REGISTERED_APPS, registeredAppOf } from "@widgetarium/app-registry";
import type { RegisteredApp } from "@widgetarium/app-registry";
import { useTabIdIfOpen } from "./use-tab-id-if-open.js";

export type AppPageView =
	| {
			readonly kind: "closed";
	  }
	| {
			readonly kind: "missing";
	  }
	| {
			readonly kind: "frame";
			readonly tabId: string;
			readonly registered: RegisteredApp;
	  };

const CLOSED: AppPageView = {
	kind: "closed",
};

const MISSING: AppPageView = {
	kind: "missing",
};

export function useAppPageView(app: string, tabId: string | null): AppPageView {
	const openTabId = useTabIdIfOpen(tabId);

	if (openTabId === null) {
		return CLOSED;
	}

	const registered = registeredAppOf(REGISTERED_APPS, app);

	if (registered === null) {
		return MISSING;
	}

	return {
		kind: "frame",
		tabId: openTabId,
		registered,
	};
}
