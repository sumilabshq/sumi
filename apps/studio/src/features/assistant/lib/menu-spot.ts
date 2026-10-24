import { useState } from "react";
import type { MouseEvent } from "react";

export interface MenuSpot {
	readonly x: number;
	readonly y: number;
}

export interface MenuOpening {
	readonly spot: MenuSpot | null;
	readonly openAt: (event: MouseEvent<HTMLElement>) => void;
	readonly close: () => void;
}

export function spotOf(event: MouseEvent<HTMLElement>): MenuSpot {
	if (event.clientX !== 0 || event.clientY !== 0) {
		return { x: event.clientX, y: event.clientY };
	}

	const box = event.currentTarget.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top };
}

export function useMenuOpening(): MenuOpening {
	const [spot, setSpot] = useState<MenuSpot | null>(null);
	return {
		spot,
		openAt: (event) => setSpot(spotOf(event)),
		close: () => setSpot(null),
	};
}
