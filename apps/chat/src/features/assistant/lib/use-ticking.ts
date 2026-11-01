import { useEffect, useState } from "react";

const TICK_MS = 1000;

export function useTicking(everyMs: number = TICK_MS): void {
	const [, tick] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => tick((was) => was + 1), everyMs);
		return () => clearInterval(timer);
	}, [everyMs]);
}
