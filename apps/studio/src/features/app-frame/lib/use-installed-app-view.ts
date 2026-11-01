import { InstalledAppsQuery } from "@widgetarium/app-installer";
import type { InstalledApp } from "@widgetarium/app-installer";
import { useQuery } from "@widgetarium/core/requests";
import { useTabIdIfOpen } from "./use-tab-id-if-open.js";

export type InstalledAppView =
	| {
			readonly kind: "closed";
	  }
	| {
			readonly kind: "failed";
			readonly version: string;
			readonly problem: string | null;
	  }
	| {
			readonly kind: "missing";
			readonly problem: string | null;
	  }
	| {
			readonly kind: "frame";
			readonly tabId: string;
	  };

const CLOSED: InstalledAppView = {
	kind: "closed",
};

export function useInstalledAppView(app: string, tabId: string | null): InstalledAppView {
	const installed = useQuery(InstalledAppsQuery).data.apps.find(({ id }) => id === app) ?? null;
	const openTabId = useTabIdIfOpen(tabId);

	if (openTabId === null) {
		return CLOSED;
	}

	return installed === null ? missingOf(null) : viewOfInstalled(installed, openTabId);
}

function viewOfInstalled(installed: InstalledApp, tabId: string): InstalledAppView {
	if (installed.current === null) {
		return notRunningOf(installed);
	}

	if (installed.face === null) {
		return missingOf(installed.problem);
	}

	return {
		kind: "frame",
		tabId,
	};
}

function notRunningOf({ failed, problem }: InstalledApp): InstalledAppView {
	const version = failed.at(-1);

	if (version === undefined) {
		return missingOf(problem);
	}

	return {
		kind: "failed",
		version,
		problem,
	};
}

function missingOf(problem: string | null): InstalledAppView {
	return {
		kind: "missing",
		problem,
	};
}
