import { useState } from "react";
import type { MouseEvent } from "react";
import { pointerSpotOf } from "../../../shared/lib/pointer-spot/pointer-spot.js";
import type { PointerSpot } from "../../../shared/lib/pointer-spot/pointer-spot.js";

export interface PointedTab {
	readonly tabId: string;
	readonly spot: PointerSpot;
}

export interface PointerMenu {
	readonly pointed: PointedTab | null;
	readonly openFor: (tabId: string, event: MouseEvent<HTMLElement>) => void;
	readonly close: () => void;
}

export function usePointerMenu(): PointerMenu {
	const [pointed, setPointed] = useState<PointedTab | null>(null);
	return {
		pointed,
		openFor: (tabId, event) => {
			event.preventDefault();
			setPointed({
				tabId,
				spot: pointerSpotOf(event),
			});
		},
		close: () => setPointed(null),
	};
}
