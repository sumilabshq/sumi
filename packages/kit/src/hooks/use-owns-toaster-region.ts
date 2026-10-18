import { useEffect, useState, useSyncExternalStore } from "react";
import { TOASTER_REGIONS } from "../utils/toaster-regions";

export function useOwnsToasterRegion(): boolean {
	const [region] = useState(() => Symbol("toaster"));
	useEffect(() => TOASTER_REGIONS.claim(region), [region]);
	return useSyncExternalStore(TOASTER_REGIONS.subscribe, TOASTER_REGIONS.owner) === region;
}
