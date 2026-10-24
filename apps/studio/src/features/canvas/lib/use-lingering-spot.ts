import { useEffect, useState } from "react";
import type { Spot } from "@widgetarium/canvas";

const LEAVES_AFTER_MS = 200;

export function useLingeringSpot(spot: Spot | null): Spot | null {
	const [last, setLast] = useState<Spot | null>(spot);
	useEffect(() => {
		if (spot) return void setLast(spot);
		const timer = window.setTimeout(() => setLast(null), LEAVES_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [spot]);
	return spot ?? last;
}
