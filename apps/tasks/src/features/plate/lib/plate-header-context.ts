import { createContext, useContext, useSyncExternalStore } from "react";
import type { PlateHeaderPlace, PlateHeaderStore } from "./plate-header-store.js";

export const PlateHeaderContext = createContext<PlateHeaderStore | null>(null);

export function usePlateTarget(place: PlateHeaderPlace): HTMLElement | null {
	const store = useContext(PlateHeaderContext);
	return useSyncExternalStore(
		store?.watchTargets ?? NO_WATCH,
		store === null ? NO_STORE_TARGETS : () => store.targetsNow()[place],
	);
}

const NO_STORE_TARGETS = (): null => null;

const NO_WATCH = (): (() => void) => () => undefined;
