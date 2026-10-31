import { useEffect } from "react";
import type { AppFrameFleet } from "./app-frame-fleet.js";

export function useFleetFollowsDocument(fleet: AppFrameFleet): void {
	useEffect(() => {
		const told = (): void => fleet.documentVisibleIs(document.visibilityState === "visible");
		told();
		document.addEventListener("visibilitychange", told);
		return () => document.removeEventListener("visibilitychange", told);
	}, [fleet]);
}
