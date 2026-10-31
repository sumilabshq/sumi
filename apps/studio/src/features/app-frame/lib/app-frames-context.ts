import { createContext, useContext } from "react";
import type { AppFrameFleet } from "./app-frame-fleet.js";

const NO_FRAMES = "An installed app is drawn inside AppFramesProvider, which holds the versions its frames run";

export const AppFramesContext = createContext<AppFrameFleet | null>(null);

export function useAppFrameFleet(): AppFrameFleet {
	const fleet = useContext(AppFramesContext);

	if (fleet === null) {
		throw new Error(NO_FRAMES);
	}

	return fleet;
}
