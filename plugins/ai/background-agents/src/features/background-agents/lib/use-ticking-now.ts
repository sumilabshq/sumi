import { useEffect, useState } from "react";

const TICK_MS = 1000;

export function useTickingNow(isTicking: boolean): number {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		if (!isTicking) {
			return undefined;
		}

		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [isTicking]);
	return now;
}
