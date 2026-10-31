import { useEffect, useId, useSyncExternalStore } from "react";
import type { AppFrameFleet, RunningRelease } from "./app-frame-fleet.js";

export interface AppFrameSeat {
	readonly frameId: string;
	readonly running: RunningRelease | null;
}

export function useAppFrameSeat(fleet: AppFrameFleet, app: string, isShown: boolean): AppFrameSeat {
	const frameId = `${app}:${useId()}`;
	const running = useSyncExternalStore(
		(changed) => fleet.subscribe(changed),
		() => fleet.runningOf(frameId),
	);

	useEffect(() => fleet.seat(frameId, app, isShown), [fleet, frameId, app]);

	useEffect(() => {
		fleet.shownIs(frameId, isShown);
	}, [fleet, frameId, isShown]);

	return {
		frameId,
		running,
	};
}
