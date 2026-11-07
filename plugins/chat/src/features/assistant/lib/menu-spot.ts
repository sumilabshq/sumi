import { useState } from "react";
import type { MouseEvent } from "react";

export interface MenuSpot {
	readonly x: number;
	readonly y: number;
}

export interface MenuOpening {
	readonly spot: MenuSpot | null;
	readonly openAt: (event: MouseEvent<HTMLElement>) => void;
	readonly openAtCentre: (event: MouseEvent<HTMLElement>) => void;
	readonly close: () => void;
}

export function spotOf(event: MouseEvent<HTMLElement>): MenuSpot {
	if (event.clientX !== 0 || event.clientY !== 0) {
		return { x: event.clientX, y: event.clientY };
	}

	return centreSpotOf(event.currentTarget);
}

export function useMenuOpening(): MenuOpening {
	const [spot, setSpot] = useState<MenuSpot | null>(null);
	return {
		spot,
		openAt: (event) => setSpot(spotOf(event)),
		openAtCentre: (event) => setSpot(centreSpotOf(event.currentTarget)),
		close: () => setSpot(null),
	};
}

function centreSpotOf(element: HTMLElement): MenuSpot {
	const box = element.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top };
}
