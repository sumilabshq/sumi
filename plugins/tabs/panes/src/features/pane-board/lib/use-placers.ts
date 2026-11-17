import { useMemo } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { Placers } from "./view-drops.js";

export function usePlacers(): Placers {
	const placePane = useCommand(appHost.panes.place);
	const placeInView = useCommand(appHost.splits.placeInView);
	return useMemo(() => ({ placePane, placeInView }), [placePane, placeInView]);
}
