import { useMemo } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { PlaceInViewCommand } from "@widgetarium/app-host";
import { PlacePaneCommand } from "@widgetarium/layout";
import type { Placers } from "./view-drops.js";

export function usePlacers(): Placers {
	const placePane = useCommand(PlacePaneCommand);
	const placeInView = useCommand(PlaceInViewCommand);
	return useMemo(() => ({ placePane, placeInView }), [placePane, placeInView]);
}
