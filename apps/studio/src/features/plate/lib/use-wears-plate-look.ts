import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { PlateHeaderStore } from "./plate-header-store.js";
import { wearPlateLook } from "./wear-plate-look.js";

export function useWearsPlateLook(
	store: PlateHeaderStore,
	plate: RefObject<HTMLElement | null>,
	header: RefObject<HTMLElement | null>,
): void {
	useLayoutEffect(() => {
		const worn = (): void => {
			if (plate.current !== null && header.current !== null) {
				wearPlateLook(plate.current, header.current, store.lookNow());
			}
		};
		worn();
		return store.watchLook(worn);
	}, [store, plate, header]);
}
