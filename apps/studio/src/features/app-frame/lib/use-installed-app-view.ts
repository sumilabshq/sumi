import { HeldTabsQuery } from "@widgetarium/app-host";
import type { HeldTab } from "@widgetarium/app-host";
import { InstalledAppsQuery } from "@widgetarium/app-installer";
import type { InstalledApp } from "@widgetarium/app-installer";
import { useQuery } from "@widgetarium/core/requests";

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
			readonly tab: HeldTab;
	  };

const CLOSED: InstalledAppView = {
	kind: "closed",
};

export function useInstalledAppView(app: string, tabId: string | null): InstalledAppView {
	const installed = useQuery(InstalledAppsQuery).data.apps.find(({ id }) => id === app) ?? null;
	const tab = useQuery(HeldTabsQuery).data.tabs.find(({ id }) => id === tabId) ?? null;

	if (tab === null) {
		return CLOSED;
	}

	return installed === null ? missingOf(null) : viewOfInstalled(installed, tab);
}

function viewOfInstalled(installed: InstalledApp, tab: HeldTab): InstalledAppView {
	if (installed.current === null) {
		return notRunningOf(installed);
	}

	if (installed.face === null) {
		return missingOf(installed.problem);
	}

	return {
		kind: "frame",
		tab,
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
