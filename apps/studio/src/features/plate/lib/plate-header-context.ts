import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { PlateHeaderPlace, PlateHeaderStore, PlateLook } from "./plate-header-store.js";

export const PlateHeaderContext = createContext<PlateHeaderStore | null>(null);

export const PlateShownContext = createContext<boolean>(true);

export function usePlateTarget(place: PlateHeaderPlace): HTMLElement | null {
	const store = useContext(PlateHeaderContext);
	const isShown = useContext(PlateShownContext);
	const target = useSyncExternalStore(
		store?.watchTargets ?? NO_WATCH,
		store === null ? NO_STORE_TARGETS : () => store.targetsNow()[place],
	);
	return isShown ? target : null;
}

export function usePaintsPlate(look: PlateLook | null): void {
	const store = useContext(PlateHeaderContext);
	const isShown = useContext(PlateShownContext);
	const [owner] = useState(() => ({}));
	const fill = look?.fill ?? null;
	const strip = look?.strip ?? null;
	useEffect(() => {
		if (store === null || !isShown || fill === null) {
			return undefined;
		}

		store.paint(owner, { fill, strip });
		return () => store.paint(owner, null);
	}, [store, isShown, owner, fill, strip]);
}

const NO_STORE_TARGETS = (): null => null;

const NO_WATCH = (): (() => void) => () => undefined;
