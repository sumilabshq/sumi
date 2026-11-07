import { REGISTERED_APPS, registeredAppOf } from "@widgetarium/app-registry";
import type { RegisteredApp } from "@widgetarium/app-registry";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { useTabPageOf } from "./tab-page-context.js";
import { useTabIdIfOpen } from "./use-tab-id-if-open.js";

export type AppPageView =
	| {
			readonly kind: "closed";
	  }
	| {
			readonly kind: "missing";
	  }
	| {
			readonly kind: "page";
			readonly tabId: string;
			readonly page: DrawnTabPage;
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
	const tabPage = useTabPageOf(app);

	if (openTabId === null) {
		return CLOSED;
	}

	if (tabPage !== null) {
		return {
			kind: "page",
			tabId: openTabId,
			page: tabPage,
		};
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
