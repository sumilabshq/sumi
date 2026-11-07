import { useEffect, useMemo } from "react";
import type { RefCallback } from "react";
import { AreaPlacement } from "./area-placement.js";
import { useObservedElement } from "./use-observed-element.js";
import { useSendsPageArea } from "./use-sends-page-area.js";

export function usePlacesArea(tabId: string, hasPage: boolean): RefCallback<HTMLDivElement> {
	const send = useSendsPageArea(tabId);
	const placement = useMemo(() => new AreaPlacement(send), [send]);
	placement.isPlaceable = hasPage;
	useEffect(() => placement.replace(), [hasPage, placement]);
	return useObservedElement(placement);
}
