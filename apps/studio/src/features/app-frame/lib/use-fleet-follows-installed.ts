import { useEffect } from "react";
import { InstalledAppsQuery } from "@widgetarium/app-installer";
import type { InstalledApps } from "@widgetarium/app-installer";
import { useOptionalQuery } from "@widgetarium/core/requests";
import type { AppFrameFleet, CurrentRelease } from "./app-frame-fleet.js";

export function useFleetFollowsInstalled(fleet: AppFrameFleet): void {
	const installed = useOptionalQuery(InstalledAppsQuery).data;

	useEffect(() => {
		if (installed !== null) {
			fleet.currentsAre(currentsOf(installed));
		}
	}, [fleet, installed]);
}

function currentsOf({ apps }: InstalledApps): ReadonlyMap<string, CurrentRelease | null> {
	return new Map(
		apps.map(({ id, current, face }) => [
			id,
			current === null || face === null
				? null
				: {
						version: current,
						pageUrl: face.pageUrl,
					},
		]),
	);
}
