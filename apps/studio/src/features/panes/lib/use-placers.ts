import { useMemo } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host";
import { layout } from "@widgetarium/layout";
import type { Placers } from "./view-drops.js";

export function usePlacers(): Placers {
	const placePane = useCommand(layout.panes.placePane);
	const placeInView = useCommand(appHost.splits.placeInView);
	return useMemo(() => ({ placePane, placeInView }), [placePane, placeInView]);
}
